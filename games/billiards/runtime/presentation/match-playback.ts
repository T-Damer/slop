import { advanceMatchShotWithEvents } from '../domain/match.ts';
import { billiardsPhysics } from '../domain/registry.ts';
import type { BilliardsMatchState } from '../domain/types.ts';
import { createCollisionFeedback, type BilliardsFeedbackEvent } from './feedback.ts';

/** Local training only. Online matches advance exclusively in the room. */
export class BilliardsMatchPlayback {
  private accumulator = 0;

  public reset(): void { this.accumulator = 0; }

  public advance(match: BilliardsMatchState, deltaSeconds: number) {
    if (!Number.isFinite(deltaSeconds)) return { match, events: [] };
    const maximumDelta = billiardsPhysics.fixedStepSeconds * billiardsPhysics.maximumFrameSteps;
    this.accumulator += Math.min(maximumDelta, Math.max(0, deltaSeconds));
    const events: BilliardsFeedbackEvent[] = [];
    let next = match;
    for (let step = 0; step < billiardsPhysics.maximumFrameSteps
      && this.accumulator >= billiardsPhysics.fixedStepSeconds && next.activeShot !== null; step += 1) {
      const advanced = advanceMatchShotWithEvents(next);
      events.push(...createCollisionFeedback(next.table, advanced.events, next.turnIndex));
      next = advanced.match;
      this.accumulator -= billiardsPhysics.fixedStepSeconds;
    }
    if (next.activeShot === null) this.reset();
    return { match: next, events };
  }
}
