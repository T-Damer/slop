import type { Vec2 } from '../domain/types.ts';

export const billiardsInteractionKinds = {
  aimPreview: 'aim-preview',
  aimLocked: 'aim-locked',
  aimUnlocked: 'aim-unlocked',
  cuePlacementPreview: 'cue-placement-preview',
  manualStroke: 'manual-stroke',
  reset: 'interaction-reset',
} as const;

export type BilliardsInteractionKind =
  typeof billiardsInteractionKinds[keyof typeof billiardsInteractionKinds];

interface BilliardsInteractionBase {
  readonly schemaVersion: 1;
  readonly kind: BilliardsInteractionKind;
  readonly revision: number;
  readonly clientSequence: number;
}

export interface BilliardsAimInteraction extends BilliardsInteractionBase {
  readonly kind:
    | typeof billiardsInteractionKinds.aimPreview
    | typeof billiardsInteractionKinds.aimLocked;
  readonly angleRadians: number;
  readonly power?: number;
  readonly sideSpin?: number;
  readonly followSpin?: number;
}

export interface BilliardsAimUnlockedInteraction extends BilliardsInteractionBase {
  readonly kind: typeof billiardsInteractionKinds.aimUnlocked;
}

export interface BilliardsCuePlacementInteraction extends BilliardsInteractionBase {
  readonly kind: typeof billiardsInteractionKinds.cuePlacementPreview;
  readonly position: Vec2;
  readonly valid: boolean;
}

export interface BilliardsManualStrokeInteraction extends BilliardsInteractionBase {
  readonly kind: typeof billiardsInteractionKinds.manualStroke;
  readonly cueOffset: number;
  readonly pullback: number;
  readonly forwardVelocity: number;
  readonly power: number;
}

export interface BilliardsResetInteraction extends BilliardsInteractionBase {
  readonly kind: typeof billiardsInteractionKinds.reset;
}

export type BilliardsInteractionMessage =
  | BilliardsAimInteraction
  | BilliardsAimUnlockedInteraction
  | BilliardsCuePlacementInteraction
  | BilliardsManualStrokeInteraction
  | BilliardsResetInteraction;

export const billiardsInteractionMessageType = 'billiards:interaction-v1';

export function isBilliardsInteractionMessage(
  value: unknown,
): value is BilliardsInteractionMessage {
  if (!isRecord(value)) return false;
  if (
    value.schemaVersion !== 1
    || !isFiniteInteger(value.revision)
    || !isFiniteInteger(value.clientSequence)
    || typeof value.kind !== 'string'
  ) {
    return false;
  }
  if (
    value.kind === billiardsInteractionKinds.aimPreview
    || value.kind === billiardsInteractionKinds.aimLocked
  ) {
    return isFiniteNumber(value.angleRadians)
      && (value.power === undefined || isUnitNumber(value.power))
      && (value.sideSpin === undefined || isSpin(value.sideSpin))
      && (value.followSpin === undefined || isSpin(value.followSpin));
  }
  if (value.kind === billiardsInteractionKinds.cuePlacementPreview) {
    return isVec2(value.position) && typeof value.valid === 'boolean';
  }
  if (value.kind === billiardsInteractionKinds.manualStroke) {
    return isFiniteNumber(value.cueOffset)
      && isFiniteNumber(value.pullback)
      && isFiniteNumber(value.forwardVelocity)
      && isUnitNumber(value.power);
  }
  return value.kind === billiardsInteractionKinds.aimUnlocked
    || value.kind === billiardsInteractionKinds.reset;
}

export function normalizeBilliardsInteraction(
  message: BilliardsInteractionMessage,
): BilliardsInteractionMessage {
  if (message.kind === billiardsInteractionKinds.manualStroke) {
    return {
      ...message,
      cueOffset: clamp(message.cueOffset, -220, 220),
      pullback: clamp(message.pullback, 0, 220),
      forwardVelocity: clamp(message.forwardVelocity, 0, 2400),
      power: clamp(message.power, 0, 1),
    };
  }
  if (message.kind === billiardsInteractionKinds.cuePlacementPreview) {
    return {
      ...message,
      position: {
        x: clamp(message.position.x, -1000, 1000),
        y: clamp(message.position.y, -1000, 1000),
      },
    };
  }
  if (
    message.kind === billiardsInteractionKinds.aimPreview
    || message.kind === billiardsInteractionKinds.aimLocked
  ) {
    return { ...message, angleRadians: normalizeAngle(message.angleRadians) };
  }
  return message;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isSafeInteger(value) && value >= 0;
}

function isUnitNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isSpin(value: unknown): value is number {
  return isFiniteNumber(value) && Math.abs(value) <= 1;
}

function isVec2(value: unknown): value is Vec2 {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeAngle(value: number): number {
  const fullCircle = Math.PI * 2;
  return ((value + Math.PI) % fullCircle + fullCircle) % fullCircle - Math.PI;
}
