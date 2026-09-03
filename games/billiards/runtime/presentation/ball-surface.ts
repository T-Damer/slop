import { billiardsBallIds } from '../domain/registry.ts';
import type { BilliardsBallState, Vec2 } from '../domain/types.ts';
import {
  inverseRotateBallVector,
  rotateBallVector,
  type BallQuaternion,
  type BallVector3,
} from './ball-orientation.ts';
import {
  ballColor,
  ballDisplayKind,
  billiardsBallRendering,
} from './registry.ts';

interface RgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

interface SurfaceSample {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly alpha: number;
}

export class BilliardsBallSurfaceRenderer {
  private readonly canvas = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;
  private readonly imageData: ImageData;
  private readonly samples: ReadonlyArray<SurfaceSample>;

  public constructor() {
    const size = billiardsBallRendering.skinSize;
    this.canvas.width = size;
    this.canvas.height = size;
    const context = this.canvas.getContext('2d');
    if (context === null) {
      throw new Error('Canvas 2D is unavailable for billiards ball skins.');
    }
    this.context = context;
    this.imageData = context.createImageData(size, size);
    this.samples = createSurfaceSamples(size);
  }

  public draw(
    context: CanvasRenderingContext2D,
    ball: BilliardsBallState,
    orientation: BallQuaternion,
    center: Vec2,
    radius: number,
  ): void {
    drawContactShadow(context, center, radius);
    this.renderSkin(ball, orientation);
    context.drawImage(
      this.canvas,
      center.x - radius,
      center.y - radius,
      radius * 2,
      radius * 2,
    );
    context.save();
    context.translate(center.x, center.y);
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.clip();
    if (ball.id === billiardsBallIds.cue) {
      drawCueMarks(context, orientation, radius);
    } else {
      drawNumberLabels(context, orientation, ball.id, radius);
    }
    drawFixedHighlight(context, radius);
    context.restore();
    drawOutline(context, center, radius);
  }

  private renderSkin(
    ball: BilliardsBallState,
    orientation: BallQuaternion,
  ): void {
    const data = this.imageData.data;
    const color = parseHexColor(ballColor(ball.id));
    const ivory = parseHexColor('#f4f2e9');
    const stripe = ballDisplayKind(ball.kind) === 'stripe';
    for (let index = 0; index < this.samples.length; index += 1) {
      const sample = this.samples[index] ?? { x: 0, y: 0, z: 0, alpha: 0 };
      const offset = index * 4;
      if (sample.alpha <= 0) {
        data[offset + 3] = 0;
        continue;
      }
      const local = inverseRotateBallVector(orientation, sample);
      const base = stripe && Math.abs(local.y) > billiardsBallRendering.stripeHalfWidth
        ? ivory
        : color;
      const lighting = calculateLighting(sample);
      data[offset] = shadeChannel(base.red, lighting.diffuse, lighting.specular);
      data[offset + 1] = shadeChannel(base.green, lighting.diffuse, lighting.specular);
      data[offset + 2] = shadeChannel(base.blue, lighting.diffuse, lighting.specular);
      data[offset + 3] = Math.round(sample.alpha * 255);
    }
    this.context.putImageData(this.imageData, 0, 0);
  }
}

function createSurfaceSamples(size: number): ReadonlyArray<SurfaceSample> {
  const samples: SurfaceSample[] = [];
  const half = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const normalizedX = (x + 0.5 - half) / half;
      const normalizedY = (y + 0.5 - half) / half;
      const radiusSquared = normalizedX ** 2 + normalizedY ** 2;
      const edge = 1 - radiusSquared;
      samples.push({
        x: normalizedX,
        y: normalizedY,
        z: edge > 0 ? Math.sqrt(edge) : 0,
        alpha: Math.min(1, Math.max(0, edge * half)),
      });
    }
  }
  return samples;
}

function calculateLighting(sample: BallVector3): {
  readonly diffuse: number;
  readonly specular: number;
} {
  const light = billiardsBallRendering.lightDirection;
  const lightDot = Math.max(
    0,
    sample.x * light.x + sample.y * light.y + sample.z * light.z,
  );
  const rim = 1 - sample.z;
  const diffuse = (
    billiardsBallRendering.ambientLight
    + billiardsBallRendering.diffuseLight * lightDot
  ) * (1 - billiardsBallRendering.rimDarkening * rim);
  const halfVector = normalizeVector3({
    x: light.x,
    y: light.y,
    z: light.z + 1,
  });
  const halfDot = Math.max(
    0,
    sample.x * halfVector.x + sample.y * halfVector.y + sample.z * halfVector.z,
  );
  return {
    diffuse,
    specular: Math.pow(halfDot, billiardsBallRendering.specularPower)
      * billiardsBallRendering.specularStrength,
  };
}

