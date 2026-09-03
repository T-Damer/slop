import { billiardsBallIds, billiardsPhysics } from '../domain/registry.ts';
import type {
  BilliardsBallState,
  BilliardsTableState,
  Vec2,
} from '../domain/types.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import {
  ballColor,
  ballDisplayKind,
  billiardsView,
} from './registry.ts';
import {
  billiardsAxisAngleQuaternion,
  billiardsColorChannel,
  billiardsConjugateQuaternion,
  billiardsDotVector3,
  billiardsIdentityQuaternion,
  billiardsMixRgb,
  billiardsMultiplyQuaternions,
  billiardsNormalizeQuaternion,
  billiardsNormalizeVector3,
  billiardsReadHexColor,
  billiardsRotateVector,
  billiardsSmoothStep,
  type BilliardsSphereQuaternion,
} from './sphere-math.ts';

interface BallRollState {
  position: Vec2;
  orientation: BilliardsSphereQuaternion;
  pocketed: boolean;
  dirty: boolean;
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly pixels: ImageData;
}

const sphereTextureSize = 64;
const sphereHalfSize = sphereTextureSize / 2;
const fullCircle = Math.PI * 2;
const lightDirection = billiardsNormalizeVector3({ x: -0.48, y: -0.62, z: 0.72 });
const halfVector = billiardsNormalizeVector3({
  x: lightDirection.x,
  y: lightDirection.y,
  z: lightDirection.z + 1,
});

export class BilliardsBallRenderer {
  private readonly rolls = new Map<number, BallRollState>();
  private lastTableStep = -1;

  public draw(
    context: CanvasRenderingContext2D,
    table: BilliardsTableState,
    reducedMotion: boolean,
  ): void {
    if (table.step < this.lastTableStep) {
      this.rolls.clear();
    }
    const stepDelta = Math.max(0, table.step - Math.max(0, this.lastTableStep));
    this.lastTableStep = table.step;
    const radius = worldLengthToCanvas(billiardsPhysics.ballRadius);
    for (const ball of table.balls) {
      const roll = this.updateRoll(ball, stepDelta, reducedMotion);
      if (ball.pocketed) {
        continue;
      }
      const center = worldToCanvas(ball.position);
      drawBallShadow(context, center, radius, ball.velocity);
      if (roll.dirty) {
        renderSpherePixels(roll, ball);
        roll.dirty = false;
      }
      context.drawImage(
        roll.canvas,
        center.x - radius,
        center.y - radius,
        radius * 2,
        radius * 2,
      );
      drawSurfaceMarking(context, center, radius, roll.orientation, ball);
      drawBallOutline(context, center, radius);
    }
  }

  private updateRoll(
    ball: BilliardsBallState,
    stepDelta: number,
    reducedMotion: boolean,
  ): BallRollState {
    const existing = this.rolls.get(ball.id) ?? createRollState(ball);
    const delta = {
      x: ball.position.x - existing.position.x,
      y: ball.position.y - existing.position.y,
    };
    const distance = Math.hypot(delta.x, delta.y);
    const teleported = distance > billiardsPhysics.ballRadius * 4
      || (existing.pocketed && !ball.pocketed);
    if (teleported) {
      existing.orientation = billiardsIdentityQuaternion;
      existing.dirty = true;
    } else if (!reducedMotion && distance > 0.0001) {
      const axis = billiardsNormalizeVector3({ x: -delta.y, y: delta.x, z: 0 });
      const rolling = billiardsAxisAngleQuaternion(
        axis,
        distance / billiardsPhysics.ballRadius,
      );
      existing.orientation = billiardsNormalizeQuaternion(
        billiardsMultiplyQuaternions(rolling, existing.orientation),
      );
      existing.dirty = true;
    }
    if (!reducedMotion && stepDelta > 0 && Math.abs(ball.sideSpin) > 0.001) {
      const sideSpin = billiardsAxisAngleQuaternion(
        { x: 0, y: 0, z: 1 },
        ball.sideSpin * stepDelta * 0.025,
      );
      existing.orientation = billiardsNormalizeQuaternion(
        billiardsMultiplyQuaternions(sideSpin, existing.orientation),
      );
      existing.dirty = true;
    }
    existing.position = { ...ball.position };
    existing.pocketed = ball.pocketed;
    this.rolls.set(ball.id, existing);
    return existing;
  }
}

function createRollState(ball: BilliardsBallState): BallRollState {
  const canvas = document.createElement('canvas');
  canvas.width = sphereTextureSize;
  canvas.height = sphereTextureSize;
  const context = canvas.getContext('2d', { alpha: true });
  if (context === null) {
    throw new Error('Canvas 2D is unavailable for billiards sphere rendering.');
  }
  return {
    position: { ...ball.position },
    orientation: billiardsIdentityQuaternion,
    pocketed: ball.pocketed,
    dirty: true,
    canvas,
    context,
    pixels: context.createImageData(sphereTextureSize, sphereTextureSize),
  };
}

