import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialMatch } from '../runtime/domain/rack.ts';
import { previewShot, applyShot } from '../runtime/domain/shot.ts';
import { runTableUntilRest } from '../runtime/domain/simulator.ts';
import { billiardsPhysics as physics } from '../runtime/domain/registry.ts';
import type { BilliardsTableState } from '../runtime/domain/types.ts';

const command = { schemaVersion: 1, clientSequence: 0, angleRadians: 0, power: 0.04, sideSpin: 0, followSpin: 0 } as const;
function emptyTable(presetId: 'american' | 'russian', striker: number): BilliardsTableState {
  const table = createInitialMatch(undefined, presetId).table;
  return { ...table, cueBallId: striker, balls: table.balls.map(ball => ({ ...ball,
    pocketed: ball.id !== striker, position: { x: -110, y: 20 } })) };
}
for (const preset of ['american', 'russian'] as const) {
  test(`${preset}: power guide grows with free-roll travel without changing the shot or table`, () => {
    const striker = preset === 'russian' ? 12 : 0;
    const table = emptyTable(preset, striker), original = JSON.stringify(table);
    let previous = 0;
    for (const power of [0.04, 0.10, 0.18]) {
      const shot = { ...command, power }, preview = previewShot(table, shot);
      const moving = applyShot(table, shot), cue = moving.balls.find(ball => ball.id === striker)!;
      const expected = (cue.velocity.x ** 2 - physics.stopSpeed ** 2) / (2 * physics.rollingDeceleration);
      const distance = preview.cuePath[1]!.x - preview.cuePath[0]!.x;
      assert.ok(distance > previous); previous = distance;
      assert.ok(Math.abs(distance - expected) < 1e-9);
      assert.equal(preview.firstCollision, null);
      assert.deepEqual(preview.objectPath, []);
      const actual = runTableUntilRest(moving).table.balls.find(ball => ball.id === striker)!;
      // The fixed-step integrator advances then applies friction, unlike the continuous estimate.
      assert.ok(Math.abs(actual.position.x - preview.cuePath[1]!.x) < cue.velocity.x * physics.fixedStepSeconds);
    }
    assert.equal(JSON.stringify(table), original);
  });
}

test('weak shots never mark an unreachable object; stronger shots stop at the first contact', () => {
  const base = emptyTable('american', 0);
  const table = { ...base, balls: base.balls.map(ball => ball.id === 1
    ? { ...ball, pocketed: false, position: { x: 0, y: 20 } } : ball) };
  const weak = previewShot(table, command), strong = previewShot(table, { ...command, power: 1 });
  assert.equal(weak.firstCollision, null); assert.deepEqual(weak.objectPath, []);
  assert.equal(strong.firstCollision?.kind, 'ball-ball');
  assert.ok(Math.abs(strong.cuePath[1]!.x + physics.ballRadius * 2) < 1e-6);
  assert.equal(strong.objectPath.length, 2);
  const rail = previewShot(base, { ...command, power: 1 });
  assert.equal(rail.firstCollision?.kind, 'ball-cushion');
  assert.ok(rail.cuePath[1]!.x <= physics.tableWidth / 2 - physics.ballRadius + 1e-6);
});