function drawNumberLabels(
  context: CanvasRenderingContext2D,
  orientation: BallQuaternion,
  id: number,
  radius: number,
): void {
  drawNumberLabel(context, orientation, id, radius, 1);
  drawNumberLabel(context, orientation, id, radius, -1);
}

function drawNumberLabel(
  context: CanvasRenderingContext2D,
  orientation: BallQuaternion,
  id: number,
  radius: number,
  side: 1 | -1,
): void {
  const normal = rotateBallVector(orientation, { x: 0, y: 0, z: side });
  if (normal.z <= 0.08) {
    return;
  }
  const tangentX = rotateBallVector(orientation, { x: side, y: 0, z: 0 });
  const tangentY = rotateBallVector(orientation, { x: 0, y: 1, z: 0 });
  const patchRadius = radius * billiardsBallRendering.labelAngularRadius;
  const centerScale = radius * billiardsBallRendering.labelCenterRadius;
  context.save();
  context.transform(
    tangentX.x * patchRadius,
    tangentX.y * patchRadius,
    tangentY.x * patchRadius,
    tangentY.y * patchRadius,
    normal.x * centerScale,
    normal.y * centerScale,
  );
  context.beginPath();
  context.arc(0, 0, 1, 0, Math.PI * 2);
  context.fillStyle = '#f8f7ef';
  context.fill();
  context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  context.lineWidth = 0.07;
  context.stroke();
  const fontScale = id >= 10
    ? billiardsBallRendering.labelDoubleDigitFontScale
    : billiardsBallRendering.labelFontScale;
  context.fillStyle = '#101010';
  context.font = `900 ${fontScale}px ui-rounded, system-ui`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(id), 0, 0.06);
  context.restore();
}

function drawCueMarks(
  context: CanvasRenderingContext2D,
  orientation: BallQuaternion,
  radius: number,
): void {
  for (const side of [1, -1] as const) {
    const normal = rotateBallVector(orientation, { x: 0, y: 0, z: side });
    if (normal.z <= 0.08) {
      continue;
    }
    context.beginPath();
    context.arc(
      normal.x * radius * billiardsBallRendering.labelCenterRadius,
      normal.y * radius * billiardsBallRendering.labelCenterRadius,
      radius * billiardsBallRendering.cueMarkRadius * normal.z,
      0,
      Math.PI * 2,
    );
    context.fillStyle = 'rgba(35, 132, 184, 0.82)';
    context.fill();
  }
}

function drawContactShadow(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
): void {
  const config = billiardsBallRendering;
  context.save();
  context.beginPath();
  context.ellipse(
    center.x + radius * config.shadowOffsetX,
    center.y + radius * config.shadowOffsetY,
    radius * config.shadowScaleX,
    radius * config.shadowScaleY,
    0,
    0,
    Math.PI * 2,
  );
  context.fillStyle = `rgba(0, 0, 0, ${config.shadowOpacity})`;
  context.fill();
  context.restore();
}

function drawFixedHighlight(
  context: CanvasRenderingContext2D,
  radius: number,
): void {
  const config = billiardsBallRendering;
  const highlight = context.createRadialGradient(
    radius * config.highlightOffsetX,
    radius * config.highlightOffsetY,
    0,
    radius * config.highlightOffsetX,
    radius * config.highlightOffsetY,
    radius * config.highlightRadius,
  );
  highlight.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
  highlight.addColorStop(0.42, 'rgba(255, 255, 255, 0.18)');
  highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = highlight;
  context.fillRect(-radius, -radius, radius * 2, radius * 2);
}

function drawOutline(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
): void {
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.strokeStyle = 'rgba(0, 0, 0, 0.52)';
  context.lineWidth = billiardsBallRendering.outlineWidth;
  context.stroke();
}

function shadeChannel(value: number, diffuse: number, specular: number): number {
  return Math.round(Math.min(255, Math.max(0, value * diffuse + 255 * specular)));
}

function parseHexColor(value: string): RgbColor {
  const normalized = value.replace('#', '');
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function normalizeVector3(value: BallVector3): BallVector3 {
  const length = Math.hypot(value.x, value.y, value.z);
  return length <= Number.EPSILON
    ? { x: 0, y: 0, z: 1 }
    : { x: value.x / length, y: value.y / length, z: value.z / length };
}
