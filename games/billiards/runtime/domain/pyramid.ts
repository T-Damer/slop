import { tablePreset, cueBallId } from './table-presets.ts';
import { billiardsPhysics } from './registry.ts';
import { isTableAtRest } from './simulator.ts';
import type { BilliardsMatchState, BilliardsTableState, BilliardsShotTrace } from './types.ts';

/** Club Free Pyramid: eight points, any striker, legal in-offs and a chosen
 * penalty ball. Safety shots use contact + a rail, not tournament article 20.
 * Keeping this distinction explicit avoids pretending pool fouls are pyramid. */
export const pyramidRules = {
  target: 8,
  select: 'Выберите биток касанием шара или клавишей B',
  penalty: 'Штраф: соперник выбирает любой шар на свою полку',
  win: 'Восемь шаров — победа!',
} as const;

export function selectPyramidBall(match: BilliardsMatchState, id: number): BilliardsMatchState {
  if (match.table.presetId !== 'russian' || match.activeShot !== null
    || match.phase === 'finished' || !isTableAtRest(match.table)
    || (match.phase === 'break' && !match.pyramidPenalty)) return match;
  if (!match.table.balls.some(ball => ball.id === id && !ball.pocketed)) return match;
  if (!match.pyramidPenalty) return { ...match, revision: match.revision + 1,
    table: { ...match.table, cueBallId: id }, status: `Биток: шар ${id || 'без номера'}` };
  const table = { ...match.table, balls: match.table.balls.map(ball => ball.id === id
    ? { ...ball, pocketed: true, pocketedBy: match.turnIndex } : ball) };
  return finish({ ...match, pyramidPenalty: false }, table, match.turnIndex, pyramidRules.select);
}

export function resolvePyramidShot(match: BilliardsMatchState, table: BilliardsTableState,
  trace: BilliardsShotTrace): BilliardsMatchState {
  const foul = trace.firstObjectBallId === null
    || (trace.pocketedBallIds.length === 0 && trace.cushionHitsAfterContact === 0);
  const shooter = match.turnIndex;
  const next = foul || trace.pocketedBallIds.length === 0 ? (shooter === 0 ? 1 : 0) : shooter;
  if (foul) table = respot(table, trace.pocketedBallIds);
  else table = { ...table, balls: table.balls.map(ball => trace.pocketedBallIds.includes(ball.id)
    ? { ...ball, pocketedBy: shooter } : ball) };
  return finish({ ...match, pyramidPenalty: foul }, table, next,
    foul ? pyramidRules.penalty : pyramidRules.select);
}

function finish(match: BilliardsMatchState, table: BilliardsTableState,
  turnIndex: 0 | 1, status: string): BilliardsMatchState {
  const winner = ([0, 1] as const).find(player => table.balls.filter(ball =>
    ball.pocketed && ball.pocketedBy === player).length >= pyramidRules.target) ?? null;
  const current = cueBallId(table);
  const selected = table.balls.some(ball => ball.id === current && !ball.pocketed)
    ? current : table.balls.find(ball => !ball.pocketed)?.id ?? 0;
  return { ...match, revision: match.revision + 1, table: { ...table, cueBallId: selected },
    turnIndex, phase: winner === null ? 'open' : 'finished', winnerIndex: winner,
    ballInHand: false, activeShot: null, status: winner === null ? status : pyramidRules.win };
}

function respot(table: BilliardsTableState, ids: ReadonlyArray<number>): BilliardsTableState {
  let balls = [...table.balls];
  const radius = tablePreset(table).ballRadius;
  const spacing = radius * 2 + billiardsPhysics.separationEpsilon * 2;
  const foot = billiardsPhysics.tableWidth / 4;
  const limit = billiardsPhysics.tableWidth / 2 - radius;
  for (const id of ids) {
    const live = balls.filter(ball => !ball.pocketed && ball.id !== id);
    const candidates = [foot, ...live.flatMap(ball => {
      const clearance = Math.sqrt(Math.max(0, spacing ** 2 - ball.position.y ** 2));
      return [ball.position.x + clearance, ball.position.x - clearance];
    })].filter(x => Math.abs(x) <= limit)
      .sort((a, b) => (a < foot ? 10 + foot - a : a - foot) - (b < foot ? 10 + foot - b : b - foot));
    const x = candidates.find(x => live.every(ball =>
      Math.hypot(x - ball.position.x, ball.position.y) >= spacing - 1e-10));
    if (x === undefined) throw new Error('No legal pyramid re-spot');
    balls = balls.map(ball => ball.id === id ? { ...ball, position: { x, y: 0 },
      velocity: { x: 0, y: 0 }, sideSpin: 0, followSpin: 0, pocketed: false, pocketedBy: undefined } : ball);
  }
  return { ...table, balls };
}
