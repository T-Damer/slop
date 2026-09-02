import {
  addVec2,
  clampNumber,
  dotVec2,
  lengthVec2,
  normalizeVec2,
  perpendicularVec2,
  scaleVec2,
  subtractVec2,
} from './geometry.ts';
import { findFirstCollision } from './collision.ts';
import {
  billiardsCollisionKinds,
  billiardsPhysics,
} from './registry.ts';
import { billiardsTableModel } from './table-model.ts';
import type {
  BilliardsBallState,
  BilliardsCollisionEvent,
  BilliardsSimulationStep,
  BilliardsTableState,
  Vec2,
} from './types.ts';

const cushionsById = new Map(
  billiardsTableModel.cushions.map((cushion) => [cushion.id, cushion]),
);
const jawsById = new Map(
  billiardsTableModel.jaws.map((jaw) => [jaw.id, jaw]),
);

export function simulateFixedStep(table: BilliardsTableState): BilliardsSimulationStep {
  let balls: ReadonlyArray<BilliardsBallState> = table.balls.map(cloneBall);
  let remaining = billiardsPhysics.fixedStepSeconds;
  const events: BilliardsCollisionEvent[] = [];
  for (
    let iteration = 0;
    iteration < billiardsPhysics.maximumCollisionIterations && remaining > 0;
    iteration += 1
  ) {
    const event = findFirstCollision(balls, remaining);
    if (event === null) {
      balls = advanceBalls(balls, remaining);
      remaining = 0;
      break;
    }
    const eventTime = clampNumber(event.time, 0, remaining);
    if (eventTime > 0) {
      balls = advanceBalls(balls, eventTime);
      remaining -= eventTime;
    }
    balls = resolveCollision(balls, event);
    events.push({ ...event, time: eventTime });
    if (eventTime <= billiardsPhysics.collisionEpsilonSeconds) {
      remaining = Math.max(0, remaining - billiardsPhysics.collisionEpsilonSeconds);
    }
  }
  if (remaining > 0) {
    balls = advanceBalls(balls, remaining);
  }
  return {
    table: {
      schemaVersion: 1,
      step: table.step + 1,
      balls: applyMotionDecay(balls),
    },
    events,
  };
}

export function isTableAtRest(table: BilliardsTableState): boolean {
  return table.balls.every((ball) =>
    ball.pocketed || lengthVec2(ball.velocity) <= billiardsPhysics.stopSpeed,
  );
}

export function runTableUntilRest(
  table: BilliardsTableState,
  maximumSteps = billiardsPhysics.maximumShotSteps,
): {
  readonly table: BilliardsTableState;
  readonly events: ReadonlyArray<BilliardsCollisionEvent>;
} {
  let current = table;
  const events: BilliardsCollisionEvent[] = [];
  for (let step = 0; step < maximumSteps && !isTableAtRest(current); step += 1) {
    const result = simulateFixedStep(current);
    current = result.table;
    events.push(...result.events);
  }
  return { table: settleStoppedBalls(current), events };
}

export function settleStoppedBalls(table: BilliardsTableState): BilliardsTableState {
  return {
    ...table,
    balls: table.balls.map((ball) => {
      if (ball.pocketed || lengthVec2(ball.velocity) > billiardsPhysics.stopSpeed) {
        return ball;
      }
      return {
        ...ball,
        velocity: { x: 0, y: 0 },
        sideSpin: 0,
        followSpin: 0,
      };
    }),
  };
}

function resolveCollision(
  balls: ReadonlyArray<BilliardsBallState>,
  event: BilliardsCollisionEvent,
): ReadonlyArray<BilliardsBallState> {
  if (event.kind === billiardsCollisionKinds.ball) {
    return resolveBallBall(balls, event.leftBallId, event.rightBallId);
  }
  if (event.kind === billiardsCollisionKinds.cushion) {
    const cushion = cushionsById.get(event.cushionId);
    return cushion === undefined
      ? balls
      : updateBall(balls, event.ballId, (ball) => resolveStaticBounce(
        ball,
        cushion.inwardNormal,
        billiardsPhysics.cushionRestitution,
        true,
      ));
  }
  if (event.kind === billiardsCollisionKinds.jaw) {
    const jaw = jawsById.get(event.jawId);
    return jaw === undefined
      ? balls
      : updateBall(balls, event.ballId, (ball) => {
        const fallback = scaleVec2(normalizeVec2(ball.velocity), -1);
        const normal = normalizeOr(subtractVec2(ball.position, jaw.point), fallback);
        return resolveStaticBounce(ball, normal, billiardsPhysics.jawRestitution, false);
      });
  }
  return updateBall(balls, event.ballId, (ball) => ({
    ...ball,
    velocity: { x: 0, y: 0 },
    sideSpin: 0,
    followSpin: 0,
    pocketed: true,
  }));
}

