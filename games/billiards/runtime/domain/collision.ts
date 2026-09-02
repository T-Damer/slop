import {
  addVec2,
  dotVec2,
  lengthSquaredVec2,
  normalizeVec2,
  scaleVec2,
  subtractVec2,
} from './geometry.ts';
import {
  billiardsCollisionKinds,
  billiardsPhysics,
} from './registry.ts';
import {
  billiardsTableModel,
  type BilliardsTableModel,
} from './table-model.ts';
import type {
  BilliardsBallState,
  BilliardsCollisionEvent,
  BilliardsCushionLine,
  BilliardsJawPoint,
  BilliardsPocket,
} from './types.ts';

const collisionPriority: Readonly<Record<BilliardsCollisionEvent['kind'], number>> = {
  [billiardsCollisionKinds.pocket]: 0,
  [billiardsCollisionKinds.ball]: 1,
  [billiardsCollisionKinds.cushion]: 2,
  [billiardsCollisionKinds.jaw]: 3,
};

export function findFirstCollision(
  balls: ReadonlyArray<BilliardsBallState>,
  maximumTime: number,
  tableModel: BilliardsTableModel = billiardsTableModel,
): BilliardsCollisionEvent | null {
  let earliest: BilliardsCollisionEvent | null = null;
  const activeBalls = balls.filter((ball) => !ball.pocketed);
  for (const ball of activeBalls) {
    for (const pocket of tableModel.pockets) {
      earliest = chooseEarlier(earliest, pocketCollision(ball, pocket, maximumTime));
    }
    for (const cushion of tableModel.cushions) {
      earliest = chooseEarlier(earliest, cushionCollision(ball, cushion, maximumTime));
    }
    for (const jaw of tableModel.jaws) {
      earliest = chooseEarlier(earliest, jawCollision(ball, jaw, maximumTime));
    }
  }
  for (let leftIndex = 0; leftIndex < activeBalls.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < activeBalls.length; rightIndex += 1) {
      const left = activeBalls[leftIndex];
      const right = activeBalls[rightIndex];
      if (left !== undefined && right !== undefined) {
        earliest = chooseEarlier(earliest, ballCollision(left, right, maximumTime));
      }
    }
  }
  return earliest;
}

export function ballCollision(
  left: BilliardsBallState,
  right: BilliardsBallState,
  maximumTime: number,
): BilliardsCollisionEvent | null {
  const relativePosition = subtractVec2(right.position, left.position);
  const relativeVelocity = subtractVec2(right.velocity, left.velocity);
  const diameter = billiardsPhysics.ballRadius * 2;
  const time = movingCircleTime(relativePosition, relativeVelocity, diameter, maximumTime);
  return time === null ? null : {
    kind: billiardsCollisionKinds.ball,
    time,
    leftBallId: Math.min(left.id, right.id),
    rightBallId: Math.max(left.id, right.id),
  };
}

function cushionCollision(
  ball: BilliardsBallState,
  cushion: BilliardsCushionLine,
  maximumTime: number,
): BilliardsCollisionEvent | null {
  const normalSpeed = dotVec2(ball.velocity, cushion.inwardNormal);
  if (normalSpeed >= -billiardsPhysics.velocityEpsilon) {
    return null;
  }
  const distance = dotVec2(subtractVec2(ball.position, cushion.start), cushion.inwardNormal);
  const time = (billiardsPhysics.ballRadius - distance) / normalSpeed;
  if (!isCandidateTime(time, maximumTime)) {
    return null;
  }
  const impact = addVec2(ball.position, scaleVec2(ball.velocity, time));
  const segment = subtractVec2(cushion.end, cushion.start);
  const segmentLengthSquared = lengthSquaredVec2(segment);
  const projection = dotVec2(subtractVec2(impact, cushion.start), segment);
  if (projection < 0 || projection > segmentLengthSquared) {
    return null;
  }
  return {
    kind: billiardsCollisionKinds.cushion,
    time,
    ballId: ball.id,
    cushionId: cushion.id,
  };
}

function jawCollision(
  ball: BilliardsBallState,
  jaw: BilliardsJawPoint,
  maximumTime: number,
): BilliardsCollisionEvent | null {
  const relativePosition = subtractVec2(ball.position, jaw.point);
  const time = movingCircleTime(
    relativePosition,
    ball.velocity,
    billiardsPhysics.ballRadius,
    maximumTime,
  );
  return time === null ? null : {
    kind: billiardsCollisionKinds.jaw,
    time,
    ballId: ball.id,
    jawId: jaw.id,
  };
}

function pocketCollision(
  ball: BilliardsBallState,
  pocket: BilliardsPocket,
  maximumTime: number,
): BilliardsCollisionEvent | null {
  const relativePosition = subtractVec2(ball.position, pocket.center);
  const time = movingCircleTime(relativePosition, ball.velocity, pocket.radius, maximumTime);
  return time === null ? null : {
    kind: billiardsCollisionKinds.pocket,
    time,
    ballId: ball.id,
    pocketId: pocket.id,
  };
}

function movingCircleTime(
  relativePosition: { readonly x: number; readonly y: number },
  relativeVelocity: { readonly x: number; readonly y: number },
  radius: number,
  maximumTime: number,
): number | null {
  const radiusSquared = radius * radius;
  const distanceSquared = lengthSquaredVec2(relativePosition);
  if (distanceSquared <= radiusSquared) {
    const normal = normalizeVec2(relativePosition);
    return dotVec2(relativeVelocity, normal) < 0 ? 0 : null;
  }
  const speedSquared = lengthSquaredVec2(relativeVelocity);
  if (speedSquared <= billiardsPhysics.velocityEpsilon) {
    return null;
  }
  const linear = 2 * dotVec2(relativePosition, relativeVelocity);
  if (linear >= 0) {
    return null;
  }
  const discriminant = linear * linear - 4 * speedSquared * (distanceSquared - radiusSquared);
  if (discriminant < 0) {
    return null;
  }
  const time = (-linear - Math.sqrt(discriminant)) / (2 * speedSquared);
  return isCandidateTime(time, maximumTime) ? time : null;
}

function isCandidateTime(time: number, maximumTime: number): boolean {
  return Number.isFinite(time)
    && time >= -billiardsPhysics.collisionEpsilonSeconds
    && time <= maximumTime + billiardsPhysics.collisionEpsilonSeconds;
}

function chooseEarlier(
  current: BilliardsCollisionEvent | null,
  candidate: BilliardsCollisionEvent | null,
): BilliardsCollisionEvent | null {
  if (candidate === null) {
    return current;
  }
  if (current === null) {
    return candidate;
  }
  const difference = candidate.time - current.time;
  if (difference < -billiardsPhysics.collisionEpsilonSeconds) {
    return candidate;
  }
  if (Math.abs(difference) > billiardsPhysics.collisionEpsilonSeconds) {
    return current;
  }
  const priorityDifference = collisionPriority[candidate.kind] - collisionPriority[current.kind];
  if (priorityDifference !== 0) {
    return priorityDifference < 0 ? candidate : current;
  }
  return eventKey(candidate) < eventKey(current) ? candidate : current;
}

function eventKey(event: BilliardsCollisionEvent): string {
  if (event.kind === billiardsCollisionKinds.ball) {
    return `${event.leftBallId}:${event.rightBallId}`;
  }
  if (event.kind === billiardsCollisionKinds.cushion) {
    return `${event.ballId}:${event.cushionId}`;
  }
  if (event.kind === billiardsCollisionKinds.jaw) {
    return `${event.ballId}:${event.jawId}`;
  }
  return `${event.ballId}:${event.pocketId}`;
}
