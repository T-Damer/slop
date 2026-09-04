import { canPlaceCueBall } from '../domain/rack.ts';
import { billiardsPhysics, billiardsRules } from '../domain/registry.ts';
import type { BilliardsMatchState, Vec2 } from '../domain/types.ts';
import {
  billiardsInteractionKinds,
  type BilliardsInteractionMessage,
} from '../network/interaction-wire-v2.ts';
import {
  billiardsInteractionModes,
  createBilliardsInteractionState,
  manualStrokeCanRelease,
  manualStrokePower,
  type BilliardsInteractionState,
} from './interaction-state-v2.ts';

export interface BilliardsShotInteractionSnapshot {
  readonly angleRadians: number;
  readonly power: number;
  readonly sideSpin: number;
  readonly followSpin: number;
  readonly interaction: BilliardsInteractionState;
}

export interface BilliardsManualStrokeUpdate {
  readonly cueOffset: number;
  readonly pullback: number;
  readonly forwardVelocity: number;
}

export interface BilliardsShotInteractionOptions {
  readonly onChange: () => void;
  readonly onInteraction: (message: BilliardsInteractionMessage) => void;
  readonly currentRevision: () => number;
  readonly nextSequence: () => number;
}

export class BilliardsShotInteraction {
  private angleRadians = 0;
  private power = 0.68;
  private sideSpin = 0;
  private followSpin = 0;
  private state = createBilliardsInteractionState(false);

  public constructor(private readonly options: BilliardsShotInteractionOptions) {}

  public snapshot(): BilliardsShotInteractionSnapshot {
    return {
      angleRadians: this.angleRadians,
      power: this.power,
      sideSpin: this.sideSpin,
      followSpin: this.followSpin,
      interaction: this.state,
    };
  }

  public synchronizeMatch(match: BilliardsMatchState): void {
    if (match.ballInHand) {
      if (this.state.mode !== billiardsInteractionModes.placingCueBall) {
        this.state = createBilliardsInteractionState(true);
        this.options.onChange();
      }
      return;
    }
    if (this.state.mode === billiardsInteractionModes.placingCueBall) {
      this.state = createBilliardsInteractionState(false);
      this.options.onChange();
    }
  }

  public setAimFromWorld(match: BilliardsMatchState, point: Vec2): void {
    if (this.state.mode !== billiardsInteractionModes.aiming) return;
    const cue = match.table.balls.find((ball) => ball.id === 0 && !ball.pocketed);
    if (cue === undefined) return;
    const delta = { x: point.x - cue.position.x, y: point.y - cue.position.y };
    if (Math.hypot(delta.x, delta.y) < billiardsPhysics.ballRadius) return;
    this.angleRadians = normalizeAngle(Math.atan2(delta.y, delta.x));
    this.publishAim(billiardsInteractionKinds.aimPreview);
    this.options.onChange();
  }

  public setAngle(value: number): void {
    if (!Number.isFinite(value) || !this.canAdjustAngle()) return;
    this.angleRadians = normalizeAngle(value);
    this.publishAim(
      this.state.mode === billiardsInteractionModes.aimLocked
        || this.state.mode === billiardsInteractionModes.manualStroke
        ? billiardsInteractionKinds.aimLocked
        : billiardsInteractionKinds.aimPreview,
    );
    this.options.onChange();
  }

  public adjustAngle(deltaRadians: number): void {
    this.setAngle(this.angleRadians + deltaRadians);
  }

  public setPower(value: number): void {
    if (!Number.isFinite(value)) return;
    this.power = clamp(value, billiardsRules.minimumPower, billiardsRules.maximumPower);
    this.options.onChange();
  }

  public adjustPower(delta: number): void {
    this.setPower(this.power + delta);
  }

  public setSpin(sideSpin: number, followSpin: number): void {
    this.sideSpin = clamp(
      sideSpin,
      -billiardsRules.maximumSpin,
      billiardsRules.maximumSpin,
    );
    this.followSpin = clamp(
      followSpin,
      -billiardsRules.maximumSpin,
      billiardsRules.maximumSpin,
    );
    this.options.onChange();
  }

  public lockAim(): boolean {
    if (this.state.mode !== billiardsInteractionModes.aiming) return false;
    this.state = {
      mode: billiardsInteractionModes.aimLocked,
      placementPreview: null,
      stroke: null,
    };
    this.publishAim(billiardsInteractionKinds.aimLocked);
    this.options.onChange();
    return true;
  }

