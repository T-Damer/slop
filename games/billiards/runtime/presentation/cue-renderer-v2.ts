import type { Vec2 } from '../domain/types.ts';
import type { BilliardsQualityMode } from './adaptive-quality-v2.ts';
import { billiardsQualityModes } from './adaptive-quality-v2.ts';
import { worldToCanvas } from './coordinates.ts';
import type { BilliardsCueStrikeAnimation } from './effects-renderer.ts';
import {
  billiardsInteractionModes,
  type BilliardsInteractionState,
} from './interaction-state-v2.ts';
import { billiardsView } from './registry.ts';
import type { BilliardsTableSkinV2 } from './table-skins-v2.ts';

export interface BilliardsCueRenderOptionsV2 {
  readonly cueBallPosition: Vec2;
  readonly angleRadians: number;
  readonly power: number;
  readonly interaction: BilliardsInteractionState;
  readonly skin: BilliardsTableSkinV2;
  readonly quality: BilliardsQualityMode;
}

export function drawBilliardsCueV2(
  context: CanvasRenderingContext2D,
  options: BilliardsCueRenderOptionsV2,
): void {
  const locked = options.interaction.mode === billiardsInteractionModes.aimLocked
    || options.interaction.mode === billiardsInteractionModes.manualStroke;
  const strokeOffset = options.interaction.stroke?.cueOffset ?? 0;
  const preparedOffset = locked ? 13 + options.power * 15 : 0;
  drawCueBody(
    context,
    options.cueBallPosition,
    options.angleRadians,
    preparedOffset + strokeOffset,
    locked ? 1 : 0.84,
    options.skin,
    options.quality,
  );
  if (locked) drawPreparedCueFocus(context, options.cueBallPosition, options.angleRadians);
}

export function drawBilliardsCueStrikeV2(
  context: CanvasRenderingContext2D,
  animation: BilliardsCueStrikeAnimation | null,
  skin: BilliardsTableSkinV2,
  quality: BilliardsQualityMode,
): void {
  if (animation === null) return;
  const contact = Math.min(1, animation.progress / 0.44);
  const recovery = Math.max(0, (animation.progress - 0.44) / 0.56);
  const pullback = (16 + animation.power * 45) * (1 - easeOutCubic(contact))
    + recovery * 24;
  drawCueBody(
    context,
    animation.position,
    animation.angleRadians,
    pullback,
    Math.max(0, 1 - recovery * 0.84),
    skin,
    quality,
  );
  if (quality !== billiardsQualityModes.low && contact > 0.78 && recovery < 0.45) {
    drawChalkDust(context, animation.position, animation.angleRadians, recovery);
  }
}

function drawCueBody(
  context: CanvasRenderingContext2D,
  cueBallPosition: Vec2,
  angleRadians: number,
  pullbackPixels: number,
  alpha: number,
  skin: BilliardsTableSkinV2,
  quality: BilliardsQualityMode,
): void {
  const cue = worldToCanvas(cueBallPosition);
  const direction = { x: Math.cos(angleRadians), y: Math.sin(angleRadians) };
  const nearDistance = billiardsView.cueGap + pullbackPixels;
  const farDistance = nearDistance + billiardsView.cueLength;
  const near = subtractDirection(cue, direction, nearDistance);
  const far = subtractDirection(cue, direction, farDistance);
  const center = { x: (near.x + far.x) / 2, y: (near.y + far.y) / 2 };
  const lightStrength = roomLightStrength(context, center, skin);

  context.save();
  context.globalAlpha = alpha;
  context.lineCap = 'round';
  drawCueShadow(context, near, far, quality);
  drawCueShaft(context, near, far, skin, lightStrength);
  drawCueButt(context, near, far, direction, skin, lightStrength);
  drawCueHardware(context, near, direction, skin);
  if (quality !== billiardsQualityModes.low) {
    drawCueGrain(context, near, far, direction, skin, lightStrength);
  }
  context.restore();
}

function drawCueShadow(
  context: CanvasRenderingContext2D,
  near: Vec2,
  far: Vec2,
  quality: BilliardsQualityMode,
): void {
  context.strokeStyle = quality === billiardsQualityModes.low
    ? 'rgba(0, 0, 0, 0.28)'
    : 'rgba(0, 0, 0, 0.5)';
  context.lineWidth = quality === billiardsQualityModes.low ? 9 : 13;
  context.beginPath();
  context.moveTo(near.x + 5, near.y + 6);
  context.lineTo(far.x + 5, far.y + 6);
  context.stroke();
}

function drawCueShaft(
  context: CanvasRenderingContext2D,
  near: Vec2,
  far: Vec2,
  skin: BilliardsTableSkinV2,
  lightStrength: number,
): void {
  const gradient = context.createLinearGradient(near.x, near.y, far.x, far.y);
  gradient.addColorStop(0, mixColor(skin.cue.shaftLight, '#fff1ca', lightStrength * 0.3));
  gradient.addColorStop(0.34, skin.cue.shaftMid);
  gradient.addColorStop(0.72, skin.cue.shaftDark);
  gradient.addColorStop(1, skin.cue.buttDark);
  context.strokeStyle = gradient;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(near.x, near.y);
  context.lineTo(far.x, far.y);
  context.stroke();
}

