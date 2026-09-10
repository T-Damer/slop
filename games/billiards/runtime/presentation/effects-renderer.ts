import type { Vec2 } from '../domain/types.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import type {
  BilliardsFeedbackBatch,
  BilliardsFeedbackEvent,
} from './feedback.ts';
import {
  billiardsFeedbackKinds,
  billiardsFeedbackTuning,
} from './registry.ts';

interface ImpactEffect {
  readonly position: Vec2;
  readonly intensity: number;
  readonly kind: BilliardsFeedbackEvent['kind'];
  readonly startedAtMs: number;
  readonly seed: number;
}

export interface BilliardsCueStrikeAnimation {
  readonly position: Vec2;
  readonly angleRadians: number;
  readonly power: number;
  readonly progress: number;
}

export interface BilliardsEffectsDebugSnapshot {
  readonly consumedRevision: number;
  readonly activeImpacts: number;
  readonly cueStrikeActive: boolean;
}

export class BilliardsEffectsRenderer {
  private consumedRevision = -1;
  private impacts: ImpactEffect[] = [];
  private cueStrike: {
    readonly position: Vec2;
    readonly angleRadians: number;
    readonly power: number;
    readonly startedAtMs: number;
  } | null = null;

  public consume(batch: BilliardsFeedbackBatch, nowMs: number): void {
    if (batch.revision === this.consumedRevision) {
      return;
    }
    this.consumedRevision = batch.revision;
    for (const event of batch.events) {
      if (
        event.kind === billiardsFeedbackKinds.cue
        && typeof event.angleRadians === 'number'
        && typeof event.power === 'number'
      ) {
        this.cueStrike = {
          position: event.position,
          angleRadians: event.angleRadians,
          power: event.power,
          startedAtMs: nowMs,
        };
      } else {
        this.impacts.push({
          position: event.position,
          intensity: event.intensity,
          kind: event.kind,
          startedAtMs: nowMs,
          seed: (event.primaryBallId ?? 0) * 31 + (event.secondaryBallId ?? 0) * 17,
        });
      }
    }
    this.impacts = this.impacts.slice(-billiardsFeedbackTuning.maximumImpactEffects);
  }

  public cueAnimation(nowMs: number): BilliardsCueStrikeAnimation | null {
    const cueStrike = this.cueStrike;
    if (cueStrike === null) {
      return null;
    }
    const progress = (nowMs - cueStrike.startedAtMs)
      / billiardsFeedbackTuning.cueAnimationDurationMs;
    if (progress >= 1) {
      this.cueStrike = null;
      return null;
    }
    return {
      position: cueStrike.position,
      angleRadians: cueStrike.angleRadians,
      power: cueStrike.power,
      progress: Math.max(0, progress),
    };
  }

  public draw(context: CanvasRenderingContext2D, nowMs: number): void {
    const duration = billiardsFeedbackTuning.impactDurationMs;
    this.impacts = this.impacts.filter((effect) => nowMs - effect.startedAtMs < duration);
    for (const effect of this.impacts) {
      drawImpact(context, effect, nowMs);
    }
  }

  public debugSnapshot(nowMs: number): BilliardsEffectsDebugSnapshot {
    const activeImpacts = this.impacts.filter(
      (effect) => nowMs - effect.startedAtMs < billiardsFeedbackTuning.impactDurationMs,
    ).length;
    const cueStrikeActive = this.cueStrike !== null
      && nowMs - this.cueStrike.startedAtMs < billiardsFeedbackTuning.cueAnimationDurationMs;
    return {
      consumedRevision: this.consumedRevision,
      activeImpacts,
      cueStrikeActive,
    };
  }
}

function drawImpact(
  context: CanvasRenderingContext2D,
  effect: ImpactEffect,
  nowMs: number,
): void {
  const elapsed = nowMs - effect.startedAtMs;
  const progress = Math.min(1, elapsed / billiardsFeedbackTuning.impactDurationMs);
  const center = worldToCanvas(effect.position);
  const pocket = effect.kind === billiardsFeedbackKinds.pocket;
  const cushion = effect.kind === billiardsFeedbackKinds.cushion
    || effect.kind === billiardsFeedbackKinds.jaw;
  const radius = worldLengthToCanvas(
    pocket
      ? 4.4 + progress * 5.4
      : 2.2 + progress * 3.8 * Math.max(0.4, effect.intensity),
  );
  context.save();
  context.globalAlpha = (1 - progress) * (0.18 + effect.intensity * 0.44);
  context.strokeStyle = pocket
    ? '#d8a44f'
    : cushion
      ? '#c6a574'
      : '#f5ead4';
  context.lineWidth = pocket ? 4 : 2.3;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  if (effect.intensity > 0.18) {
    drawImpactDust(context, center, effect, progress, pocket);
  }
  context.restore();
}

function drawImpactDust(
  context: CanvasRenderingContext2D,
  center: Vec2,
  effect: ImpactEffect,
  progress: number,
  pocket: boolean,
): void {
  const count = pocket ? 8 : 5;
  for (let index = 0; index < count; index += 1) {
    const angle = pseudoRandom(effect.seed + index * 23) * Math.PI * 2;
    const distance = (5 + pseudoRandom(effect.seed + index * 41) * 16)
      * (0.35 + progress);
    const size = 0.9 + pseudoRandom(effect.seed + index * 59) * 1.8;
    context.beginPath();
    context.arc(
      center.x + Math.cos(angle) * distance,
      center.y + Math.sin(angle) * distance,
      size,
      0,
      Math.PI * 2,
    );
    context.fillStyle = pocket
      ? 'rgba(211, 160, 78, 0.8)'
      : 'rgba(226, 213, 185, 0.68)';
    context.fill();
  }
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}
