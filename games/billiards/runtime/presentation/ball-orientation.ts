import { billiardsPhysics } from '../domain/registry.ts';
import type { BilliardsBallState, Vec2 } from '../domain/types.ts';
import { billiardsBallRendering } from './registry.ts';

export interface BallQuaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface BallVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface BallOrientationDebug {
  readonly id: number;
  readonly totalRollRadians: number;
  readonly quaternion: readonly [number, number, number, number];
}

interface OrientationState {
  position: Vec2;
  quaternion: BallQuaternion;
  totalRollRadians: number;
}

const identityQuaternion: BallQuaternion = { x: 0, y: 0, z: 0, w: 1 };

export class RollingBallOrientationStore {
  private readonly states = new Map<number, OrientationState>();

  public update(balls: ReadonlyArray<BilliardsBallState>): void {
    const activeIds = new Set<number>();
    for (const ball of balls) {
      if (ball.pocketed) {
        continue;
      }
      activeIds.add(ball.id);
      this.updateBall(ball);
    }
    for (const id of this.states.keys()) {
      if (!activeIds.has(id)) {
        this.states.delete(id);
      }
    }
  }

  public orientation(id: number): BallQuaternion {
    return this.states.get(id)?.quaternion ?? identityQuaternion;
  }

  public debugSnapshot(): ReadonlyArray<BallOrientationDebug> {
    return [...this.states.entries()].map(([id, state]) => ({
      id,
      totalRollRadians: state.totalRollRadians,
      quaternion: [
        state.quaternion.x,
        state.quaternion.y,
        state.quaternion.z,
        state.quaternion.w,
      ],
    }));
  }

  private updateBall(ball: BilliardsBallState): void {
    const previous = this.states.get(ball.id);
    if (previous === undefined) {
      this.states.set(ball.id, {
        position: { ...ball.position },
        quaternion: identityQuaternion,
        totalRollRadians: 0,
      });
      return;
    }
    const displacement = {
      x: ball.position.x - previous.position.x,
      y: ball.position.y - previous.position.y,
    };
    const distance = Math.hypot(displacement.x, displacement.y);
    const teleportDistance = billiardsPhysics.ballRadius
      * billiardsBallRendering.teleportDistanceMultiplier;
    if (distance > teleportDistance) {
      previous.position = { ...ball.position };
      previous.quaternion = identityQuaternion;
      previous.totalRollRadians = 0;
      return;
    }
    if (distance <= billiardsPhysics.velocityEpsilon) {
      previous.position = { ...ball.position };
      return;
    }
    const axis = normalizeVector3({
      x: displacement.y,
      y: -displacement.x,
      z: 0,
    });
    const rollRadians = distance / billiardsPhysics.ballRadius;
    const delta = quaternionFromAxisAngle(axis, rollRadians);
    previous.quaternion = normalizeQuaternion(
      multiplyQuaternions(delta, previous.quaternion),
    );
    previous.position = { ...ball.position };
    previous.totalRollRadians += Math.abs(rollRadians);
  }
}

export function rotateBallVector(
  quaternion: BallQuaternion,
  vector: BallVector3,
): BallVector3 {
  const cross = {
    x: quaternion.y * vector.z - quaternion.z * vector.y,
    y: quaternion.z * vector.x - quaternion.x * vector.z,
    z: quaternion.x * vector.y - quaternion.y * vector.x,
  };
  const secondCross = {
    x: quaternion.y * cross.z - quaternion.z * cross.y,
    y: quaternion.z * cross.x - quaternion.x * cross.z,
    z: quaternion.x * cross.y - quaternion.y * cross.x,
  };
  return {
    x: vector.x + 2 * (quaternion.w * cross.x + secondCross.x),
    y: vector.y + 2 * (quaternion.w * cross.y + secondCross.y),
    z: vector.z + 2 * (quaternion.w * cross.z + secondCross.z),
  };
}

export function inverseRotateBallVector(
  quaternion: BallQuaternion,
  vector: BallVector3,
): BallVector3 {
  return rotateBallVector({
    x: -quaternion.x,
    y: -quaternion.y,
    z: -quaternion.z,
    w: quaternion.w,
  }, vector);
}

function quaternionFromAxisAngle(
  axis: BallVector3,
  angleRadians: number,
): BallQuaternion {
  const halfAngle = angleRadians / 2;
  const scale = Math.sin(halfAngle);
  return {
    x: axis.x * scale,
    y: axis.y * scale,
    z: axis.z * scale,
    w: Math.cos(halfAngle),
  };
}

function multiplyQuaternions(
  left: BallQuaternion,
  right: BallQuaternion,
): BallQuaternion {
  return {
    x: left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
    y: left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
    z: left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
    w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
  };
}

function normalizeQuaternion(value: BallQuaternion): BallQuaternion {
  const length = Math.hypot(value.x, value.y, value.z, value.w);
  if (length <= Number.EPSILON) {
    return identityQuaternion;
  }
  return {
    x: value.x / length,
    y: value.y / length,
    z: value.z / length,
    w: value.w / length,
  };
}

function normalizeVector3(value: BallVector3): BallVector3 {
  const length = Math.hypot(value.x, value.y, value.z);
  if (length <= Number.EPSILON) {
    return { x: 0, y: 0, z: 1 };
  }
  return {
    x: value.x / length,
    y: value.y / length,
    z: value.z / length,
  };
}
