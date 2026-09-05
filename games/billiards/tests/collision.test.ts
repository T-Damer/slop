import assert from 'node:assert/strict';
import test from 'node:test';

import { findFirstCollision } from '../runtime/domain/collision.ts';
import {
  billiardsBallKinds,
  billiardsCollisionKinds,
  billiardsPhysics,
} from '../runtime/domain/registry.ts';
import type { BilliardsBallState } from '../runtime/domain/types.ts';

function ball(id: number, x: number, y: number, velocityX: number, velocityY: number): BilliardsBallState {
  return {
    id,
    kind: id === 0 ? billiardsBallKinds.cue : billiardsBallKinds.solid,
    position: { x, y },
    velocity: { x: velocityX, y: velocityY },
    sideSpin: 0,
    followSpin: 0,
    pocketed: false,
  };
}

test('continuous collision detection finds a fast head-on ball impact', () => {
  const collision = findFirstCollision([
    ball(0, -20, 0, 100, 0),
    ball(1, 20, 0, -100, 0),
  ], 1);
  assert.equal(collision?.kind, billiardsCollisionKinds.ball);
  assert.ok(collision !== null && collision.time > 0);
  assert.ok(collision !== null && collision.time < 0.25);
});

test('the same geometry finds a cushion before a distant object ball', () => {
  const rightLimit = billiardsPhysics.tableWidth / 2 - billiardsPhysics.ballRadius;
  const collision = findFirstCollision([
    ball(0, rightLimit - 20, 20, 160, 0),
    ball(1, -40, 0, 0, 0),
  ], 1);
  assert.equal(collision?.kind, billiardsCollisionKinds.cushion);
});

test('a ball aimed into a corner produces a pocket event', () => {
  const collision = findFirstCollision([
    ball(0, -104, -42, -80, -80),
  ], 1);
  assert.equal(collision?.kind, billiardsCollisionKinds.pocket);
});
