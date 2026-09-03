import { billiardsPhysics } from '../domain/registry.ts';
import type { BilliardsBallState, Vec2 } from '../domain/types.ts';
import { billiardsRollingTuning } from './registry.ts';

export interface BallQuaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface BallOrientationDebug {
  readonly id: number;
  readonly totalRollRadians: number;
  readonly quaternion: readonly [number, number, number, number];
}

interface BallOrientationState {
  readonly position: Vec2;
  readonly quaternion: BallQuaternion;
  readonly totalRollRadians: number;
}

interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const identityQuaternion: BallQuaternion = { x: 0, y: 0, z: 0, w: 1 };

export class BilliardsBallOrientationStore {
  private readonly states = new Map<number, BallOrientationState>();

  public update(balls: ReadonlyArray<BilliardsBallState>): void {
    const visibleIds = new Set<number>();
    for (const ball of balls) {
      if (ball.pocketed) {
        continue;
      }
      visibleIds.add(ball.id);
      this.updateBall(ball);
    }
    for (const id of this.states.keys()) {
      if (!visibleIds.has(id)) {
        this.states.delete(id);
      }
    }
  }

  public orientation(id: number): BallQuaternion {
    return this.states.get(id)?.quaternion ?? identityQuaternion;
  }

  public debugSnapshot(): ReadonlyArray<BallOrientationDebug> {
    return [...this.states.entries()]
      .sort(([left], [right]) => left - right)
      .map(([id, state]) => ({
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
      this.states.set(ball.id, createState(ball.position));
      return;
    }
    const delta = {
      x: ball.position.x - previous.position.x,
      y: ball.position.y - previous.position.y,
    };
    const distance = Math.hypot(delta.x, delta.y);
    if (distance > billiardsRollingTuning.teleportDistance) {
      this.states.set(ball.id, createState(ball.position));
      return;
    }
    if (distance <= billiardsRollingTuning.minimumDistance) {
      this.states.set(ball.id, { ...previous, position: { ...ball.position } });
      return;
    }
    const rollRadians = distance / billiardsPhysics.ballRadius;
    const axis = normalize3({ x: delta.y, y: -delta.x, z: 0 });
    const deltaRotation = quaternionFromAxisAngle(axis, rollRadians);
    this.states.set(ball.id, {
      position: { ...ball.position },
      quaternion: normalizeQuaternion(multiplyQuaternions(
        deltaRotation,
        previous.quaternion,
      )),
      totalRollRadians: previous.totalRollRadians + rollRadians,
    });
  }
}

export function rotateBallVector(
  quaternion: BallQuaternion,
  vector: Vec3,
): Vec3 {
  const qVector = { x: quaternion.x, y: quaternion.y, z: quaternion.z };
  const uv = cross3(qVector, vector);
  const uuv = cross3(qVector, uv);
  return {
    x: vector.x + 2 * (quaternion.w * uv.x + uuv.x),
    y: vector.y + 2 * (quaternion.w * uv.y + uuv.y),
    z: vector.z + 2 * (quaternion.w * uv.z + uuv.z),
  };
}

export function inverseRotateBallVector(
  quaternion: BallQuaternion,
  vector: Vec3,
): Vec3 {
  return rotateBallVector({
    x: -quaternion.x,
    y: -quaternion.y,
    z: -quaternion.z,
    w: quaternion.w,
  }, vector);
}

function createState(position: Vec2): BallOrientationState {
  return {
    position: { ...position },
    quaternion: identityQuaternion,
    totalRollRadians: 0,
  };
}

function quaternionFromAxisAngle(axis: Vec3, radians: number): BallQuaternion {
  const half = radians * 0.5;
  const sine = Math.sin(half);
  return {
    x: axis.x * sine,
    y: axis.y * sine,
    z: axis.z * sine,
    w: Math.cos(half),
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
  if (length === 0) {
    return identityQuaternion;
  }
  return {
    x: value.x / length,
    y: value.y / length,
    z: value.z / length,
    w: value.w / length,
  };
}

function normalize3(value: Vec3): Vec3 {
  const length = Math.hypot(value.x, value.y, value.z);
  if (length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

function cross3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}
