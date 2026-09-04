import type { Vec2 } from '../domain/types.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';

export function drawCueBallPlacementPreview(
  context: CanvasRenderingContext2D,
  position: Vec2,
  valid: boolean,
  pulse: number,
): void {
  const center = worldToCanvas(position);
  const radius = worldLengthToCanvas(2.85);
  const shadow = context.createRadialGradient(
    center.x + radius * 0.3,
    center.y + radius * 0.62,
    radius * 0.12,
    center.x + radius * 0.3,
    center.y + radius * 0.62,
    radius * 1.35,
  );
  shadow.addColorStop(0, 'rgba(0, 0, 0, 0.33)');
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.save();
  context.fillStyle = shadow;
  context.beginPath();
  context.ellipse(
    center.x + radius * 0.25,
    center.y + radius * 0.62,
    radius * 1.18,
    radius * 0.62,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.globalAlpha = valid ? 0.54 : 0.38;
  const body = context.createRadialGradient(
    center.x - radius * 0.32,
    center.y - radius * 0.4,
    radius * 0.08,
    center.x,
    center.y,
    radius,
  );
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.52, '#f2efe4');
  body.addColorStop(1, valid ? '#b9c5bc' : '#c48d88');
  context.fillStyle = body;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.72;
  context.lineWidth = 2.2;
  context.strokeStyle = valid ? '#9de3b1' : '#ff8175';
  context.beginPath();
  context.arc(
    center.x,
    center.y,
    radius * (1.25 + pulse * 0.08),
    0,
    Math.PI * 2,
  );
  context.stroke();
  context.setLineDash([4, 5]);
  context.globalAlpha = 0.42;
  context.beginPath();
  context.arc(
    center.x,
    center.y,
    radius * (1.62 + pulse * 0.12),
    0,
    Math.PI * 2,
  );
  context.stroke();
  context.restore();
}