function drawCueButt(
  context: CanvasRenderingContext2D,
  near: Vec2,
  far: Vec2,
  direction: Vec2,
  skin: BilliardsTableSkinV2,
  lightStrength: number,
): void {
  const buttStart = {
    x: near.x + (far.x - near.x) * 0.62,
    y: near.y + (far.y - near.y) * 0.62,
  };
  const gradient = context.createLinearGradient(buttStart.x, buttStart.y, far.x, far.y);
  gradient.addColorStop(0, mixColor(skin.cue.buttLight, '#e1a467', lightStrength * 0.22));
  gradient.addColorStop(0.58, skin.cue.wrap);
  gradient.addColorStop(1, skin.cue.buttDark);
  context.strokeStyle = gradient;
  context.lineWidth = 12;
  context.beginPath();
  context.moveTo(buttStart.x, buttStart.y);
  context.lineTo(far.x, far.y);
  context.stroke();
  context.strokeStyle = 'rgba(245, 216, 170, 0.28)';
  context.lineWidth = 1.3;
  context.beginPath();
  context.moveTo(
    buttStart.x - direction.y * 3,
    buttStart.y + direction.x * 3,
  );
  context.lineTo(far.x - direction.y * 3, far.y + direction.x * 3);
  context.stroke();
}

function drawCueHardware(
  context: CanvasRenderingContext2D,
  near: Vec2,
  direction: Vec2,
  skin: BilliardsTableSkinV2,
): void {
  context.strokeStyle = skin.cue.ferrule;
  context.lineWidth = 9;
  context.beginPath();
  context.moveTo(near.x, near.y);
  context.lineTo(near.x - direction.x * 8, near.y - direction.y * 8);
  context.stroke();
  context.strokeStyle = skin.cue.tip;
  context.lineWidth = 10;
  context.beginPath();
  context.moveTo(near.x, near.y);
  context.lineTo(near.x + direction.x * 4, near.y + direction.y * 4);
  context.stroke();
}

function drawCueGrain(
  context: CanvasRenderingContext2D,
  near: Vec2,
  far: Vec2,
  direction: Vec2,
  skin: BilliardsTableSkinV2,
  lightStrength: number,
): void {
  context.strokeStyle = `rgba(68, 31, 14, ${0.12 + lightStrength * 0.09})`;
  context.lineWidth = 0.8;
  const normal = { x: -direction.y, y: direction.x };
  for (let index = 1; index <= 4; index += 1) {
    const offset = (index - 2.5) * 1.25;
    const phase = (index * skin.cue.grainFrequency) % 13;
    context.beginPath();
    for (let step = 0; step <= 14; step += 1) {
      const ratio = step / 14;
      const wave = Math.sin(ratio * Math.PI * 5 + phase) * 0.8;
      const point = {
        x: near.x + (far.x - near.x) * ratio + normal.x * (offset + wave),
        y: near.y + (far.y - near.y) * ratio + normal.y * (offset + wave),
      };
      if (step === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.stroke();
  }
}

function drawPreparedCueFocus(
  context: CanvasRenderingContext2D,
  position: Vec2,
  angleRadians: number,
): void {
  const center = worldToCanvas(position);
  const direction = { x: Math.cos(angleRadians), y: Math.sin(angleRadians) };
  context.save();
  context.strokeStyle = 'rgba(239, 193, 105, 0.78)';
  context.lineWidth = 2;
  context.setLineDash([5, 5]);
  context.beginPath();
  context.arc(center.x, center.y, 27, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(center.x - direction.y * 19, center.y + direction.x * 19);
  context.lineTo(center.x + direction.y * 19, center.y - direction.x * 19);
  context.stroke();
  context.restore();
}

function drawChalkDust(
  context: CanvasRenderingContext2D,
  position: Vec2,
  angleRadians: number,
  recovery: number,
): void {
  const center = worldToCanvas(position);
  context.save();
  context.globalAlpha = (1 - recovery) * 0.42;
  context.fillStyle = '#95c6d1';
  for (let index = 0; index < 6; index += 1) {
    const angle = angleRadians + (index - 2.5) * 0.21;
    const distance = 4 + index * 2.2 + recovery * 14;
    context.beginPath();
    context.arc(
      center.x + Math.cos(angle) * distance,
      center.y + Math.sin(angle) * distance,
      1 + index % 2 * 0.6,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
}

function roomLightStrength(
  context: CanvasRenderingContext2D,
  position: Vec2,
  skin: BilliardsTableSkinV2,
): number {
  const x = position.x / context.canvas.width;
  const y = position.y / context.canvas.height;
  const distance = Math.hypot(x - skin.light.x, y - skin.light.y);
  return Math.max(skin.light.ambient, 1 - distance * 1.35);
}

function subtractDirection(origin: Vec2, direction: Vec2, distance: number): Vec2 {
  return {
    x: origin.x - direction.x * distance,
    y: origin.y - direction.y * distance,
  };
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

function mixColor(left: string, right: string, ratio: number): string {
  const a = parseHex(left);
  const b = parseHex(right);
  const amount = Math.max(0, Math.min(1, ratio));
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * amount)}, ${Math.round(a[1] + (b[1] - a[1]) * amount)}, ${Math.round(a[2] + (b[2] - a[2]) * amount)})`;
}

function parseHex(value: string): readonly [number, number, number] {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  return match === null
    ? [128, 128, 128]
    : [
        Number.parseInt(match[1] ?? '80', 16),
        Number.parseInt(match[2] ?? '80', 16),
        Number.parseInt(match[3] ?? '80', 16),
      ];
}
