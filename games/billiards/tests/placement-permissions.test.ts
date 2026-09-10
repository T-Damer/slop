import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialMatch, positionCueBall, startMatchShot } from '../runtime/domain/match.ts';
import { resolveCompletedShot } from '../runtime/domain/rules.ts';
import { createShotTrace } from '../runtime/domain/trace.ts';
import { billiardsMessages } from '../runtime/domain/registry.ts';
import type { BilliardsMatchState, BilliardsShotTrace } from '../runtime/domain/types.ts';

const spot = { x: -85, y: 20 };
const shot = { schemaVersion: 1, clientSequence: 0, angleRadians: 0, power: 0.4, sideSpin: 0, followSpin: 0 } as const;
function resolved(pots: number[], overrides: Partial<BilliardsShotTrace> = {}, groups = false) {
  const base = createInitialMatch();
  const match: BilliardsMatchState = { ...base, phase: groups ? 'groups' : 'open',
    players: groups ? [{ ...base.players[0], group: 'solids' }, { ...base.players[1], group: 'stripes' }] : base.players };
  const table = { ...match.table, balls: match.table.balls.map(ball =>
    pots.includes(ball.id) ? { ...ball, pocketed: true } : ball) };
  return resolveCompletedShot(match, table, { ...createShotTrace(match), firstObjectBallId: 1,
    cushionHitsAfterContact: 1, pocketedBallIds: pots, ...overrides });
}

test('ordinary legal misses and pots never grant cue placement', () => {
  for (const pots of [[], [1]]) {
    const match = resolved(pots);
    assert.equal(match.ballInHand, false);
    assert.equal(positionCueBall(match, spot).accepted, false);
    assert.equal(match.turnIndex, pots.length ? 0 : 1);
  }
});

for (const [name, pots, trace, groups] of [
  ['no contact', [], { firstObjectBallId: null }, false],
  ['no rail', [], { cushionHitsAfterContact: 0 }, false],
  ['wrong group', [], { firstObjectBallId: 9 }, true],
  ['scratch', [0], {}, false],
] as const) {
  test(`${name}: foul reason explains ball in hand, which is consumed exactly once`, () => {
    const match = resolved([...pots], trace, groups);
    assert.equal(match.ballInHand, true);
    assert.equal(match.turnIndex, 1);
    assert.ok(match.status.includes('Фол:'));
    assert.ok(match.status.includes(billiardsMessages.ballInHand));
    assert.equal(startMatchShot(match, shot).accepted, false);
    const placed = positionCueBall(match, spot);
    assert.equal(placed.accepted, true);
    assert.equal(placed.match.ballInHand, false);
    assert.equal(placed.match.revision, match.revision + 1);
    assert.equal(positionCueBall(placed.match, { x: -70, y: 20 }).accepted, false);
    assert.equal(startMatchShot(placed.match, shot).accepted, true);
  });
}
