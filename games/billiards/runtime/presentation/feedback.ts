import { addVec2, lengthVec2, scaleVec2, subtractVec2 } from '../domain/geometry.ts';
import {
  billiardsCollisionKinds,
  billiardsPhysics,
} from '../domain/registry.ts';
import type {
  BilliardsCollisionEvent,
  BilliardsMatchState,
  BilliardsTableState,
  Vec2,
} from '../domain/types.ts';
import {
  billiardsFeedbackKinds,
  billiardsFeedbackTuning,
} from './registry.ts';

type FeedbackKind = typeof billiardsFeedbackKinds[keyof typeof billiardsFeedbackKinds];

export interface BilliardsFeedbackEvent {
  readonly kind: FeedbackKind;
  readonly position: Vec2;
  readonly intensity: number;
  readonly angleRadians?: number;
  readonly power?: number;
  readonly primaryBallId?: number;
  readonly secondaryBallId?: number;
}

export interface BilliardsFeedbackBatch {
  readonly revision: number;
  readonly events: ReadonlyArray<BilliardsFeedbackEvent>;
}

export function createCueFeedback(
  match: BilliardsMatchState,
  angleRadians: number,
  power: number,
): BilliardsFeedbackEvent | null {
  const cue = match.table.balls.find((ball) => ball.id === 0 && !ball.pocketed);
  return cue === undefined ? null : {
    kind: billiardsFeedbackKinds.cue,
    position: cue.position,
    intensity: clamp01(power),
    angleRadians,
    power,
    primaryBallId: cue.id,
  };
}

export function createCollisionFeedback(
  table: BilliardsTableState,
  events: ReadonlyArray<BilliardsCollisionEvent>,
): ReadonlyArray<BilliardsFeedbackEvent> {
  return events.map((event) => mapCollision(table, event));
}

function mapCollision(
  table: BilliardsTableState,
  event: BilliardsCollisionEvent,
): BilliardsFeedbackEvent {
  if (event.kind === billiardsCollisionKinds.ball) {
    const left = table.balls.find((ball) => ball.id === event.leftBallId);
    const right = table.balls.find((ball) => ball.id === event.rightBallId);
    const leftPosition = impactPosition(left?.position, left?.velocity, event.time);
    const rightPosition = impactPosition(right?.position, right?.velocity, event.time);
    return {
      kind: billiardsFeedbackKinds.ball,
      position: scaleVec2(addVec2(leftPosition, rightPosition), 0.5),
      intensity: impactIntensity(left?.velocity, right?.velocity),
      primaryBallId: event.leftBallId,
      secondaryBallId: event.rightBallId,
    };
  }
  const ball = table.balls.find((candidate) => candidate.id === event.ballId);
  const kind = event.kind === billiardsCollisionKinds.pocket
    ? billiardsFeedbackKinds.pocket
    : event.kind === billiardsCollisionKinds.jaw
      ? billiardsFeedbackKinds.jaw
      : billiardsFeedbackKinds.cushion;
  return {
    kind,
    position: impactPosition(ball?.position, ball?.velocity, event.time),
    intensity: clamp01(
      lengthVec2(ball?.velocity ?? { x: 0, y: 0 })
        / billiardsFeedbackTuning.fullIntensitySpeed,
    ),
    primaryBallId: event.ballId,
  };
}

function impactPosition(
  position: Vec2 | undefined,
  velocity: Vec2 | undefined,
  time: number,
): Vec2 {
  const origin = position ?? { x: 0, y: 0 };
  return addVec2(origin, scaleVec2(velocity ?? { x: 0, y: 0 }, time));
}

function impactIntensity(left: Vec2 | undefined, right: Vec2 | undefined): number {
  const relative = subtractVec2(left ?? { x: 0, y: 0 }, right ?? { x: 0, y: 0 });
  return clamp01(lengthVec2(relative) / billiardsPhysics.maximumShotSpeed);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
