import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialMatch } from '../runtime/domain/rack.ts';
import { resolveCompletedShot } from '../runtime/domain/rules.ts';
import {
  billiardsBallIds,
  billiardsMatchPhases,
  billiardsPlayerGroups,
} from '../runtime/domain/registry.ts';
import type {
  BilliardsMatchState,
  BilliardsShotTrace,
} from '../runtime/domain/types.ts';

function trace(overrides: Partial<BilliardsShotTrace> = {}): BilliardsShotTrace {
  return {
    eligibleForEightAtStart: false,
    firstObjectBallId: 1,
    pocketedBallIds: [],
    cushionHitsAfterContact: 1,
    collisionCount: 2,
    ...overrides,
  };
}

function openMatch(): BilliardsMatchState {
  return {
    ...createInitialMatch(),
    phase: billiardsMatchPhases.open,
  };
}

test('the first legal open-table pocket assigns groups and retains the turn', () => {
  const match = openMatch();
  const resolved = resolveCompletedShot(match, match.table, trace({
    pocketedBallIds: [1],
  }));
  assert.equal(resolved.players[0].group, billiardsPlayerGroups.solids);
  assert.equal(resolved.players[1].group, billiardsPlayerGroups.stripes);
  assert.equal(resolved.turnIndex, 0);
  assert.equal(resolved.phase, billiardsMatchPhases.groups);
});

test('a scratch changes turn and grants ball in hand', () => {
  const match = openMatch();
  const table = {
    ...match.table,
    balls: match.table.balls.map((ball) => ball.id === billiardsBallIds.cue
      ? { ...ball, pocketed: true }
      : ball),
  };
  const resolved = resolveCompletedShot(match, table, trace({
    pocketedBallIds: [billiardsBallIds.cue],
  }));
  assert.equal(resolved.turnIndex, 1);
  assert.equal(resolved.ballInHand, true);
  assert.equal(
    resolved.table.balls.find((ball) => ball.id === billiardsBallIds.cue)?.pocketed,
    false,
  );
});

test('the eight ball wins only when the shooter was already cleared', () => {
  const base = openMatch();
  const match: BilliardsMatchState = {
    ...base,
    phase: billiardsMatchPhases.groups,
    players: [
      { ...base.players[0], group: billiardsPlayerGroups.solids },
      { ...base.players[1], group: billiardsPlayerGroups.stripes },
    ],
  };
  const resolved = resolveCompletedShot(match, match.table, trace({
    eligibleForEightAtStart: true,
    firstObjectBallId: billiardsBallIds.eight,
    pocketedBallIds: [billiardsBallIds.eight],
  }));
  assert.equal(resolved.phase, billiardsMatchPhases.finished);
  assert.equal(resolved.winnerIndex, 0);
});

test('an early eight ball awards the match to the opponent', () => {
  const match = openMatch();
  const resolved = resolveCompletedShot(match, match.table, trace({
    firstObjectBallId: billiardsBallIds.eight,
    pocketedBallIds: [billiardsBallIds.eight],
  }));
  assert.equal(resolved.winnerIndex, 1);
});
