import { billiardsCollisionKinds } from '../domain/registry.ts';
import { billiardsTableModel } from '../domain/table-model.ts';
import type {
  BilliardsCollisionEvent,
  BilliardsMatchState,
  Vec2,
} from '../domain/types.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';

interface ImpactEffect {
  readonly point: Vec2;
  readonly kind: BilliardsCollisionEvent['kind'];
  readonly bornStep: number;
}

const effectLifeSteps = 22;
const maximumEffects = 24;

export class BilliardsImpactRenderer {
  private effects: ImpactEffect[] = [];

  public draw(
    context: CanvasRenderingContext2D,
    match: BilliardsMatchState,
    events: ReadonlyArray<BilliardsCollisionEvent>,
  ): void {
    this.effects.push(...events.flatMap((event) => {
      const point = collisionPoint(match, event);
      return point === null ? [] : [{ point, kind: event.kind, bornStep: match.table.step }];
    }));
    if (this.effects.length > maximumEffects) {
      this.effects = this.effects.slice(-maximumEffects);
    }
    this.effects = this.effects.filter((effect) =>
      match.table.step - effect.bornStep <= effectLifeSteps,
    );
    for (const effect of this.effects) {
      drawEffect(context, effect, match.table.step);
    }
  }
}

function collisionPoint(
  match: BilliardsMatchState,
  event: BilliardsCollisionEvent,
): Vec2 | null {
  if (event.kind === billiardsCollisionKinds.ball) {
    const left = match.table.balls.find((ball) => ball.id === event.leftBallId);
    const right = match.table.balls.find((ball) => ball.id === event.rightBallId);
    return left === undefined || right === undefined
      ? null
      : {
        x: (left.position.x + right.position.x) / 2,
        y: (left.position.y + right.position.y) / 2,
      };
  }
  if (event.kind === billiardsCollisionKinds.pocket) {
    return billiardsTableModel.pockets.find((pocket) => pocket.id === event.pocketId)?.center
      ?? null;
  }
  const ball = match.table.balls.find((candidate) => candidate.id === event.ballId);
  return ball?.position ?? null;
}

function drawEffect(
  context: CanvasRenderingContext2D,
  effect: ImpactEffect,
  tableStep: number,
): void {
  const age = Math.max(0, tableStep - effect.bornStep);
  const progress = Math.min(1, age / effectLifeSteps);
  const center = worldToCanvas(effect.point);
  const isPocket = effect.kind === billiardsCollisionKinds.pocket;
  const isBall = effect.kind === billiardsCollisionKinds.ball;
  const baseRadius = worldLengthToCanvas(isPocket ? 4.8 : 2.8);
  const radius = baseRadius * (0.8 + progress * 1.8);
  context.save();
  context.globalAlpha = (1 - progress) * (isPocket ? 0.85 : 0.62);
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.strokeStyle = isPocket
    ? '#f7c85c'
    : isBall
      ? '#ecf8ff'
      : '#9fd2bd';
  context.lineWidth = Math.max(1, 3 * (1 - progress));
  context.stroke();
  if (age <= 4) {
    context.beginPath();
    context.arc(center.x, center.y, baseRadius * 0.44, 0, Math.PI * 2);
    context.fillStyle = isPocket ? '#f7c85c' : '#ffffff';
    context.fill();
  }
  context.restore();
}
