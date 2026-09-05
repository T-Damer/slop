import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialMatch, restartMatch, runMatchShotToCompletion } from '../runtime/domain/match.ts';
import { canPlaceCueBall, rerackMatch } from '../runtime/domain/rack.ts';
import { billiardsTablePresets, tablePreset } from '../runtime/domain/table-presets.ts';
import { tableModelFor } from '../runtime/domain/table-model.ts';
import { findFirstCollision } from '../runtime/domain/collision.ts';
import { runTableUntilRest } from '../runtime/domain/simulator.ts';
import { previewShot } from '../runtime/domain/shot.ts';
import { resolveCompletedShot } from '../runtime/domain/rules.ts';
import { isMatchSnapshot } from '../runtime/network/wire.ts';
import { BilliardsGameControllerV2 } from '../runtime/presentation/controller-v2.ts';
import type { BilliardsBallState, BilliardsShotTrace } from '../runtime/domain/types.ts';

const shot = { schemaVersion: 1, clientSequence: 1, angleRadians: 0, power: 0.72, sideSpin: 0, followSpin: 0 } as const;
function ball(x: number, y: number, vx: number, vy: number): BilliardsBallState {
  return { id: 0, kind: 'cue', position: { x, y }, velocity: { x: vx, y: vy }, sideSpin: 0, followSpin: 0, pocketed: false };
}

test('legacy tables stay American; model lookup is per-table, never a global switch', () => {
  assert.equal(tablePreset({}).id, 'american');
  const american = createInitialMatch(), russian = createInitialMatch(undefined, 'russian');
  const model = tableModelFor(american.table);
  assert.ok(tableModelFor(russian.table).pockets[1]!.radius < model.pockets[1]!.radius);
  assert.equal(tableModelFor(american.table), model);
  assert.notEqual(tablePreset(american.table).ballRadius, tablePreset(russian.table).ballRadius);
});

for (const preset of ['american', 'russian'] as const) {
  test(`${preset} rack, restart and rerack retain the profile without overlaps`, () => {
    const match = createInitialMatch(['A', 'B'], preset);
    const radius = tablePreset(match.table).ballRadius;
    for (const a of match.table.balls) for (const b of match.table.balls) {
      if (a.id !== b.id) assert.ok(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) >= radius * 2 - 1e-10);
    }
    assert.equal(restartMatch(match).table.presetId, preset);
    assert.equal(rerackMatch(match, 'test rerack').table.presetId, preset);
    assert.equal(restartMatch(match).revision, match.revision + 1);
    assert.equal(restartMatch(match).players[0].name, 'A');
  });
  test(`${preset} full break is deterministic, settles and preserves input state`, () => {
    const match = createInitialMatch(undefined, preset), original = JSON.stringify(match);
    const one = runMatchShotToCompletion(match, shot), two = runMatchShotToCompletion(match, shot);
    assert.equal(one.accepted, true);
    assert.deepEqual(one, two);
    assert.equal(one.match.activeShot, null);
    assert.equal(one.match.table.presetId, preset);
    assert.equal(JSON.stringify(match), original);
    assert.ok(isMatchSnapshot(one.match));
  });
  for (const speed of [60, 430]) test(`${preset} centred side and corner entries work at speed ${speed}`, () => {
    const table = createInitialMatch(undefined, preset).table;
    for (const cue of [ball(0, -45, 0, -speed), ball(-112, -48.5, -speed, -speed)]) {
      const first = findFirstCollision([cue], 1, tableModelFor(table));
      assert.equal(first?.kind, 'ball-pocket');
      const simulated = runTableUntilRest({ ...table, balls: [cue] });
      assert.equal(simulated.table.balls[0]!.pocketed, true);
    }
  });
}

test('Russian pocket mouth rejects a side offset that the American preset accepts', () => {
  const cue = ball(2, -50, 0, -100);
  for (const preset of ['american', 'russian'] as const) {
    const table = { ...createInitialMatch(undefined, preset).table, balls: [cue] };
    assert.equal(findFirstCollision(table.balls, 1, tableModelFor(table))?.kind,
      preset === 'russian' ? 'ball-jaw' : 'ball-pocket');
    assert.equal(runTableUntilRest(table).table.balls[0]!.pocketed, preset === 'american');
  }
});