function renderSpherePixels(roll: BallRollState, ball: BilliardsBallState): void {
  const data = roll.pixels.data;
  const inverse = billiardsConjugateQuaternion(roll.orientation);
  const colored = billiardsReadHexColor(ballColor(ball.id));
  const ivory = billiardsReadHexColor('#f5f2e8');
  for (let y = 0; y < sphereTextureSize; y += 1) {
    for (let x = 0; x < sphereTextureSize; x += 1) {
      const nx = (x + 0.5 - sphereHalfSize) / sphereHalfSize;
      const ny = (y + 0.5 - sphereHalfSize) / sphereHalfSize;
      const radiusSquared = nx * nx + ny * ny;
      const offset = (y * sphereTextureSize + x) * 4;
      if (radiusSquared >= 1) {
        data[offset + 3] = 0;
        continue;
      }
      const normal = { x: nx, y: ny, z: Math.sqrt(1 - radiusSquared) };
      const local = billiardsRotateVector(inverse, normal);
      const stripeBlend = ballDisplayKind(ball.kind) === 'stripe'
        ? billiardsSmoothStep(0.39, 0.5, Math.abs(local.y))
        : 0;
      const base = billiardsMixRgb(colored, ivory, stripeBlend);
      const diffuse = Math.max(0, billiardsDotVector3(normal, lightDirection));
      const edgeShade = 0.32 + normal.z * 0.34 + diffuse * 0.44;
      const specular = Math.pow(
        Math.max(0, billiardsDotVector3(normal, halfVector)),
        36,
      ) * 0.92;
      data[offset] = billiardsColorChannel(base[0] * edgeShade + 255 * specular);
      data[offset + 1] = billiardsColorChannel(base[1] * edgeShade + 255 * specular);
      data[offset + 2] = billiardsColorChannel(base[2] * edgeShade + 255 * specular);
      data[offset + 3] = billiardsColorChannel(
        billiardsSmoothStep(1, 0.91, radiusSquared) * 255,
      );
    }
  }
  roll.context.putImageData(roll.pixels, 0, 0);
}

function drawSurfaceMarking(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  orientation: BilliardsSphereQuaternion,
  ball: BilliardsBallState,
): void {
  if (ball.id === billiardsBallIds.cue) {
    drawCueChalkMark(context, center, radius, orientation);
    return;
  }
  const front = billiardsRotateVector(orientation, { x: 0, y: 0, z: 1 });
  const back = billiardsRotateVector(orientation, { x: 0, y: 0, z: -1 });
  const normal = front.z >= back.z ? front : back;
  if (normal.z <= 0.03) {
    return;
  }
  const patchCenter = {
    x: center.x + normal.x * radius * 0.78,
    y: center.y + normal.y * radius * 0.78,
  };
  const patchRadius = radius * 0.4;
  const normalAngle = Math.atan2(normal.y, normal.x);
  context.save();
  context.beginPath();
  context.arc(center.x, center.y, radius * 0.985, 0, fullCircle);
  context.clip();
  context.translate(patchCenter.x, patchCenter.y);
  context.rotate(normalAngle);
  const depthScale = Math.max(0.16, normal.z);
  context.scale(depthScale, 1);
  context.beginPath();
  context.arc(0, 0, patchRadius, 0, fullCircle);
  context.fillStyle = '#fbfaf3';
  context.fill();
  context.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  context.lineWidth = 1;
  context.stroke();
  context.scale(1 / depthScale, 1);
  context.rotate(-normalAngle);
  const up = billiardsRotateVector(orientation, { x: 0, y: -1, z: 0 });
  context.rotate(Math.atan2(up.y, up.x) + Math.PI / 2);
  context.fillStyle = '#101010';
  context.font = `900 ${Math.max(7, patchRadius * 1.22)}px ui-rounded, system-ui`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(ball.id), 0, 0.4);
  context.restore();
}

function drawCueChalkMark(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  orientation: BilliardsSphereQuaternion,
): void {
  const localMark = billiardsNormalizeVector3({ x: 0.25, y: -0.18, z: 0.95 });
  const mark = billiardsRotateVector(orientation, localMark);
  if (mark.z <= 0.08) {
    return;
  }
  context.beginPath();
  context.arc(
    center.x + mark.x * radius * 0.76,
    center.y + mark.y * radius * 0.76,
    radius * 0.085 * Math.max(0.35, mark.z),
    0,
    fullCircle,
  );
  context.fillStyle = 'rgba(78, 142, 171, 0.52)';
  context.fill();
}

function drawBallShadow(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  velocity: Vec2,
): void {
  const speed = Math.hypot(velocity.x, velocity.y);
  const stretch = 1 + Math.min(
    0.22,
    speed / billiardsPhysics.maximumShotSpeed * 0.22,
  );
  const shadow = context.createRadialGradient(
    center.x + billiardsView.ballShadowOffset,
    center.y + radius * 0.55,
    1,
    center.x + billiardsView.ballShadowOffset,
    center.y + radius * 0.55,
    radius * 1.35,
  );
  shadow.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.save();
  context.translate(center.x, center.y + radius * 0.48);
  context.scale(stretch, 0.62);
  context.translate(-center.x, -(center.y + radius * 0.48));
  context.fillStyle = shadow;
  context.beginPath();
  context.arc(center.x, center.y + radius * 0.48, radius * 1.35, 0, fullCircle);
  context.fill();
  context.restore();
}

function drawBallOutline(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
): void {
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, fullCircle);
  context.strokeStyle = 'rgba(0, 0, 0, 0.58)';
  context.lineWidth = 1.2;
  context.stroke();
}
