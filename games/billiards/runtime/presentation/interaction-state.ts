import type { BilliardsMatchState, Vec2 } from '../domain/types.ts';

export const billiardsInteractionModes = {
  aiming: 'aiming',
  locked: 'locked',
  placing: 'placing',
  stroking: 'stroking',
} as const;

export type BilliardsInteractionMode =
  typeof billiardsInteractionModes[keyof typeof billiardsInteractionModes];

export interface BilliardsInteractionSnapshot {
  readonly mode: BilliardsInteractionMode;
  readonly pendingCuePosition: Vec2 | null;
  readonly pendingCueValid: boolean;
  readonly strokePullPixels: number;
  readonly strokeVelocityPixelsPerSecond: number;
  readonly pointerId: number | null;
  readonly revision: number;
}

export interface BilliardsManualStrokeResult {
  readonly power: number;
  readonly pullPixels: number;
  readonly forwardVelocityPixelsPerSecond: number;
}

interface ActiveStroke {
  readonly pointerId: number;
  readonly start: Vec2;
  readonly aimAngleRadians: number;
  lastPoint: Vec2;
  lastAtMs: number;
  lastPullPixels: number;
  maximumPullPixels: number;
  peakForwardVelocityPixelsPerSecond: number;
}

type InteractionListener = (snapshot: BilliardsInteractionSnapshot) => void;

const interactionTuning = {
  maximumPullPixels: 190,
  minimumPullPixels: 13,
  fullPowerPullPixels: 155,
  fullPowerVelocityPixelsPerSecond: 1900,
  pullWeight: 0.78,
  velocityWeight: 0.22,
  minimumPower: 0.08,
  maximumPower: 1,
  minimumSampleMilliseconds: 4,
} as const;

export class BilliardsInteractionStore {
  private mode: BilliardsInteractionMode = billiardsInteractionModes.aiming;
  private pendingCuePosition: Vec2 | null = null;
  private pendingCueValid = false;
  private activeStroke: ActiveStroke | null = null;
  private revision = 0;
  private readonly listeners = new Set<InteractionListener>();

  public snapshot(): BilliardsInteractionSnapshot {
    return {
      mode: this.mode,
      pendingCuePosition: this.pendingCuePosition,
      pendingCueValid: this.pendingCueValid,
      strokePullPixels: this.activeStroke?.lastPullPixels ?? 0,
      strokeVelocityPixelsPerSecond:
        this.activeStroke?.peakForwardVelocityPixelsPerSecond ?? 0,
      pointerId: this.activeStroke?.pointerId ?? null,
      revision: this.revision,
    };
  }

