import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialMatch, positionCueBall, restartMatch, startMatchShot } from '../runtime/domain/match.ts';
import { BilliardsGameControllerV2 } from '../runtime/presentation/controller-v2.ts';
import { canvasToWorld, clientToCanvas, worldToCanvas } from '../runtime/presentation/coordinates.ts';
import { ManualCueStroke } from '../runtime/presentation/manual-stroke.ts';
import { billiardsView } from '../runtime/presentation/registry.ts';
import { createLocalBilliardsSession } from '../runtime/network/local-session.ts';
import type { BilliardsSession, BilliardsSessionListeners } from '../runtime/network/session.ts';
import type { BilliardsInteractionMessage } from '../runtime/network/interaction-wire-v2.ts';

const breakCommand = { schemaVersion: 1, angleRadians: 0, power: 0.72,
  sideSpin: 0, followSpin: 0, clientSequence: 1 } as const;

function inHand() { return { ...createInitialMatch(), ballInHand: true }; }

test('placement confirmation clears ball-in-hand but never starts a shot', () => {
  const initial = inHand();
  assert.equal(startMatchShot(initial, breakCommand).accepted, false);
  const placed = positionCueBall(initial, { x: -60, y: 0 });
  assert.equal(placed.accepted, true);
  assert.equal(placed.match.ballInHand, false);
  assert.equal(placed.match.activeShot, null);
  assert.equal(placed.match.revision, initial.revision + 1);
  assert.equal(positionCueBall(placed.match, { x: -50, y: 0 }).accepted, false);
  assert.equal(startMatchShot(placed.match, breakCommand).accepted, true);
  assert.equal(initial.ballInHand, true);
});

test('controller primary action confirms placement, next action shoots and resets the lock', () => {
  const controller = new BilliardsGameControllerV2(createLocalBilliardsSession(), inHand());
  controller.setPlacementPreview({ x: -60, y: 0 });
  assert.equal(controller.primaryAction(), true);
  assert.equal(controller.snapshot().interaction.mode, 'aiming');
  assert.equal(controller.snapshot().match.activeShot, null);
  assert.equal(controller.lockAim(), true);
  assert.equal(controller.primaryAction(), true);
  assert.equal(controller.snapshot().interaction.mode, 'aiming');
  assert.equal(controller.primaryAction(), false);
});

test('restart revisions are monotonic even when the previous table step was high', () => {
  const initial = { ...createInitialMatch(), revision: 37 };
  assert.equal(restartMatch(initial).revision, 38);
  assert.equal(restartMatch(restartMatch(initial)).revision, 39);
});

test('a fresh projected forward stroke fires only after reaching its starting contact line', () => {
  const stroke = new ManualCueStroke({ x: 200, y: 200 }, 0, 0);
  stroke.sample({ x: 120, y: 200 }, 50);
  stroke.sample({ x: 150, y: 200 }, 90);
  assert.equal(stroke.reachedContact(), false);
  const result = stroke.sample({ x: 205, y: 200 }, 120);
  assert.ok(result.forwardVelocity > 95);
  assert.equal(stroke.reachedContact(), true);
});

test('holding, lateral motion, reverse motion and invalid samples cannot execute a stroke', () => {
  const stroke = new ManualCueStroke({ x: 200, y: 200 }, 0, 0);
  stroke.sample({ x: 120, y: 200 }, 40);
  stroke.sample({ x: 160, y: 200 }, 70);
  assert.equal(stroke.sample({ x: 160, y: 200 }, 500).forwardVelocity, 0);
  stroke.sample({ x: 160, y: 500 }, 510);
  assert.equal(stroke.reachedContact(), false);
  stroke.sample({ x: 100, y: 500 }, 550);
  assert.equal(stroke.reachedContact(), false);
  assert.equal(stroke.sample({ x: NaN, y: 200 }, 600).forwardVelocity, 0);
});

test('manual stroke cannot fire from its pulled-back position; cancellation preserves lock', () => {
  const controller = new BilliardsGameControllerV2();
  controller.lockAim();
  controller.beginManualStroke();
  controller.updateManualStroke({ cueOffset: 40, pullback: 80, forwardVelocity: 900 });
  assert.equal(controller.finishManualStroke(), false);
  assert.equal(controller.snapshot().interaction.mode, 'aim-locked');
  controller.beginManualStroke();
  controller.updateManualStroke({ cueOffset: 0, pullback: 80, forwardVelocity: 900 });
  assert.equal(controller.finishManualStroke(), true);
  assert.equal(controller.finishManualStroke(), false);
});

