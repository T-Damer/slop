import type { BilliardsShotPreview, Vec2 } from '../domain/types.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import {
  billiardsInteractionModes,
  type BilliardsInteractionState,
} from './interaction-state-v2.ts';
import { billiardsPalette, billiardsView } from './registry.ts';

export function drawBilliardsGuideV2(
  context: CanvasRenderingContext2D,
  preview: BilliardsShotPreview,
  interaction: BilliardsInteractionState,
): void {
  const locked = interaction.mode === billiardsInteractionModes.aimLocked
    || interaction.mode === billiardsInteractionModes.manualStroke;
  drawGuidePath(
    context,
    preview.cuePath,
    locked ? 'rgba(248, 232, 194, 0.94)' : billiardsPalette.guide,
    locked ? [] : [10, 8],
    locked ? billiardsView.aimGuideWidth + 1.2 : billiardsView.aimGuideWidth,
  );
  drawGuidePath(
    context,
    preview.objectPath,
    locked ? 'rgba(240, 184, 81, 0.86)' : billiardsPalette.objectGuide,
    locked ? [3, 5] : [8, 9],
    locked ? 2.4 : billiardsView.aimGuideWidth,
  );
  const impact = preview.cuePath.at(-1);
  if (impact !== undefined && preview.firstCollision !== null) {
    drawImpactMarker(context, impact, locked);
  }
}

function drawGuidePath(
  context: CanvasRenderingContext2D,
  path: ReadonlyArray<Vec2>,
  color: string,
  dash: ReadonlyArray<number>,
  width: number,
): void {
  if (path.length < 2) return;
  const start = path[0];
  if (start === undefined) return;
  context.save();
  context.beginPath();
  const canvasStart = worldToCanvas(start);
  context.moveTo(canvasStart.x, canvasStart.y);
  for (const point of path.slice(1)) {
    const canvasPoint = worldToCanvas(point);
    context.lineTo(canvasPoint.x, canvasPoint.y);
  }
  context.setLineDash([...dash]);
  context.lineWidth = width;
  context.strokeStyle = color;
  context.shadowColor = color;
  context.shadowBlur = dash.length === 0 ? 8 : 0;
  context.stroke();
  context.restore();
}

function drawImpactMarker(
  context: CanvasRenderingContext2D,
  impact: Vec2,
  locked: boolean,
): void {
  const point = worldToCanvas(impact);
  const radius = worldLengthToCanvas(2.1);
  context.save();
  const gradient = context.createRadialGradient(
    point.x,
    point.y,
    0,
    point.x,
    point.y,
    locked ? 27 : 19,
  );
  gradient.addColorStop(0, locked
    ? 'rgba(255, 215, 137, 0.72)'
    : 'rgba(246, 235, 205, 0.5)');
  gradient.addColorStop(1, 'rgba(246, 235, 205, 0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(point.x, point.y, locked ? 27 : 19, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = locked
    ? 'rgba(255, 205, 105, 0.94)'
    : 'rgba(246, 235, 205, 0.76)';
  context.lineWidth = locked ? 3 : 2;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
