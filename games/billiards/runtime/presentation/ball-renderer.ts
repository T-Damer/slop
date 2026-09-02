import { billiardsBallIds } from '../domain/registry.ts';
import type { BilliardsBallState } from '../domain/types.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import {
  ballColor,
  ballDisplayKind,
  billiardsView,
} from './registry.ts';

export function drawBilliardsBalls(
  context: CanvasRenderingContext2D,
  balls: ReadonlyArray<BilliardsBallState>,
  reducedMotion: boolean,
): void {
  const radius = worldLengthToCanvas(2.85);
  for (const ball of balls) {
    if (ball.pocketed) {
      continue;
    }
    const center = worldToCanvas(ball.position);
    context.save();
    context.translate(center.x, center.y);
    context.rotate(reducedMotion ? 0 : ball.position.x * 0.045 + ball.position.y * 0.02);
    drawBallShadow(context, radius);
    drawBallBody(context, ball, radius);
    if (ball.id !== billiardsBallIds.cue) {
      drawBallNumber(context, ball.id, radius);
    }
    context.restore();
  }
}

function drawBallShadow(context: CanvasRenderingContext2D, radius: number): void {
  context.beginPath();
  context.ellipse(
    billiardsView.ballShadowOffset,
    billiardsView.ballShadowOffset + radius * 0.35,
    radius * 1.05,
    radius * 0.7,
    0,
    0,
    Math.PI * 2,
  );
  context.fillStyle = 'rgba(0, 0, 0, 0.34)';
  context.fill();
}

function drawBallBody(
  context: CanvasRenderingContext2D,
  ball: BilliardsBallState,
  radius: number,
): void {
  context.save();
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = ballDisplayKind(ball.kind) === 'stripe'
    ? '#f4f2e9'
    : ballColor(ball.id);
  context.fillRect(-radius, -radius, radius * 2, radius * 2);
  if (ballDisplayKind(ball.kind) === 'stripe') {
    context.fillStyle = ballColor(ball.id);
    context.fillRect(-radius, -radius * 0.48, radius * 2, radius * 0.96);
  }
  const shine = context.createRadialGradient(
    -radius * 0.38,
    -radius * 0.46,
    1,
    0,
    0,
    radius * 1.3,
  );
  shine.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
  shine.addColorStop(0.22, 'rgba(255, 255, 255, 0.08)');
  shine.addColorStop(0.74, 'rgba(0, 0, 0, 0)');
  shine.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
  context.fillStyle = shine;
  context.fillRect(-radius, -radius, radius * 2, radius * 2);
  context.restore();
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.strokeStyle = 'rgba(0, 0, 0, 0.48)';
  context.lineWidth = 1.1;
  context.stroke();
}

function drawBallNumber(context: CanvasRenderingContext2D, id: number, radius: number): void {
  context.beginPath();
  context.arc(0, 0, radius * 0.42, 0, Math.PI * 2);
  context.fillStyle = '#f8f7ef';
  context.fill();
  context.fillStyle = '#121212';
  context.font = `900 ${Math.max(8, radius * 0.56)}px ui-rounded, system-ui`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(id), 0, 0.4);
}
