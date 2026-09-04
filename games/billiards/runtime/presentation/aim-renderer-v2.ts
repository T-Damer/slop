import { billiardsBallIds } from '../domain/registry.ts';
import { isTableAtRest } from '../domain/simulator.ts';
import type {
  BilliardsMatchState,
  BilliardsShotPreview,
  Vec2,
} from '../domain/types.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import { drawBilliardsCue } from './cue-renderer.ts';
import type { BilliardsCueStrikeAnimation } from './effects-renderer.ts';
import {
  billiardsInteractionModes,
  type BilliardsInteractionSnapshot,
} from './interaction-state.ts';
import { billiardsPalette, billiardsView } from './registry.ts';

export function drawBilliardsAim(
  context: CanvasRenderingContext2D,
  match: BilliardsMatchState,
  preview: BilliardsShotPreview,
  angleRadians: number,
  power: number,
  interaction: BilliardsInteractionSnapshot,
): void {
  if (
    match.ballInHand
    || match.activeShot !== null
    || !isTableAtRest(match.table)
  ) {
    return;
  }
  const locked = interaction.mode === billiardsInteractionModes.locked
    || interaction.mode === billiardsInteractionModes.stroking;
  drawGuidePath(
    context,
    preview.cuePath,
    locked ? 'rgba(255, 240, 195, 0.92)' : billiardsPalette.guide,
    locked ? [] : [10, 8],
    locked ? billiardsView.aimGuideWidth + 0.9 : billiardsView.aimGuideWidth,
  );
  drawGuidePath(
    context,
    preview.objectPath,
    locked ? 'rgba(229, 178, 83, 0.86)' : billiardsPalette.objectGuide,
    locked ? [4, 6] : [8, 9],
    billiardsView.aimGuideWidth,
  );
  const impact = preview.cuePath.at(-1);
  if (impact !== undefined && preview.firstCollision !== null) {
    drawImpactTarget(context, impact, locked);
  }
  const cue = match.table.balls.find((ball) =>
    ball.id === billiardsBallIds.cue && !ball.pocketed,
  );
  if (cue === undefined) {
    return;
  }
  const basePullback = 12 + power * 36;
  drawBilliardsCue(context, {
    cuePosition: cue.position,
    angleRadians,
    pullbackPixels: basePullback + interaction.strokePullPixels,
    alpha: 1,
    prepared: locked,
  });
  if (locked) {
    drawAimLock(context, cue.position, angleRadians, interaction);
  }
}

export function drawBilliardsCueStrike(
  context: CanvasRenderingContext2D,
  animation: BilliardsCueStrikeAnimation | null,
): void {
  if (animation === null) {
    return;
  }
  const contactProgress = Math.min(1, animation.progress / 0.44);
  const recoveryProgress = Math.max(0, (animation.progress - 0.44) / 0.56);
  const easedContact = 1 - (1 - contactProgress) ** 3;
  const pullback = (15 + animation.power * 42) * (1 - easedContact)
    + recoveryProgress * 22;
  drawBilliardsCue(context, {
    cuePosition: animation.position,
    angleRadians: animation.angleRadians,
    pullbackPixels: pullback,
    alpha: Math.max(0, 1 - recoveryProgress * 0.82),
    prepared: false,
  });
  if (contactProgress > 0.78 && recoveryProgress < 0.42) {
    drawChalkBurst(
      context,
      animation.position,
      animation.angleRadians,
      animation.power,
      recoveryProgress,
    );
  }
}

function drawGuidePath(
  context: CanvasRenderingContext2D,
  path: ReadonlyArray<Vec2>,
  color: string,
  dash: ReadonlyArray<number>,
  width: number,
): void {
  if (path.length < 2) {
    return;
  }
  context.save();
  context.beginPath();
  const start = worldToCanvas(path[0] ?? { x: 0, y: 0 });
  context.moveTo(start.x, start.y);
  for (const point of path.slice(1)) {
    const canvasPoint = worldToCanvas(point);
    context.lineTo(canvasPoint.x, canvasPoint.y);
  }
  context.setLineDash([...dash]);
  context.lineWidth = width;
  context.strokeStyle = color;
  context.shadowColor = dash.length === 0 ? 'rgba(244, 196, 94, 0.38)' : 'transparent';
  context.shadowBlur = dash.length === 0 ? 7 : 0;
  context.stroke();
  context.restore();
}

function drawImpactTarget(
  context: CanvasRenderingContext2D,
  impact: Vec2,
  locked: boolean,
): void {
  const point = worldToCanvas(impact);
  const gradient = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 19);
  gradient.addColorStop(0, locked
    ? 'rgba(255, 218, 135, 0.64)'
    : 'rgba(246, 235, 205, 0.52)');
  gradient.addColorStop(1, 'rgba(246, 235, 205, 0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(point.x, point.y, 19, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(point.x, point.y, worldLengthToCanvas(2.1), 0, Math.PI * 2);
  context.strokeStyle = locked
    ? 'rgba(255, 211, 116, 0.94)'
    : 'rgba(246, 235, 205, 0.78)';
  context.lineWidth = locked ? 2.6 : 2;
  context.stroke();
}

function drawAimLock(
  context: CanvasRenderingContext2D,
  cuePosition: Vec2,
  angleRadians: number,
  interaction: BilliardsInteractionSnapshot,
): void {
  const center = worldToCanvas(cuePosition);
  const radius = worldLengthToCanvas(4.2)
    + Math.min(8, interaction.strokePullPixels * 0.035);
  context.save();
  context.translate(center.x, center.y);
  context.rotate(angleRadians);
  context.strokeStyle = interaction.mode === billiardsInteractionModes.stroking
    ? 'rgba(255, 178, 77, 0.92)'
    : 'rgba(239, 204, 132, 0.74)';
  context.lineWidth = 2;
  context.setLineDash([5, 5]);
  context.beginPath();
  context.arc(0, 0, radius, -0.72, 0.72);
  context.stroke();
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(-radius - 10, -7);
  context.lineTo(-radius - 3, 0);
  context.lineTo(-radius - 10, 7);
  context.stroke();
  context.restore();
}

function drawChalkBurst(
  context: CanvasRenderingContext2D,
  position: Vec2,
  angleRadians: number,
  power: number,
  recoveryProgress: number,
): void {
  const center = worldToCanvas(position);
  const direction = { x: Math.cos(angleRadians), y: Math.sin(angleRadians) };
  context.save();
  context.globalAlpha = (1 - recoveryProgress) * (0.2 + power * 0.38);
  for (let index = 0; index < 7; index += 1) {
    const spread = (index - 3) * 0.24;
    const distance = 5 + index % 3 * 4 + recoveryProgress * 18;
    const angle = angleRadians + spread;
    context.beginPath();
    context.arc(
      center.x + Math.cos(angle) * distance + direction.x * 3,
      center.y + Math.sin(angle) * distance + direction.y * 3,
      1.2 + (index % 2) * 0.8,
      0,
      Math.PI * 2,
    );
    context.fillStyle = index % 2 === 0 ? '#73b5c4' : '#d8ecef';
    context.fill();
  }
  context.restore();
}
