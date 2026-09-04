import { billiardsPhysics } from '../domain/registry.ts';
import type { BilliardsBallState, BilliardsTableState, Vec2 } from '../domain/types.ts';
import type { BilliardsQualityMode } from './adaptive-quality-v2.ts';
import { billiardsQualityModes } from './adaptive-quality-v2.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import { ballColor, ballDisplayKind } from './registry.ts';
import type { BilliardsTableSkinV2 } from './table-skins-v2.ts';

interface RollingState {
  position: Vec2;
  rollX: number;
  rollY: number;
  step: number;
}

export interface BilliardsBallRenderDebugV2 {
  readonly rollingBallCount: number;
  readonly litBallCount: number;
}

export class BilliardsBallRendererV2 {
  private readonly rolling = new Map<number, RollingState>();
  private rollingBallCount = 0;
  private litBallCount = 0;

  public draw(
    context: CanvasRenderingContext2D,
    table: BilliardsTableState,
    skin: BilliardsTableSkinV2,
    quality: BilliardsQualityMode,
    hideCue = false,
  ): void {
    this.updateRolling(table);
    this.rollingBallCount = 0;
    this.litBallCount = 0;
    const radius = worldLengthToCanvas(billiardsPhysics.ballRadius);
    for (const ball of table.balls) {
      if (ball.pocketed || (hideCue && ball.id === 0)) continue;
      const state = this.rolling.get(ball.id);
      this.drawBall(context, ball, state, radius, skin, quality, 1);
      if (Math.hypot(ball.velocity.x, ball.velocity.y) > 0.05) {
        this.rollingBallCount += 1;
      }
      this.litBallCount += 1;
    }
  }

