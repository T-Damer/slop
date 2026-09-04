import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createBilliardsServer } from './server.mjs';
import { createColyseusBilliardsSession } from '../../games/billiards/runtime/network/colyseus-session.ts';

const settings = { port: 26789, timeout: 20000, poll: 10 };

async function waitUntil(predicate) {
  const deadline = Date.now() + settings.timeout;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for Colyseus state.');
    await delay(settings.poll);
  }
}

function client(name) {
  const session = createColyseusBilliardsSession({ endpoint: `ws://127.0.0.1:${settings.port}`,
    playerName: name, matchmakingKey: 'integration-test' });
  const state = { match: null, status: null, interactions: [], rejected: [] };
  return { session, state, connect: () => session.connect({
    onStatus: (value) => { state.status = value; },
    onSnapshot: (value) => { state.match = value; },
    onInteraction: (value) => state.interactions.push(value),
    onRejected: (reason) => state.rejected.push(reason),
  }) };
}

test('real Colyseus clients synchronize aim, stroke, foul, placement and authoritative shot', { timeout: 60000 }, async () => {
  const server = createBilliardsServer();
  const a = client('Alice'), b = client('Bob');
  try {
    await server.listen(settings.port);
    await a.connect();
    await b.connect();
    await waitUntil(() => a.state.status?.state === 'online' && b.state.status?.state === 'online'
      && a.state.match?.revision === b.state.match?.revision && b.state.match !== null);
    assert.equal(a.state.status.playerIndex, 0);
    assert.equal(b.state.status.playerIndex, 1);
    const revision = a.state.match.revision;
    a.session.sendInteraction({ schemaVersion: 1, revision, clientSequence: 1,
      kind: 'aim-locked', angleRadians: Math.PI, power: 0.2, sideSpin: 0, followSpin: 0 });
    a.session.sendInteraction({ schemaVersion: 1, revision, clientSequence: 2,
      kind: 'manual-stroke', cueOffset: 50, pullback: 50, forwardVelocity: 0, power: 0.2 });
    await waitUntil(() => b.state.interactions.some((value) => value.kind === 'manual-stroke'));
    assert.equal(b.state.interactions[0].kind, 'aim-locked');
    a.session.sendShot({ schemaVersion: 1, expectedRevision: revision, clientSequence: 3,
      angleRadians: Math.PI, power: 0.2, sideSpin: 0, followSpin: 0 });
    await waitUntil(() => b.state.match.ballInHand && b.state.match.revision > revision);
    await waitUntil(() => a.state.match.revision === b.state.match.revision);
    assert.deepEqual(a.state.match.table, b.state.match.table);
    assert.equal(b.state.match.turnIndex, 1);
    const beforePlacement = b.state.match.revision;
    const position = { x: -50, y: 0 };
    b.session.sendInteraction({ schemaVersion: 1, revision: beforePlacement, clientSequence: 1,
      kind: 'cue-placement-preview', position, valid: true });
    await waitUntil(() => a.state.interactions.some((value) => value.kind === 'cue-placement-preview'));
    b.session.sendCuePlacement({ schemaVersion: 1, expectedRevision: beforePlacement,
      clientSequence: 2, position });
    await waitUntil(() => a.state.match.revision > beforePlacement && b.state.match.revision > beforePlacement);
    assert.equal(a.state.match.ballInHand, false);
    assert.equal(a.state.match.activeShot, null);
    assert.deepEqual(a.state.match.table.balls.find((ball) => ball.id === 0).position, position);
    b.session.sendShot({ schemaVersion: 1, expectedRevision: b.state.match.revision, clientSequence: 3,
      angleRadians: 0, power: 0.4, sideSpin: 0, followSpin: 0 });
    await waitUntil(() => a.state.match.activeShot !== null && b.state.match.activeShot !== null);
    assert.equal(a.state.rejected.length + b.state.rejected.length, 0);
  } finally {
    await Promise.allSettled([a.session.close(), b.session.close()]);
    await server.gracefullyShutdown(false);
  }
});
