import type { Vec2 } from '../domain/types.ts';
import {
  billiardsManualStrokeTuning as tuning,
  manualStrokeCanRelease,
} from './interaction-state-v2.ts';
import type { BilliardsManualStrokeUpdate } from './shot-interaction-v2.ts';

interface StrokeSample {
  readonly projection: number;
  readonly timeMs: number;
}

/** Pure gesture sampler. All distances are canonical canvas pixels, not device pixels. */
export class ManualCueStroke {
  private readonly axis: Vec2;
  private readonly start: Vec2;
  private samples: StrokeSample[];
  private maximumPullback = 0;
  private maximumDisplacement = 0;
  private update: BilliardsManualStrokeUpdate = {
    cueOffset: 0, pullback: 0, forwardVelocity: 0,
  };

  public constructor(start: Vec2, angleRadians: number, timeMs: number) {
    this.start = start;
    this.axis = { x: Math.cos(angleRadians), y: Math.sin(angleRadians) };
    this.samples = [{ projection: 0, timeMs }];
  }

  public sample(point: Vec2, timeMs: number): BilliardsManualStrokeUpdate {
    const previous = this.samples[this.samples.length - 1]!;
    if (![point.x, point.y, timeMs].every(Number.isFinite)
      || timeMs - previous.timeMs < tuning.minimumSampleIntervalMs) return this.update;
    const delta = { x: point.x - this.start.x, y: point.y - this.start.y };
    const projection = delta.x * this.axis.x + delta.y * this.axis.y;
    this.maximumDisplacement = Math.max(this.maximumDisplacement, Math.hypot(delta.x, delta.y));
    this.maximumPullback = Math.max(this.maximumPullback, -projection);
    // Start a new forward-velocity window after any backward or stationary sample.
    if (projection <= previous.projection) this.samples = [previous];
    this.samples = this.samples.filter((sample) => timeMs - sample.timeMs <= tuning.pointerSampleWindowMs);
    // A low-rate device may deliver only one sample per window: use the actual
    // preceding segment, never invent a zero-duration sample at the destination.
    const first = this.samples[0] ?? previous;
    const elapsed = Math.max(tuning.minimumSampleIntervalMs, timeMs - first.timeMs);
    const forwardVelocity = Math.max(0, projection - first.projection)
      * tuning.millisecondsPerSecond / elapsed;
    this.samples.push({ projection, timeMs });
    this.update = { cueOffset: -projection, pullback: this.maximumPullback, forwardVelocity };
    return this.update;
  }

  public reachedContact(): boolean {
    return this.update.cueOffset <= tuning.contactOffsetPixels
      && manualStrokeCanRelease(this.update.pullback, this.update.forwardVelocity);
  }

  public isTap(): boolean {
    return this.maximumDisplacement <= tuning.tapSlopPixels;
  }
}
