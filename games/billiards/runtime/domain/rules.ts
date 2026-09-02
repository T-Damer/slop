import {
  billiardsBallIds,
  billiardsBallKinds,
  billiardsMatchPhases,
  billiardsMessages,
  billiardsPlayerGroups,
  billiardsRules,
} from './registry.ts';
import { rerackMatch, restoreCueBall } from './rack.ts';
import type {
  BilliardsBallKind,
  BilliardsMatchState,
  BilliardsPlayerGroup,
  BilliardsShotTrace,
  BilliardsTableState,
} from './types.ts';

export function resolveCompletedShot(
  match: BilliardsMatchState,
  table: BilliardsTableState,
  trace: BilliardsShotTrace,
): BilliardsMatchState {
  const current = match.turnIndex;
  const opponent = otherPlayer(current);
  const eightPocketed = trace.pocketedBallIds.includes(billiardsBallIds.eight);
  if (eightPocketed && match.phase === billiardsMatchPhases.break && billiardsRules.eightOnBreakReracks) {
    return rerackMatch({ ...match, table }, billiardsMessages.rerack);
  }
  const foul = detectFoul(match, trace);
  if (eightPocketed) {
    const legalEight = trace.eligibleForEightAtStart && foul === null;
    return finishMatch(match, table, legalEight ? current : opponent, legalEight
      ? billiardsMessages.eightWin
      : billiardsMessages.eightEarly);
  }
  const assigned = assignGroups(match, trace, foul === null);
  const retainedTurn = foul === null && didRetainTurn(assigned, trace);
  const nextTurn = foul === null && retainedTurn ? current : opponent;
  const cueRestored = restoreCueBall(table);
  return {
    ...assigned,
    revision: match.revision + 1,
    table: cueRestored,
    turnIndex: nextTurn,
    phase: nextPhase(assigned),
    ballInHand: foul !== null,
    activeShot: null,
    status: foul ?? turnStatus(assigned, nextTurn, retainedTurn),
  };
}

export function groupForBallKind(kind: BilliardsBallKind): BilliardsPlayerGroup | null {
  if (kind === billiardsBallKinds.solid) return billiardsPlayerGroups.solids;
  if (kind === billiardsBallKinds.stripe) return billiardsPlayerGroups.stripes;
  return null;
}

function detectFoul(
  match: BilliardsMatchState,
  trace: BilliardsShotTrace,
): string | null {
  if (trace.pocketedBallIds.includes(billiardsBallIds.cue)) {
    return billiardsMessages.scratch;
  }
  if (trace.firstObjectBallId === null) {
    return billiardsMessages.noContact;
  }
  if (!isLegalFirstContact(match, trace)) {
    return billiardsMessages.wrongFirstContact;
  }
  if (
    billiardsRules.noRailAfterContactIsFoul
    && trace.pocketedBallIds.length === 0
    && trace.cushionHitsAfterContact === 0
  ) {
    return billiardsMessages.noRail;
  }
  return null;
}

function isLegalFirstContact(
  match: BilliardsMatchState,
  trace: BilliardsShotTrace,
): boolean {
  const firstId = trace.firstObjectBallId;
  if (firstId === null) {
    return false;
  }
  if (match.phase === billiardsMatchPhases.break) {
    return firstId !== billiardsBallIds.eight;
  }
  const player = match.players[match.turnIndex];
  if (player.group === billiardsPlayerGroups.open) {
    return firstId !== billiardsBallIds.eight;
  }
  if (trace.eligibleForEightAtStart) {
    return firstId === billiardsBallIds.eight;
  }
  const firstBall = match.table.balls.find((ball) => ball.id === firstId);
  return firstBall !== undefined && groupForBallKind(firstBall.kind) === player.group;
}

function assignGroups(
  match: BilliardsMatchState,
  trace: BilliardsShotTrace,
  legal: boolean,
): BilliardsMatchState {
  if (!legal || match.phase !== billiardsMatchPhases.open) {
    return match;
  }
  const firstAssignable = trace.pocketedBallIds
    .map((id) => match.table.balls.find((ball) => ball.id === id)?.kind)
    .map((kind) => kind === undefined ? null : groupForBallKind(kind))
    .find((group) => group !== null);
  if (firstAssignable === undefined || firstAssignable === null) {
    return match;
  }
  const current = match.turnIndex;
  const opponent = otherPlayer(current);
  const opposite = firstAssignable === billiardsPlayerGroups.solids
    ? billiardsPlayerGroups.stripes
    : billiardsPlayerGroups.solids;
  const currentPlayer = match.players[current];
  const opponentPlayer = match.players[opponent];
  const players: BilliardsMatchState['players'] = current === 0
    ? [
      { ...currentPlayer, group: firstAssignable },
      { ...opponentPlayer, group: opposite },
    ]
    : [
      { ...opponentPlayer, group: opposite },
      { ...currentPlayer, group: firstAssignable },
    ];
  return { ...match, players };
}

function didRetainTurn(
  match: BilliardsMatchState,
  trace: BilliardsShotTrace,
): boolean {
  const objectPocketed = trace.pocketedBallIds.filter((id) =>
    id !== billiardsBallIds.cue && id !== billiardsBallIds.eight,
  );
  if (objectPocketed.length === 0) {
    return false;
  }
  const group = match.players[match.turnIndex].group;
  if (group === billiardsPlayerGroups.open) {
    return true;
  }
  return objectPocketed.some((id) => {
    const ball = match.table.balls.find((candidate) => candidate.id === id);
    return ball !== undefined && groupForBallKind(ball.kind) === group;
  });
}

function nextPhase(match: BilliardsMatchState): BilliardsMatchState['phase'] {
  if (match.phase === billiardsMatchPhases.break) {
    return billiardsMatchPhases.open;
  }
  if (match.players[0].group !== billiardsPlayerGroups.open) {
    return billiardsMatchPhases.groups;
  }
  return match.phase;
}

function finishMatch(
  match: BilliardsMatchState,
  table: BilliardsTableState,
  winnerIndex: 0 | 1,
  status: string,
): BilliardsMatchState {
  return {
    ...match,
    revision: match.revision + 1,
    table,
    phase: billiardsMatchPhases.finished,
    winnerIndex,
    ballInHand: false,
    activeShot: null,
    status,
  };
}

function turnStatus(
  match: BilliardsMatchState,
  playerIndex: 0 | 1,
  retainedTurn: boolean,
): string {
  const player = match.players[playerIndex];
  const group = groupLabel(player.group);
  const prefix = retainedTurn ? 'Продолжает' : billiardsMessages.turn;
  return `${prefix}: ${player.name}${group === '' ? '' : ` · ${group}`}`;
}

function groupLabel(group: BilliardsPlayerGroup): string {
  if (group === billiardsPlayerGroups.solids) return billiardsMessages.solids;
  if (group === billiardsPlayerGroups.stripes) return billiardsMessages.stripes;
  return '';
}

function otherPlayer(index: 0 | 1): 0 | 1 {
  return index === 0 ? 1 : 0;
}
