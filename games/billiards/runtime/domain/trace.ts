import {
  billiardsBallIds,
  billiardsCollisionKinds,
  billiardsPlayerGroups,
} from './registry.ts';
import type {
  BilliardsCollisionEvent,
  BilliardsMatchState,
  BilliardsShotTrace,
} from './types.ts';

export function createShotTrace(match: BilliardsMatchState): BilliardsShotTrace {
  return {
    eligibleForEightAtStart: isCurrentPlayerCleared(match),
    firstObjectBallId: null,
    pocketedBallIds: [],
    cushionHitsAfterContact: 0,
    collisionCount: 0,
  };
}

export function appendShotEvents(
  trace: BilliardsShotTrace,
  events: ReadonlyArray<BilliardsCollisionEvent>,
): BilliardsShotTrace {
  let firstObjectBallId = trace.firstObjectBallId;
  let cushionHitsAfterContact = trace.cushionHitsAfterContact;
  const pocketedBallIds = [...trace.pocketedBallIds];
  for (const event of events) {
    if (event.kind === billiardsCollisionKinds.ball && firstObjectBallId === null) {
      if (event.leftBallId === billiardsBallIds.cue) {
        firstObjectBallId = event.rightBallId;
      } else if (event.rightBallId === billiardsBallIds.cue) {
        firstObjectBallId = event.leftBallId;
      }
    }
    if (
      firstObjectBallId !== null
      && (event.kind === billiardsCollisionKinds.cushion
        || event.kind === billiardsCollisionKinds.jaw)
    ) {
      cushionHitsAfterContact += 1;
    }
    if (
      event.kind === billiardsCollisionKinds.pocket
      && !pocketedBallIds.includes(event.ballId)
    ) {
      pocketedBallIds.push(event.ballId);
    }
  }
  return {
    ...trace,
    firstObjectBallId,
    pocketedBallIds,
    cushionHitsAfterContact,
    collisionCount: trace.collisionCount + events.length,
  };
}

function isCurrentPlayerCleared(match: BilliardsMatchState): boolean {
  const group = match.players[match.turnIndex].group;
  if (group === billiardsPlayerGroups.open) {
    return false;
  }
  const ids = group === billiardsPlayerGroups.solids
    ? billiardsBallIds.solids
    : billiardsBallIds.stripes;
  return ids.every((id) => match.table.balls.find((ball) => ball.id === id)?.pocketed === true);
}