test('placement uses the selected radius and cannot confirm a pocket or invalid point', () => {
  const russian = createInitialMatch(undefined, 'russian').table;
  const object = { ...ball(0, 0, 0, 0), id: 1, kind: 'solid' as const };
  const table = { ...russian, balls: [ball(-60, 0, 0, 0), object] };
  const separation = (billiardsTablePresets.american.ballRadius + billiardsTablePresets.russian.ballRadius);
  assert.equal(canPlaceCueBall(table, { x: separation, y: 0 }), true);
  assert.equal(canPlaceCueBall({ ...table, presetId: 'american' }, { x: separation, y: 0 }), false);
  assert.equal(canPlaceCueBall(table, { x: 0, y: -63.5 }), false);
  assert.equal(canPlaceCueBall(table, { x: NaN, y: 0 }), false);
});

test('prediction uses the selected geometry and limits the object-ball guide', () => {
  for (const preset of ['american', 'russian'] as const) {
    const match = createInitialMatch(undefined, preset), preview = previewShot(match.table, shot);
    const cue = { ...match.table.balls[0]!, velocity: { x: 430, y: 0 } };
    assert.equal(preview.firstCollision?.kind, findFirstCollision([cue, ...match.table.balls.slice(1)], 1, tableModelFor(match.table))?.kind);
    const path = preview.objectPath;
    if (path.length > 1) assert.ok(Math.hypot(path[1]!.x - path[0]!.x, path[1]!.y - path[0]!.y) <= 24.001);
  }
});

test('pocket history records the shooter even for a foul, not the owner of the group', () => {
  const match = { ...createInitialMatch(undefined, 'russian'), phase: 'open' as const, turnIndex: 1 as const };
  const table = { ...match.table, balls: match.table.balls.map((entry) => [0, 9].includes(entry.id)
    ? { ...entry, pocketed: true } : entry.id === 1 ? { ...entry, pocketed: true, pocketedBy: 0 as const } : entry) };
  const trace: BilliardsShotTrace = { eligibleForEightAtStart: false, firstObjectBallId: 9, pocketedBallIds: [0, 9],
    cushionHitsAfterContact: 0, collisionCount: 2 };
  const result = resolveCompletedShot(match, table, trace);
  assert.equal(result.table.balls.find((entry) => entry.id === 9)?.pocketedBy, 1);
  assert.equal(result.table.balls.find((entry) => entry.id === 1)?.pocketedBy, 0);
  assert.equal(result.table.balls.find((entry) => entry.id === 0)?.pocketedBy, undefined);
  assert.equal(restartMatch(result).table.balls.some((entry) => entry.pocketedBy !== undefined), false);
});

test('wire guards reject unknown profiles and invalid pocket-history seats but accept legacy state', () => {
  const match = createInitialMatch();
  assert.equal(isMatchSnapshot({ ...match, table: { ...match.table, presetId: undefined } }), true);
  assert.equal(isMatchSnapshot({ ...match, table: { ...match.table,
    balls: match.table.balls.map((entry) => ({ ...entry, pocketedBy: 4 })) } }), false);
  assert.equal(isMatchSnapshot({ ...match, table: { ...match.table, presetId: 'pyramid-fake' } }), false);
});

test('opening/cancelling a new-match pause preserves an active shot; confirmation replaces it once', () => {
  const controller = new BilliardsGameControllerV2();
  controller.shoot();
  const moving = controller.snapshot().match;
  controller.setPaused(true); controller.advance(1);
  assert.equal(controller.snapshot().match, moving);
  assert.equal(controller.primaryAction(), false);
  controller.setPaused(false); controller.advance(0.05);
  assert.ok(controller.snapshot().match.table.step > moving.table.step);
  controller.setPaused(true); controller.restart('russian');
  assert.equal(controller.snapshot().match.table.presetId, 'russian');
  assert.equal(controller.snapshot().match.activeShot, null);
  controller.setPaused(false);
  assert.equal(controller.snapshot().canInteract, true);
});
