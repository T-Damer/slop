import { billiardsBallIds } from '../domain/registry.ts';
import { isTableAtRest } from '../domain/simulator.ts';
import type {
  BilliardsMatchState,
  BilliardsShotPreview,
  Vec2,
} from '../domain/types.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import { billiardsPalette, billiardsView } from './registry.ts';

export function drawBilliardsAim(
  context: CanvasRenderingContext2D,
  match: BilliardsMatchState,
  preview: BilliardsShotPreview,
  angleRadians: number,
  power: number,
): void {
  if (match.activeShot !== null || !isTableAtRest(match.table)) {
    return;
  }
  drawGuidePath(context, preview.cuePath, billiardsPalette.guide, [10, 8]);
  drawGuidePath(context, preview.objectPath, billiardsPalette.objectGuide, [8, 9]);
  const impact = preview.cuePath.at(-1);
  if (impact !== undefined && preview.firstCollision !== null) {
    const point = worldToCanvas(impact);
    context.beginPath();
    context.arc(point.x, point.y, worldLengthToCanvas(2.1), 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 255, 255, 0.42)';
    context.fill();
  }
  drawCue(context, match, angleRadians, power);
}

function drawGuidePath(
  context: CanvasRenderingContext2D,
  path: ReadonlyArray<Vec2>,
  color: string,
  dash: ReadonlyArray<number>,
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
  context.lineWidth = billiardsView.aimGuideWidth;
  context.strokeStyle = color;
  context.stroke();
  context.restore();
}

function drawCue(
  context: CanvasRenderingContext2D,
  match: BilliardsMatchState,
  angleRadians: number,
  power: number,
): void {
  const cue = match.table.balls.find((ball) =>
    ball.id === billiardsBallIds.cue && !ball.pocketed,
  );
  if (cue === undefined) {
    return;
  }
  const cuePoint = worldToCanvas(cue.position);
  const direction = { x: Math.cos(angleRadians), y: Math.sin(angleRadians) };
  const pullback = 12 + power * 36;
  const near = billiardsView.cueGap + pullback;
  const far = near + billiardsView.cueLength;
  const start = {
    x: cuePoint.x - direction.x * near,
    y: cuePoint.y - direction.y * near,
  };
  const end = {
    x: cuePoint.x - direction.x * far,
    y: cuePoint.y - direction.y * far,
  };
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = 'rgba(0, 0, 0, 0.42)';
  context.lineWidth = 11;
  context.beginPath();
  context.moveTo(start.x + 4, start.y + 5);
  context.lineTo(end.x + 4, end.y + 5);
  context.stroke();
  const cueGradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
  cueGradient.addColorStop(0, '#f0dbc0');
  cueGradient.addColorStop(0.48, '#bb7b42');
  cueGradient.addColorStop(1, '#412316');
  context.strokeStyle = cueGradient;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.strokeStyle = '#2a8ec1';
  context.lineWidth = 9;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(start.x - direction.x * 8, start.y - direction.y * 8);
  context.stroke();
  context.restore();
}
