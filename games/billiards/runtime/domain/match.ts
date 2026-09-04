import { isFiniteVec2 } from './geometry.ts';
import {
  billiardsBallIds,
  billiardsMatchPhases,
  billiardsMessages,
} from './registry.ts';
import {
  canPlaceCueBall,
  createInitialMatch,
  placeCueBall,
} from './rack.ts';
import { applyShot, isValidShotCommand } from './shot.ts';
import {
  isTableAtRest,
  runTableUntilRest,
  settleStoppedBalls,
  simulateFixedStep,
} from './simulator.ts';
import { resolveCompletedShot } from './rules.ts';
import { appendShotEvents, createShotTrace } from './trace.ts';
import type {
  BilliardsCollisionEvent,
  BilliardsCommandResult,
  BilliardsMatchState,
  BilliardsShotCommand,
  Vec2,
} from './types.ts';

export { createInitialMatch } from './rack.ts';

export interface BilliardsMatchAdvance {
  readonly match: BilliardsMatchState;
  readonly events: ReadonlyArray<BilliardsCollisionEvent>;
}

export function startMatchShot(
  match: BilliardsMatchState,
  command: BilliardsShotCommand,
): BilliardsCommandResult {
  const reason = shotRejectionReason(match, command);
  if (reason !== null) {
    return { accepted: false, reason, match };
  }
  return {
    accepted: true,
    match: {
      ...match,
      revision: match.revision + 1,
      table: applyShot(match.table, command),
      ballInHand: false,
      activeShot: createShotTrace(match),
      status: `${match.players[match.turnIndex].name} выполняет удар`,
    },
  };
}

export function advanceMatchShot(match: BilliardsMatchState): BilliardsMatchState {
  return advanceMatchShotWithEvents(match).match;
}

export function advanceMatchShotWithEvents(
  match: BilliardsMatchState,
): BilliardsMatchAdvance {
  if (match.activeShot === null) {
    return { match, events: [] };
  }
  const simulation = simulateFixedStep(match.table);
  const trace = appendShotEvents(match.activeShot, simulation.events);
  const movingMatch = {
    ...match,
    table: simulation.table,
    activeShot: trace,
  };
  if (!isTableAtRest(simulation.table)) {
    return { match: movingMatch, events: simulation.events };
  }
  return {
    match: resolveCompletedShot(
      movingMatch,
      settleStoppedBalls(simulation.table),
      trace,
    ),
    events: simulation.events,
  };
}

export function runMatchShotToCompletion(
  match: BilliardsMatchState,
  command: BilliardsShotCommand,
): BilliardsCommandResult {
  const started = startMatchShot(match, command);
  if (!started.accepted) {
    return started;
  }
  const simulation = runTableUntilRest(started.match.table);
  const trace = appendShotEvents(
    started.match.activeShot ?? createShotTrace(match),
    simulation.events,
  );
  return {
    accepted: true,
    match: resolveCompletedShot(started.match, simulation.table, trace),
  };
}

export function positionCueBall(
  match: BilliardsMatchState,
  position: Vec2,
): BilliardsCommandResult {
  if (!match.ballInHand || match.activeShot !== null
    || match.phase === billiardsMatchPhases.finished || !isTableAtRest(match.table)) {
    return { accepted: false, reason: 'Биток нельзя перемещать сейчас', match };
  }
  if (!isFiniteVec2(position) || !canPlaceCueBall(match.table, position)) {
    return { accepted: false, reason: 'Для битка здесь нет свободного места', match };
  }
  return {
    accepted: true,
    match: {
      ...match,
      revision: match.revision + 1,
      ballInHand: false,
      table: placeCueBall(match.table, position),
      status: `${match.players[match.turnIndex].name}: поставьте направление удара`,
    },
  };
}

export function restartMatch(match: BilliardsMatchState): BilliardsMatchState {
  const names = [match.players[0].name, match.players[1].name] as const;
  return { ...createInitialMatch(names), revision: match.revision + 1 };
}

function shotRejectionReason(
  match: BilliardsMatchState,
  command: BilliardsShotCommand,
): string | null {
  if (match.phase === billiardsMatchPhases.finished) {
    return 'Партия уже завершена';
  }
  if (match.activeShot !== null || !isTableAtRest(match.table)) {
    return 'Дождитесь остановки шаров';
  }
  if (match.ballInHand) return billiardsMessages.placementRequired;
  if (!isValidShotCommand(command)) {
    return 'Параметры удара недопустимы';
  }
  const cue = match.table.balls.find((ball) => ball.id === billiardsBallIds.cue);
  if (cue === undefined || cue.pocketed) {
    return billiardsMessages.scratch;
  }
  return null;
}
