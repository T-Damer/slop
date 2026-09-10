import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialTable } from '../runtime/domain/rack.ts';
import { applyShot } from '../runtime/domain/shot.ts';
import {
  isTableAtRest,
  runTableUntilRest,
  simulateFixedStep,
} from '../runtime/domain/simulator.ts';
import {
  billiardsBallIds,
  billiardsBallKinds,
  billiardsPhysics,
} from '../runtime/domain/registry.ts';
import type { BilliardsTableState } from '../runtime/domain/types.ts';

const straightShot = {
  schemaVersion: 1,
  angleRadians: 0,
  power: 0.8,
  sideSpin: 0,
  followSpin: 0,
  clientSequence: 1,
} as const;

test('fixed-step simulation does not mutate its input', () => {
  const table = applyShot(createInitialTable(), straightShot);
  const before = structuredClone(table);
  const result = simulateFixedStep(table);
  assert.deepEqual(table, before);
  assert.notDeepEqual(result.table, table);
});

test('a complete shot is deterministic and reaches rest', () => {
  const first = runTableUntilRest(applyShot(createInitialTable(), straightShot));
  const second = runTableUntilRest(applyShot(createInitialTable(), straightShot));
  assert.deepEqual(first, second);
  assert.equal(isTableAtRest(first.table), true);
  assert.ok(first.events.length > 0);
});

test('fast balls collide instead of tunnelling through one another', () => {
  const diameter = billiardsPhysics.ballRadius * 2;
  const table: BilliardsTableState = {
    schemaVersion: 1,
    step: 0,
    balls: [
      {
        id: billiardsBallIds.cue,
        kind: billiardsBallKinds.cue,
        position: { x: -diameter * 2, y: 0 },
        velocity: { x: 900, y: 0 },
        sideSpin: 0,
        followSpin: 0,
        pocketed: false,
      },
      {
        id: 1,
        kind: billiardsBallKinds.solid,
        position: { x: diameter * 2, y: 0 },
        velocity: { x: 0, y: 0 },
        sideSpin: 0,
        followSpin: 0,
        pocketed: false,
      },
    ],
  };
  let current = table;
  for (let step = 0; step < 12; step += 1) {
    current = simulateFixedStep(current).table;
  }
  const objectBall = current.balls.find((ball) => ball.id === 1);
  assert.ok(objectBall !== undefined && objectBall.velocity.x > 100);
});
