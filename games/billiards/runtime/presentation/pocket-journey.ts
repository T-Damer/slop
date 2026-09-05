import { prefersReducedMotion } from '../../../shared/game-shell/graphics-settings.ts';
import { tableModelFor } from '../domain/table-model.ts';
import type { BilliardsMatchState, Vec2 } from '../domain/types.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import type { BilliardsFeedbackBatch } from './feedback.ts';
import type { BilliardsViewElements } from './view-elements.ts';

export const pocketMotion = { sinkMs: 380, returnMs: 440, rollRadians: 1.2, returnDistance: 30, maximum: 16 } as const;
interface Journey {
  readonly id: number; readonly shooter: 0 | 1; readonly from: Vec2; readonly to: Vec2;
  readonly started: number; readonly radius: number; readonly sprite: HTMLCanvasElement | null;
  delivered: boolean;
}
/** Cosmetic timeline only. Counts/ownership come from the domain, including foul pots. */
export class BilliardsPocketJourney {
  private consumed = -1;
  private journeys = new Map<number, Journey>();
  private animations = new Set<Animation>();
  private revision = -1;
  private deliveredCount = 0;

  public consume(batch: BilliardsFeedbackBatch, match: BilliardsMatchState, now: number,
    sprite: (id: number) => HTMLCanvasElement | null): void {
    if (batch.revision <= this.consumed) return;
    this.consumed = batch.revision;
    const model = tableModelFor(match.table);
    for (const event of batch.events) {
      if (event.kind !== 'pocket-drop' || event.primaryBallId === undefined || event.shooterIndex === undefined) continue;
      const pocket = model.pockets.find((entry) => entry.id === event.pocketId);
      if (!pocket || (event.primaryBallId !== 0 && this.journeys.has(event.primaryBallId))) continue;
      this.journeys.set(event.primaryBallId, { id: event.primaryBallId, shooter: event.shooterIndex,
        from: worldToCanvas(event.position), to: worldToCanvas(pocket.center), started: now,
        radius: worldLengthToCanvas(model.ballRadius), sprite: sprite(event.primaryBallId), delivered: false });
    }
  }

  public synchronize(match: BilliardsMatchState, view: BilliardsViewElements, now: number): void {
    if (this.revision !== match.revision && match.table.step === 0 && match.activeShot === null) this.clear(view);
    this.revision = match.revision;
    for (const journey of this.journeys.values()) {
      if (journey.delivered || journey.id === 0) continue; // A scratch never becomes a HUD reward.
      const ball = match.table.balls.find((entry) => entry.id === journey.id);
      if (!ball?.pocketed || ball.pocketedBy !== journey.shooter) continue;
      const slot = view.pocketSlots[journey.shooter][journey.id - 1];
      if (!slot || slot.hidden) continue;
      if (!prefersReducedMotion() && now - journey.started < pocketMotion.sinkMs) {
        slot.dataset.returnPending = 'true'; continue;
      }
      delete slot.dataset.returnPending; journey.delivered = true; this.deliveredCount += 1;
      if (prefersReducedMotion()) continue;
      const direction = journey.shooter === 0 ? 1 : -1;
      const animation = slot.animate([
        { transform: `translateX(${direction * pocketMotion.returnDistance}px) rotate(${direction * 180}deg) scale(.55)`, opacity: 0 },
        { transform: 'translateX(0) rotate(0deg) scale(1)', opacity: 1 },
      ], { duration: pocketMotion.returnMs, easing: 'cubic-bezier(.16,.8,.25,1)' });
      this.animations.add(animation);
      animation.onfinish = animation.oncancel = () => { this.animations.delete(animation); };
    }
  }

  public draw(context: CanvasRenderingContext2D, now: number): void {
    if (prefersReducedMotion()) return;
    for (const journey of this.journeys.values()) {
      const t = Math.max(0, (now - journey.started) / pocketMotion.sinkMs);
      if (t >= 1) continue;
      const travel = 1 - (1 - t) ** 2;
      const x = journey.from.x + (journey.to.x - journey.from.x) * travel;
      const y = journey.from.y + (journey.to.y - journey.from.y) * travel;
      const radius = journey.radius * (1 - 0.88 * t * t);
      context.save();
      context.globalAlpha = (1 - t) ** 0.7;
      context.translate(x, y); context.rotate(t * pocketMotion.rollRadians);
      if (journey.sprite) context.drawImage(journey.sprite, -radius, -radius, radius * 2, radius * 2);
      context.restore();
    }
  }

  public active(now: number): boolean {
    return !prefersReducedMotion() && [...this.journeys.values()].some((entry) => now - entry.started < pocketMotion.sinkMs);
  }
  public snapshot(now: number) {
    return { activeDrops: [...this.journeys.values()].filter((entry) => now - entry.started < pocketMotion.sinkMs).length,
      deliveredCount: this.deliveredCount, activeReturns: this.animations.size };
  }
  public clear(view?: BilliardsViewElements): void {
    for (const animation of this.animations) animation.cancel();
    this.animations.clear(); this.journeys.clear(); this.deliveredCount = 0;
    view?.root.querySelectorAll<HTMLElement>('[data-return-pending]').forEach((node) => { delete node.dataset.returnPending; });
  }
}
