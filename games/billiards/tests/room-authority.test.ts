import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthoritativeBilliardsRoom, type BilliardsRoomClient, type BilliardsRoomPort } from '../runtime/network/authoritative-room.ts';
import { billiardsProtocol as protocol } from '../runtime/network/registry.ts';
import { billiardsInteractionMessageType as interaction } from '../runtime/network/interaction-wire-v2.ts';
import { createInitialMatch } from '../runtime/domain/match.ts';

function createRoom(ballInHand = false) {
  const handlers = new Map<string, (client: BilliardsRoomClient, value: unknown) => void>();
  const broadcasts: { kind: string; value: unknown }[] = [];
  const rejections: unknown[] = [];
  const port: BilliardsRoomPort = { onMessage: (kind, handler) => { handlers.set(kind, handler); },
    broadcast: (kind, value) => { broadcasts.push({ kind, value }); } };
  const authority = new AuthoritativeBilliardsRoom(port, { ...createInitialMatch(), ballInHand });
  const alice = { sessionId: 'alice', send: (_kind: string, value: unknown) => { rejections.push(value); } };
  const bob = { sessionId: 'bob', send: (_kind: string, value: unknown) => { rejections.push(value); } };
  authority.join(alice, 'Alice'); authority.join(bob, 'Bob');
  const send = (client: BilliardsRoomClient, kind: string, value: unknown) => handlers.get(kind)?.(client, value);
  return { authority, alice, bob, send, broadcasts, rejections };
}

const shot = { schemaVersion: 1, clientSequence: 1, angleRadians: 0, power: 0.72, sideSpin: 0, followSpin: 0 };

test('authority rejects out-of-turn, stale, repeated and malformed commands', () => {
  const room = createRoom();
  const revision = room.authority.snapshot().revision;
  room.send(room.bob, protocol.messages.shot, { ...shot, expectedRevision: revision });
  room.send(room.alice, protocol.messages.shot, { ...shot, expectedRevision: revision - 1 });
  room.send(room.alice, protocol.messages.shot, { ...shot, expectedRevision: revision });
  room.send(room.alice, protocol.messages.shot, { ...shot, clientSequence: 2, power: NaN, expectedRevision: revision });
  assert.equal(room.rejections.length, 4);
  assert.equal(room.authority.snapshot().activeShot, null);
  room.send(room.alice, protocol.messages.shot, { ...shot, clientSequence: 3, expectedRevision: revision });
  assert.notEqual(room.authority.snapshot().activeShot, null);
});

test('authority confirms placement separately and advances one deterministic shot to rest', () => {
  const room = createRoom(true);
  let revision = room.authority.snapshot().revision;
  room.send(room.alice, protocol.messages.shot, { ...shot, expectedRevision: revision });
  assert.equal(room.authority.snapshot().activeShot, null);
  room.send(room.alice, protocol.messages.placeCue, { schemaVersion: 1, clientSequence: 2,
    expectedRevision: revision, position: { x: -60, y: 0 } });
  assert.equal(room.authority.snapshot().ballInHand, false);
  assert.equal(room.authority.snapshot().activeShot, null);
  revision = room.authority.snapshot().revision;
  room.send(room.alice, protocol.messages.shot, { ...shot, clientSequence: 3, expectedRevision: revision });
  const maxSteps = 6000;
  for (let step = 0; step < maxSteps && room.authority.snapshot().activeShot !== null; step += 1) room.authority.tick();
  assert.equal(room.authority.snapshot().activeShot, null);
  assert.ok(room.authority.snapshot().revision > revision);
});

test('transient interactions require current turn/revision/sequence and a lock before manual stroke', () => {
  const room = createRoom();
  const base = { schemaVersion: 1, revision: room.authority.snapshot().revision };
  const before = room.broadcasts.length;
  room.send(room.bob, interaction, { ...base, kind: 'aim-preview', clientSequence: 1, angleRadians: 1 });
  room.send(room.alice, interaction, { ...base, kind: 'manual-stroke', clientSequence: 1,
    cueOffset: 30, pullback: 30, forwardVelocity: 0, power: 0.2 });
  assert.equal(room.broadcasts.length, before);
  room.send(room.alice, interaction, { ...base, kind: 'aim-locked', clientSequence: 2, angleRadians: 0.2 });
  room.send(room.alice, interaction, { ...base, kind: 'manual-stroke', clientSequence: 3,
    cueOffset: 30, pullback: 30, forwardVelocity: 0, power: 0.2 });
  assert.equal(room.broadcasts.length, before + 2);
  room.send(room.alice, interaction, { ...base, kind: 'aim-locked', clientSequence: 2, angleRadians: 0.2 });
  assert.equal(room.broadcasts.length, before + 2);
});