for (const portrait of [false, true]) {
  test(`canonical pointer/world round trip is exact with portrait=${portrait}`, () => {
    const world = { x: -47.5, y: 16.25 };
    const canonical = worldToCanvas(world);
    const bounds = { left: 30, top: 80, width: 320, height: 640 };
    const point = portrait
      ? { x: bounds.left + (1 - canonical.y / billiardsView.canvasHeight) * bounds.width,
          y: bounds.top + canonical.x / billiardsView.canvasWidth * bounds.height }
      : { x: bounds.left + canonical.x / billiardsView.canvasWidth * bounds.width,
          y: bounds.top + canonical.y / billiardsView.canvasHeight * bounds.height };
    const actual = canvasToWorld(clientToCanvas(bounds, point, portrait)!);
    assert.ok(Math.abs(actual.x - world.x) < 1e-9);
    assert.ok(Math.abs(actual.y - world.y) < 1e-9);
  });
}

test('captured pointer coordinates are not clamped at the canvas boundary', () => {
  const bounds = { left: 0, top: 0, width: 1280, height: 720 };
  assert.equal(clientToCanvas(bounds, { x: -100, y: 30 }, false)?.x, -100);
  assert.equal(clientToCanvas({ ...bounds, width: 0 }, { x: 5, y: 5 }, false), null);
});

test('power and spin are published with aim and non-finite values are rejected', () => {
  const messages: BilliardsInteractionMessage[] = [];
  const session = { ...createLocalBilliardsSession(), sendInteraction: (value: BilliardsInteractionMessage) => messages.push(value) };
  const controller = new BilliardsGameControllerV2(session);
  controller.setPower(0.8);
  controller.setSpin(0.25, -0.5);
  const latest = messages.at(-1);
  assert.equal(latest?.kind, 'aim-preview');
  if (latest?.kind === 'aim-preview') {
    assert.equal(latest.power, 0.8);
    assert.equal(latest.sideSpin, 0.25);
    assert.equal(latest.followSpin, -0.5);
  }
  controller.setSpin(NaN, Infinity);
  assert.equal(controller.snapshot().sideSpin, 0.25);
});

test('online controller waits for authority, blocks duplicate placement and ignores late snapshots after disposal', async () => {
  let listeners: BilliardsSessionListeners | null = null;
  let placements = 0;
  const initial = inHand();
  const session: BilliardsSession = { ...createLocalBilliardsSession(), mode: 'colyseus',
    async connect(value) { listeners = value; value.onStatus({ state: 'online', playerIndex: 0, detail: 'test' }); },
    sendCuePlacement() { placements += 1; } };
  const controller = new BilliardsGameControllerV2(session, initial);
  await controller.start('https://example.test/');
  controller.setPlacementPreview({ x: -60, y: 0 });
  assert.equal(controller.primaryAction(), true);
  assert.equal(controller.primaryAction(), false);
  assert.equal(placements, 1);
  assert.equal(controller.snapshot().match.ballInHand, true);
  const receive = listeners as BilliardsSessionListeners | null;
  assert.ok(receive);
  receive.onSnapshot(positionCueBall(initial, { x: -60, y: 0 }).match);
  assert.equal(controller.snapshot().match.ballInHand, false);
  assert.equal(controller.snapshot().canInteract, true);
  const before = controller.snapshot().match;
  await controller.dispose();
  receive.onSnapshot({ ...before, revision: before.revision + 10 });
  assert.equal(controller.snapshot().match, before);
});

test('online opponent previews are rendered without granting local controls or echoing intents', async () => {
  let listener: BilliardsSessionListeners | null = null;
  let sent = 0;
  const session: BilliardsSession = { ...createLocalBilliardsSession(), mode: 'colyseus',
    async connect(value) { listener = value; value.onStatus({ state: 'online', playerIndex: 1, detail: 'test' }); },
    sendInteraction() { sent += 1; } };
  const controller = new BilliardsGameControllerV2(session);
  await controller.start('https://example.test/');
  const receive = listener as BilliardsSessionListeners | null;
  receive?.onInteraction?.({ schemaVersion: 1, kind: 'aim-locked', revision: 0, clientSequence: 3,
    angleRadians: 0.5, power: 0.8, sideSpin: 0.1, followSpin: -0.2 });
  assert.equal(controller.snapshot().angleRadians, 0.5);
  assert.equal(controller.snapshot().interaction.mode, 'aim-locked');
  assert.equal(controller.lockAim(), false);
  assert.equal(controller.primaryAction(), false);
  assert.equal(sent, 0);
});

test('low-rate pointer sampling uses real elapsed time instead of losing a deliberate stroke', () => {
  const stroke = new ManualCueStroke({ x: 200, y: 200 }, 0, 0);
  stroke.sample({ x: 100, y: 200 }, 150);
  const result = stroke.sample({ x: 210, y: 200 }, 300);
  assert.ok(result.forwardVelocity > 95);
  assert.equal(stroke.reachedContact(), true);
});