  public subscribe(listener: InteractionListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  public sync(match: BilliardsMatchState): BilliardsInteractionSnapshot {
    if (match.ballInHand) {
      if (this.mode !== billiardsInteractionModes.placing) {
        const cue = match.table.balls.find((ball) => ball.id === 0);
        this.pendingCuePosition = cue === undefined ? null : { ...cue.position };
        this.pendingCueValid = cue !== undefined;
        this.activeStroke = null;
        this.setMode(billiardsInteractionModes.placing);
      }
      return this.snapshot();
    }
    if (match.activeShot !== null) {
      if (this.mode !== billiardsInteractionModes.aiming || this.activeStroke !== null) {
        this.pendingCuePosition = null;
        this.pendingCueValid = false;
        this.activeStroke = null;
        this.setMode(billiardsInteractionModes.aiming);
      }
      return this.snapshot();
    }
    if (this.mode === billiardsInteractionModes.placing) {
      this.pendingCuePosition = null;
      this.pendingCueValid = false;
      this.setMode(billiardsInteractionModes.aiming);
    }
    return this.snapshot();
  }

  public setPlacementPreview(position: Vec2, valid: boolean): void {
    if (this.mode !== billiardsInteractionModes.placing) {
      return;
    }
    this.pendingCuePosition = { ...position };
    this.pendingCueValid = valid;
    this.touch();
  }

  public lockAim(): void {
    if (this.mode === billiardsInteractionModes.aiming) {
      this.setMode(billiardsInteractionModes.locked);
    }
  }

  public unlockAim(): void {
    if (
      this.mode === billiardsInteractionModes.locked
      || this.mode === billiardsInteractionModes.stroking
    ) {
      this.activeStroke = null;
      this.setMode(billiardsInteractionModes.aiming);
    }
  }

  public beginStroke(
    pointerId: number,
    point: Vec2,
    atMs: number,
    aimAngleRadians: number,
  ): boolean {
    if (this.mode !== billiardsInteractionModes.locked) {
      return false;
    }
    this.activeStroke = {
      pointerId,
      start: { ...point },
      aimAngleRadians,
      lastPoint: { ...point },
      lastAtMs: atMs,
      lastPullPixels: 0,
      maximumPullPixels: 0,
      peakForwardVelocityPixelsPerSecond: 0,
    };
    this.setMode(billiardsInteractionModes.stroking);
    return true;
  }

  public updateStroke(pointerId: number, point: Vec2, atMs: number): void {
    const stroke = this.activeStroke;
    if (this.mode !== billiardsInteractionModes.stroking || stroke?.pointerId !== pointerId) {
      return;
    }
    const pullPixels = projectedPullPixels(
      stroke.start,
      point,
      stroke.aimAngleRadians,
      interactionTuning.maximumPullPixels,
    );
    const elapsedMilliseconds = Math.max(
      interactionTuning.minimumSampleMilliseconds,
      atMs - stroke.lastAtMs,
    );
    const pullVelocity = (pullPixels - stroke.lastPullPixels)
      / elapsedMilliseconds
      * 1000;
    stroke.peakForwardVelocityPixelsPerSecond = Math.max(
      stroke.peakForwardVelocityPixelsPerSecond,
      -pullVelocity,
    );
    stroke.maximumPullPixels = Math.max(stroke.maximumPullPixels, pullPixels);
    stroke.lastPullPixels = pullPixels;
    stroke.lastPoint = { ...point };
    stroke.lastAtMs = atMs;
    this.touch();
  }

  public releaseStroke(pointerId: number): BilliardsManualStrokeResult | null {
    const stroke = this.activeStroke;
    if (this.mode !== billiardsInteractionModes.stroking || stroke?.pointerId !== pointerId) {
      return null;
    }
    this.activeStroke = null;
    this.setMode(billiardsInteractionModes.locked);
    if (stroke.maximumPullPixels < interactionTuning.minimumPullPixels) {
      return null;
    }
    return resolveManualStroke(
      stroke.maximumPullPixels,
      stroke.peakForwardVelocityPixelsPerSecond,
    );
  }

  public cancelStroke(pointerId: number): void {
    if (this.activeStroke?.pointerId !== pointerId) {
      return;
    }
    this.activeStroke = null;
    this.setMode(billiardsInteractionModes.locked);
  }

  public resetAfterPrimaryAction(): void {
    this.activeStroke = null;
    this.pendingCuePosition = null;
    this.pendingCueValid = false;
    this.setMode(billiardsInteractionModes.aiming);
  }

  private setMode(mode: BilliardsInteractionMode): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.touch();
  }

  private touch(): void {
    this.revision += 1;
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export function projectedPullPixels(
  start: Vec2,
  point: Vec2,
  aimAngleRadians: number,
  maximumPullPixels = interactionTuning.maximumPullPixels,
): number {
  const cueButtAxis = {
    x: -Math.cos(aimAngleRadians),
    y: -Math.sin(aimAngleRadians),
  };
  const delta = { x: point.x - start.x, y: point.y - start.y };
  return clamp(
    delta.x * cueButtAxis.x + delta.y * cueButtAxis.y,
    0,
    maximumPullPixels,
  );
}

export function resolveManualStroke(
  pullPixels: number,
  forwardVelocityPixelsPerSecond: number,
): BilliardsManualStrokeResult {
  const pullContribution = clamp(
    pullPixels / interactionTuning.fullPowerPullPixels,
    0,
    1,
  );
  const velocityContribution = clamp(
    forwardVelocityPixelsPerSecond
      / interactionTuning.fullPowerVelocityPixelsPerSecond,
    0,
    1,
  );
  const power = clamp(
    interactionTuning.minimumPower
      + pullContribution * interactionTuning.pullWeight
      + velocityContribution * interactionTuning.velocityWeight,
    interactionTuning.minimumPower,
    interactionTuning.maximumPower,
  );
  return {
    power,
    pullPixels,
    forwardVelocityPixelsPerSecond,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export const billiardsInteractionStore = new BilliardsInteractionStore();
