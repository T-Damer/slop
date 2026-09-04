import type { Vec2 } from '../domain/types.ts';

export const billiardsInteractionModes = {
  placingCueBall: 'placing-cue-ball',
  aiming: 'aiming',
  aimLocked: 'aim-locked',
  manualStroke: 'manual-stroke',
} as const;

export type BilliardsInteractionMode =
  typeof billiardsInteractionModes[keyof typeof billiardsInteractionModes];

export interface BilliardsCuePlacementPreview {
  readonly position: Vec2;
  readonly valid: boolean;
}

export interface BilliardsManualStrokePreview {
  readonly cueOffset: number;
  readonly pullback: number;
  readonly forwardVelocity: number;
  readonly power: number;
}

export interface BilliardsInteractionState {
  readonly mode: BilliardsInteractionMode;
  readonly placementPreview: BilliardsCuePlacementPreview | null;
  readonly stroke: BilliardsManualStrokePreview | null;
}

export const billiardsManualStrokeTuning = {
  maximumPullbackPixels: 170,
  maximumForwardVelocityPixelsPerSecond: 1650,
  pullbackWeight: 0.68,
  velocityWeight: 0.32,
  minimumPullbackPixels: 13,
  minimumForwardVelocityPixelsPerSecond: 95,
  minimumPower: 0.08,
  maximumPower: 1,
  pointerSampleWindowMs: 90,
} as const;

export function createBilliardsInteractionState(
  ballInHand: boolean,
): BilliardsInteractionState {
  return {
    mode: ballInHand
      ? billiardsInteractionModes.placingCueBall
      : billiardsInteractionModes.aiming,
    placementPreview: null,
    stroke: null,
  };
}

export function manualStrokePower(
  pullbackPixels: number,
  forwardVelocityPixelsPerSecond: number,
): number {
  const pullbackShare = clamp01(
    pullbackPixels / billiardsManualStrokeTuning.maximumPullbackPixels,
  );
  const velocityShare = clamp01(
    forwardVelocityPixelsPerSecond
      / billiardsManualStrokeTuning.maximumForwardVelocityPixelsPerSecond,
  );
  return clamp01(
    pullbackShare * billiardsManualStrokeTuning.pullbackWeight
      + velocityShare * billiardsManualStrokeTuning.velocityWeight,
  );
}

export function manualStrokeCanRelease(
  pullbackPixels: number,
  forwardVelocityPixelsPerSecond: number,
): boolean {
  return pullbackPixels >= billiardsManualStrokeTuning.minimumPullbackPixels
    && forwardVelocityPixelsPerSecond
      >= billiardsManualStrokeTuning.minimumForwardVelocityPixelsPerSecond;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