  public drawPlacementPreview(
    context: CanvasRenderingContext2D,
    position: Vec2,
    valid: boolean,
    skin: BilliardsTableSkinV2,
  ): void {
    const radius = worldLengthToCanvas(billiardsPhysics.ballRadius);
    const ball: BilliardsBallState = {
      id: 0,
      kind: 'cue',
      position,
      velocity: { x: 0, y: 0 },
      sideSpin: 0,
      followSpin: 0,
      pocketed: false,
    };
    context.save();
    context.globalAlpha = valid ? 0.58 : 0.34;
    this.drawBall(
      context,
      ball,
      undefined,
      radius,
      skin,
      billiardsQualityModes.balanced,
      1,
    );
    const center = worldToCanvas(position);
    context.globalAlpha = 0.9;
    context.strokeStyle = valid ? '#91e4af' : '#ff8f7d';
    context.lineWidth = 3;
    context.setLineDash([7, 5]);
    context.beginPath();
    context.arc(center.x, center.y, radius + 7, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  public reset(): void {
    this.rolling.clear();
  }

  public debugSnapshot(): BilliardsBallRenderDebugV2 {
    return {
      rollingBallCount: this.rollingBallCount,
      litBallCount: this.litBallCount,
    };
  }

  private updateRolling(table: BilliardsTableState): void {
    const activeIds = new Set<number>();
    for (const ball of table.balls) {
      if (ball.pocketed) continue;
      activeIds.add(ball.id);
      const previous = this.rolling.get(ball.id);
      if (previous === undefined || table.step < previous.step) {
        this.rolling.set(ball.id, {
          position: { ...ball.position },
          rollX: 0,
          rollY: 0,
          step: table.step,
        });
        continue;
      }
      if (previous.step === table.step) continue;
      const dx = ball.position.x - previous.position.x;
      const dy = ball.position.y - previous.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance < billiardsPhysics.ballRadius * 8) {
        previous.rollX += dy / billiardsPhysics.ballRadius;
        previous.rollY -= dx / billiardsPhysics.ballRadius;
      } else {
        previous.rollX = 0;
        previous.rollY = 0;
      }
      previous.position = { ...ball.position };
      previous.step = table.step;
    }
    for (const id of this.rolling.keys()) {
      if (!activeIds.has(id)) this.rolling.delete(id);
    }
  }

  private drawBall(
    context: CanvasRenderingContext2D,
    ball: BilliardsBallState,
    rolling: RollingState | undefined,
    radius: number,
    skin: BilliardsTableSkinV2,
    quality: BilliardsQualityMode,
    alpha: number,
  ): void {
    const center = worldToCanvas(ball.position);
    drawContactShadow(context, center, radius, quality, alpha);
    context.save();
    context.globalAlpha *= alpha;
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.clip();
    drawBaseSphere(context, center, radius, ballColor(ball.id), skin, quality);
    if (ballDisplayKind(ball.kind) === 'stripe') {
      drawStripe(context, center, radius, rolling, ballColor(ball.id));
    }
    drawNumberPatch(context, center, radius, ball.id, rolling, quality);
    drawSphereFinish(context, center, radius, skin, quality);
    context.restore();
  }
}

function drawContactShadow(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  quality: BilliardsQualityMode,
  alpha: number,
): void {
  context.save();
  context.globalAlpha *= alpha * (quality === billiardsQualityModes.low ? 0.28 : 0.46);
  context.fillStyle = '#000';
  context.beginPath();
  context.ellipse(
    center.x + radius * 0.22,
    center.y + radius * 0.42,
    radius * 0.92,
    radius * 0.45,
    -0.18,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function drawBaseSphere(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  color: string,
  skin: BilliardsTableSkinV2,
  quality: BilliardsQualityMode,
): void {
  const lightX = context.canvas.width * skin.light.x;
  const lightY = context.canvas.height * skin.light.y;
  const directionX = clamp((lightX - center.x) / context.canvas.width, -1, 1);
  const directionY = clamp((lightY - center.y) / context.canvas.height, -1, 1);
  const highlightX = center.x + directionX * radius * 0.72;
  const highlightY = center.y + directionY * radius * 0.72;
  const gradient = context.createRadialGradient(
    highlightX,
    highlightY,
    radius * 0.08,
    center.x,
    center.y,
    radius * 1.18,
  );
  gradient.addColorStop(0, quality === billiardsQualityModes.low ? '#fff' : '#fff9e9');
  gradient.addColorStop(0.11, color);
  gradient.addColorStop(0.62, color);
  gradient.addColorStop(1, '#050505');
  context.fillStyle = gradient;
  context.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
}

function drawStripe(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  rolling: RollingState | undefined,
  color: string,
): void {
  const angle = rolling === undefined ? 0 : rolling.rollY * 0.46 - rolling.rollX * 0.28;
  context.save();
  context.translate(center.x, center.y);
  context.rotate(angle);
  context.fillStyle = '#eee9da';
  context.fillRect(-radius * 1.5, -radius * 0.42, radius * 3, radius * 0.84);
  context.fillStyle = color;
  context.globalAlpha *= 0.92;
  context.fillRect(-radius * 1.5, -radius * 0.25, radius * 3, radius * 0.5);
  context.restore();
}

function drawNumberPatch(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  id: number,
  rolling: RollingState | undefined,
  quality: BilliardsQualityMode,
): void {
  if (id === 0 && quality === billiardsQualityModes.low) return;
  const rollX = rolling?.rollX ?? 0;
  const rollY = rolling?.rollY ?? 0;
  const surfaceX = Math.sin(rollY) * Math.cos(rollX);
  const surfaceY = -Math.sin(rollX);
  const surfaceZ = Math.cos(rollX) * Math.cos(rollY);
  if (surfaceZ < -0.14) return;
  const scale = 0.34 + Math.max(0, surfaceZ) * 0.66;
  const x = center.x + surfaceX * radius * 0.62;
  const y = center.y + surfaceY * radius * 0.62;
  const patchRadius = radius * 0.42 * scale;
  context.fillStyle = '#f4efe2';
  context.beginPath();
  context.ellipse(x, y, patchRadius, patchRadius * Math.max(0.25, scale), 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#111';
  context.font = `900 ${Math.max(8, patchRadius * 1.16)}px ui-sans-serif, system-ui`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(id === 0 ? '•' : String(id), x, y + 0.4);
}

function drawSphereFinish(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  skin: BilliardsTableSkinV2,
  quality: BilliardsQualityMode,
): void {
  context.strokeStyle = 'rgba(0, 0, 0, 0.58)';
  context.lineWidth = Math.max(1, radius * 0.1);
  context.beginPath();
  context.arc(center.x, center.y, radius * 0.96, 0, Math.PI * 2);
  context.stroke();
  if (quality === billiardsQualityModes.low) return;
  const glow = context.createRadialGradient(
    center.x - radius * 0.42,
    center.y - radius * 0.48,
    0,
    center.x - radius * 0.35,
    center.y - radius * 0.42,
    radius * (0.42 + skin.light.specular * 0.2),
  );
  glow.addColorStop(0, `rgba(255, 247, 221, ${0.58 * skin.light.specular})`);
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = glow;
  context.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
