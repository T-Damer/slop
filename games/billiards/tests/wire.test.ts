import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialMatch, startMatchShot } from '../runtime/domain/match.ts';
import {
  cloneMatchSnapshot,
  isMatchSnapshot,
} from '../runtime/network/wire.ts';
import { createRestartWireCommand } from '../runtime/network/session.ts';

const breakCommand = {
  schemaVersion: 1,
  angleRadians: 0,
  power: 0.72,
  sideSpin: 0,
  followSpin: 0,
  clientSequence: 1,
} as const;

test('the network guard accepts canonical rest and active-shot snapshots', () => {
  const initial = createInitialMatch();
  assert.equal(isMatchSnapshot(initial), true);
  const started = startMatchShot(initial, breakCommand);
  assert.equal(started.accepted, true);
  if (started.accepted) {
    assert.equal(isMatchSnapshot(started.match), true);
  }
});

test('the network guard rejects incomplete or structurally invalid snapshots', () => {
  const initial = createInitialMatch();
  const { activeShot: _activeShot, ...withoutActiveShot } = initial;
  assert.equal(isMatchSnapshot(withoutActiveShot), false);
  assert.equal(isMatchSnapshot({
    ...initial,
    table: {
      ...initial.table,
      balls: initial.table.balls.map((ball) => ball.id === 1
        ? { ...ball, kind: 'unknown' }
        : ball),
    },
  }), false);
  assert.equal(isMatchSnapshot({
    ...initial,
    players: [initial.players[1], initial.players[0]],
  }), false);
});

test('cloning an authoritative snapshot owns every mutable collection', () => {
  const started = startMatchShot(createInitialMatch(), breakCommand);
  assert.equal(started.accepted, true);
  if (!started.accepted) {
    return;
  }
  const clone = cloneMatchSnapshot(started.match);
  assert.notEqual(clone, started.match);
  assert.notEqual(clone.table, started.match.table);
  assert.notEqual(clone.table.balls, started.match.table.balls);
  assert.notEqual(clone.table.balls[0], started.match.table.balls[0]);
  assert.notEqual(clone.activeShot, started.match.activeShot);
  assert.notEqual(
    clone.activeShot?.pocketedBallIds,
    started.match.activeShot?.pocketedBallIds,
  );
  assert.deepEqual(clone, started.match);
});

test('restart commands carry the revision they intend to replace', () => {
  assert.deepEqual(createRestartWireCommand(7, 12), {
    schemaVersion: 1,
    clientSequence: 7,
    expectedRevision: 12,
  });
});
