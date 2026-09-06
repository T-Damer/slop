import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialMatch, startMatchShot } from '../runtime/domain/match.ts';
import { selectPyramidBall, resolvePyramidShot } from '../runtime/domain/pyramid.ts';
import { createShotTrace, appendShotEvents } from '../runtime/domain/trace.ts';
import { tablePreset } from '../runtime/domain/table-presets.ts';
import { previewShot } from '../runtime/domain/shot.ts';
import type { BilliardsMatchState } from '../runtime/domain/types.ts';

const shot = { schemaVersion: 1, angleRadians: 0, power: 0.4, sideSpin: 0, followSpin: 0, clientSequence: 1 } as const;
const open = (): BilliardsMatchState => ({ ...createInitialMatch(undefined, 'russian'), phase: 'open' });
function pot(match: BilliardsMatchState, ids: number[], contact: number | null = 1) {
  const table = { ...match.table, balls: match.table.balls.map(b => ids.includes(b.id) ? { ...b, pocketed: true } : b) };
  return resolvePyramidShot(match, table, { ...createShotTrace(match), firstObjectBallId: contact, pocketedBallIds: ids });
}

test('pyramid scores the striker and eight normally, keeps the turn and never assigns pool groups', () => {
  const result = pot(open(), [0, 8]);
  assert.equal(result.winnerIndex, null);
  assert.equal(result.turnIndex, 0);
  assert.equal(result.ballInHand, false);
  assert.equal(result.table.balls.filter(b => b.pocketed && b.pocketedBy === 0).length, 2);
  assert.equal(result.players[0].group, 'open');
  assert.notEqual(result.table.cueBallId, 0);
});

test('any live ball can be selected after the break; prediction, strike and contact agree', () => {
  const match = selectPyramidBall(open(), 12);
  assert.equal(match.table.cueBallId, 12);
  assert.deepEqual(previewShot(match.table, shot).cuePath[0], match.table.balls.find(b => b.id === 12)?.position);
  const result = startMatchShot(match, shot);
  assert.equal(result.accepted, true);
  assert.ok(result.match.table.balls.find(b => b.id === 12)!.velocity.x > 0);
  assert.equal(result.match.table.balls.find(b => b.id === 0)!.velocity.x, 0);
  const trace = appendShotEvents(createShotTrace(match), [{ kind: 'ball-ball', time: 0, leftBallId: 12, rightBallId: 0 }]);
  assert.equal(trace.firstObjectBallId, 0);
  assert.equal(selectPyramidBall(createInitialMatch(undefined, 'russian'), 12).table.cueBallId, undefined);
  assert.equal(selectPyramidBall(createInitialMatch(), 12).table.cueBallId, undefined);
});

test('foul re-spots every illegal pot then lets the opponent choose one penalty ball', () => {
  const match = open();
  const result = pot(match, [0, 8], null);
  assert.equal(result.turnIndex, 1);
  assert.equal(result.pyramidPenalty, true);
  assert.equal(result.table.balls.filter(b => b.pocketed).length, 0);
  assert.equal(startMatchShot(result, shot).accepted, false);
  const awarded = selectPyramidBall(result, 8);
  assert.equal(awarded.pyramidPenalty, false);
  assert.equal(awarded.table.balls.find(b => b.id === 8)?.pocketedBy, 1);
  assert.equal(awarded.ballInHand, false);
  for (const ball of awarded.table.balls.filter(b => !b.pocketed)) {
    for (const other of awarded.table.balls.filter(b => !b.pocketed && b.id !== ball.id)) {
      assert.ok(Math.hypot(ball.position.x - other.position.x, ball.position.y - other.position.y) >= tablePreset(awarded.table).ballRadius * 2 - 1e-9);
    }
  }
});

test('eight scored balls win, including the penalty ball; a legal miss changes turn', () => {
  const match = open();
  const prior = { ...match, table: { ...match.table, balls: match.table.balls.map(b => b.id >= 1 && b.id <= 7 ? { ...b, pocketed: true, pocketedBy: 0 as const } : b) } };
  assert.equal(pot(prior, [0]).winnerIndex, 0);
  const foul = pot({ ...prior, turnIndex: 1 }, [], null);
  assert.equal(selectPyramidBall(foul, 15).winnerIndex, 0);
  const miss = resolvePyramidShot(match, match.table, { ...createShotTrace(match), firstObjectBallId: 1, cushionHitsAfterContact: 1 });
  assert.equal(miss.turnIndex, 1);
  assert.equal(miss.pyramidPenalty, false);
});