  public unlockAim(): void {
    if (
      this.state.mode !== billiardsInteractionModes.aimLocked
      && this.state.mode !== billiardsInteractionModes.manualStroke
    ) {
      return;
    }
    this.state = createBilliardsInteractionState(false);
    this.publish({
      schemaVersion: 1,
      kind: billiardsInteractionKinds.aimUnlocked,
      revision: this.options.currentRevision(),
      clientSequence: this.options.nextSequence(),
    });
    this.options.onChange();
  }

  public setPlacementPreview(match: BilliardsMatchState, position: Vec2): void {
    if (this.state.mode !== billiardsInteractionModes.placingCueBall) return;
    const valid = canPlaceCueBall(match.table, position);
    this.state = {
      ...this.state,
      placementPreview: { position: { ...position }, valid },
    };
    this.publish({
      schemaVersion: 1,
      kind: billiardsInteractionKinds.cuePlacementPreview,
      revision: this.options.currentRevision(),
      clientSequence: this.options.nextSequence(),
      position: { ...position },
      valid,
    });
    this.options.onChange();
  }

  public consumeValidPlacement(): Vec2 | null {
    const preview = this.state.placementPreview;
    return preview?.valid === true ? { ...preview.position } : null;
  }

  public beginManualStroke(): boolean {
    if (this.state.mode !== billiardsInteractionModes.aimLocked) return false;
    this.state = {
      mode: billiardsInteractionModes.manualStroke,
      placementPreview: null,
      stroke: {
        cueOffset: 0,
        pullback: 0,
        forwardVelocity: 0,
        power: this.power,
      },
    };
    this.options.onChange();
    return true;
  }

  public updateManualStroke(update: BilliardsManualStrokeUpdate): void {
    if (this.state.mode !== billiardsInteractionModes.manualStroke) return;
    const pullback = Math.max(0, update.pullback);
    const forwardVelocity = Math.max(0, update.forwardVelocity);
    const power = manualStrokePower(pullback, forwardVelocity);
    this.power = clamp(
      Math.max(power, billiardsRules.minimumPower),
      billiardsRules.minimumPower,
      billiardsRules.maximumPower,
    );
    this.state = {
      ...this.state,
      stroke: {
        cueOffset: clamp(update.cueOffset, -220, 220),
        pullback,
        forwardVelocity,
        power: this.power,
      },
    };
    this.publish({
      schemaVersion: 1,
      kind: billiardsInteractionKinds.manualStroke,
      revision: this.options.currentRevision(),
      clientSequence: this.options.nextSequence(),
      cueOffset: this.state.stroke.cueOffset,
      pullback,
      forwardVelocity,
      power: this.power,
    });
    this.options.onChange();
  }

  public finishManualStroke(): number | null {
    if (this.state.mode !== billiardsInteractionModes.manualStroke) return null;
    const stroke = this.state.stroke;
    this.state = {
      mode: billiardsInteractionModes.aimLocked,
      placementPreview: null,
      stroke: null,
    };
    this.options.onChange();
    if (
      stroke === null
      || !manualStrokeCanRelease(stroke.pullback, stroke.forwardVelocity)
    ) {
      return null;
    }
    return stroke.power;
  }

  public cancelManualStroke(): void {
    if (this.state.mode !== billiardsInteractionModes.manualStroke) return;
    this.state = {
      mode: billiardsInteractionModes.aimLocked,
      placementPreview: null,
      stroke: null,
    };
    this.options.onChange();
  }

  public reset(ballInHand: boolean): void {
    this.angleRadians = 0;
    this.sideSpin = 0;
    this.followSpin = 0;
    this.state = createBilliardsInteractionState(ballInHand);
    this.publish({
      schemaVersion: 1,
      kind: billiardsInteractionKinds.reset,
      revision: this.options.currentRevision(),
      clientSequence: this.options.nextSequence(),
    });
    this.options.onChange();
  }

  private canAdjustAngle(): boolean {
    return this.state.mode === billiardsInteractionModes.aiming
      || this.state.mode === billiardsInteractionModes.aimLocked;
  }

  private publishAim(
    kind:
      | typeof billiardsInteractionKinds.aimPreview
      | typeof billiardsInteractionKinds.aimLocked,
  ): void {
    this.publish({
      schemaVersion: 1,
      kind,
      revision: this.options.currentRevision(),
      clientSequence: this.options.nextSequence(),
      angleRadians: this.angleRadians,
    });
  }

  private publish(message: BilliardsInteractionMessage): void {
    this.options.onInteraction(message);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeAngle(value: number): number {
  const fullCircle = Math.PI * 2;
  return ((value + Math.PI) % fullCircle + fullCircle) % fullCircle - Math.PI;
}