function resolveBallBall(
  balls: ReadonlyArray<BilliardsBallState>,
  leftId: number,
  rightId: number,
): ReadonlyArray<BilliardsBallState> {
  const left = balls.find((ball) => ball.id === leftId);
  const right = balls.find((ball) => ball.id === rightId);
  if (left === undefined || right === undefined || left.pocketed || right.pocketed) {
    return balls;
  }
  const fallback = normalizeVec2(subtractVec2(left.velocity, right.velocity));
  const normal = normalizeOr(subtractVec2(right.position, left.position), fallback);
  const leftNormalSpeed = dotVec2(left.velocity, normal);
  const rightNormalSpeed = dotVec2(right.velocity, normal);
  const restitution = billiardsPhysics.ballRestitution;
  const leftNextNormal = (
    (1 - restitution) * leftNormalSpeed + (1 + restitution) * rightNormalSpeed
  ) / 2;
  const rightNextNormal = (
    (1 + restitution) * leftNormalSpeed + (1 - restitution) * rightNormalSpeed
  ) / 2;
  const leftVelocity = addVec2(
    left.velocity,
    scaleVec2(normal, leftNextNormal - leftNormalSpeed),
  );
  const rightVelocity = addVec2(
    right.velocity,
    scaleVec2(normal, rightNextNormal - rightNormalSpeed),
  );
  const followImpulse = left.followSpin * billiardsPhysics.ballSpinTransfer;
  const separation = scaleVec2(normal, billiardsPhysics.separationEpsilon / 2);
  return balls.map((ball) => {
    if (ball.id === leftId) {
      return {
        ...ball,
        position: subtractVec2(ball.position, separation),
        velocity: addVec2(leftVelocity, scaleVec2(normal, followImpulse)),
        followSpin: ball.followSpin * 0.55,
      };
    }
    if (ball.id === rightId) {
      return {
        ...ball,
        position: addVec2(ball.position, separation),
        velocity: rightVelocity,
      };
    }
    return ball;
  });
}

function resolveStaticBounce(
  ball: BilliardsBallState,
  normal: Vec2,
  restitution: number,
  useSpin: boolean,
): BilliardsBallState {
  const normalSpeed = dotVec2(ball.velocity, normal);
  if (normalSpeed >= 0) {
    return ball;
  }
  let velocity = subtractVec2(
    ball.velocity,
    scaleVec2(normal, (1 + restitution) * normalSpeed),
  );
  if (useSpin && ball.sideSpin !== 0) {
    const tangent = perpendicularVec2(normal);
    velocity = addVec2(
      velocity,
      scaleVec2(tangent, ball.sideSpin * billiardsPhysics.cushionSpinTransfer),
    );
  }
  return {
    ...ball,
    position: addVec2(ball.position, scaleVec2(normal, billiardsPhysics.separationEpsilon)),
    velocity,
    sideSpin: ball.sideSpin * 0.7,
  };
}

function advanceBalls(
  balls: ReadonlyArray<BilliardsBallState>,
  seconds: number,
): ReadonlyArray<BilliardsBallState> {
  return balls.map((ball) => ball.pocketed ? ball : {
    ...ball,
    position: addVec2(ball.position, scaleVec2(ball.velocity, seconds)),
  });
}

function applyMotionDecay(
  balls: ReadonlyArray<BilliardsBallState>,
): ReadonlyArray<BilliardsBallState> {
  const seconds = billiardsPhysics.fixedStepSeconds;
  return balls.map((ball) => {
    if (ball.pocketed) {
      return ball;
    }
    const speed = lengthVec2(ball.velocity);
    const nextSpeed = Math.max(0, speed - billiardsPhysics.rollingDeceleration * seconds);
    const velocity = nextSpeed <= billiardsPhysics.stopSpeed
      ? { x: 0, y: 0 }
      : scaleVec2(ball.velocity, nextSpeed / speed);
    return {
      ...ball,
      velocity,
      sideSpin: decaySigned(ball.sideSpin, billiardsPhysics.sideSpinDecayPerSecond * seconds),
      followSpin: decaySigned(ball.followSpin, billiardsPhysics.followSpinDecayPerSecond * seconds),
    };
  });
}

function updateBall(
  balls: ReadonlyArray<BilliardsBallState>,
  id: number,
  update: (ball: BilliardsBallState) => BilliardsBallState,
): ReadonlyArray<BilliardsBallState> {
  return balls.map((ball) => ball.id === id ? update(ball) : ball);
}

function normalizeOr(value: Vec2, fallback: Vec2): Vec2 {
  const normalized = normalizeVec2(value);
  return normalized.x === 0 && normalized.y === 0 ? fallback : normalized;
}

function decaySigned(value: number, amount: number): number {
  if (Math.abs(value) <= amount) {
    return 0;
  }
  return value - Math.sign(value) * amount;
}

function cloneBall(ball: BilliardsBallState): BilliardsBallState {
  return {
    ...ball,
    position: { ...ball.position },
    velocity: { ...ball.velocity },
  };
}
