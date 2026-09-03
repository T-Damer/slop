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
        && event.angleRadians !== null
        && event.power !== null
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
  const radius = worldLengthToCanvas(
    pocket
      ? 4.4 + progress * 5.4
      : 2.2 + progress * 3.8 * Math.max(0.4, effect.intensity),
  );
  context.save();
  context.globalAlpha = (1 - progress) * (0.22 + effect.intensity * 0.42);
  context.strokeStyle = pocket ? '#f5c35b' : '#ffffff';
  context.lineWidth = pocket ? 4 : 2.5;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
