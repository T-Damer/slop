import { isFiniteVec2 } from '../domain/geometry.ts';
import { canPlaceCueBall } from '../domain/rack.ts';
import { billiardsBallIds, billiardsPhysics, billiardsRules } from '../domain/registry.ts';
import type { BilliardsMatchState, Vec2 } from '../domain/types.ts';
import { billiardsInteractionKinds as kinds, type BilliardsInteractionMessage } from '../network/interaction-wire-v2.ts';
import {
  billiardsInteractionModes as modes,
  billiardsManualStrokeTuning as tuning,
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

const shotDefaults = { angleRadians: 0, power: 0.68, sideSpin: 0, followSpin: 0 } as const;

export class BilliardsShotInteraction {
  private angleRadians: number = shotDefaults.angleRadians;
  private power: number = shotDefaults.power;
  private sideSpin: number = shotDefaults.sideSpin;
  private followSpin: number = shotDefaults.followSpin;
  private state = createBilliardsInteractionState(false);
  private matchRevision = -1;
  private readonly options: BilliardsShotInteractionOptions;

  public constructor(options: BilliardsShotInteractionOptions) { this.options = options; }

  public snapshot(): BilliardsShotInteractionSnapshot {
    return { angleRadians: this.angleRadians, power: this.power, sideSpin: this.sideSpin,
      followSpin: this.followSpin, interaction: this.state };
  }

  public synchronizeMatch(match: BilliardsMatchState): void {
    if (match.revision === this.matchRevision) return;
    this.matchRevision = match.revision;
    this.state = createBilliardsInteractionState(match.ballInHand);
    // The existing cue position is a preview only, never an implicit confirmation.
    if (match.ballInHand) {
      const cue = match.table.balls.find((ball) => ball.id === billiardsBallIds.cue);
      if (cue !== undefined) this.state = { ...this.state,
        placementPreview: { position: cue.position, valid: canPlaceCueBall(match.table, cue.position) } };
    }
  }

  public setAimFromWorld(match: BilliardsMatchState, point: Vec2): void {
    if (this.state.mode !== modes.aiming || !isFiniteVec2(point)) return;
    const cue = match.table.balls.find((ball) => ball.id === billiardsBallIds.cue && !ball.pocketed);
    if (cue === undefined) return;
    const delta = { x: point.x - cue.position.x, y: point.y - cue.position.y };
    if (Math.hypot(delta.x, delta.y) < billiardsPhysics.ballRadius) return;
    this.setAngle(Math.atan2(delta.y, delta.x));
  }

  public setAngle(value: number): void {
    if (!Number.isFinite(value) || !this.canAdjust()) return;
    this.angleRadians = normalizeAngle(value);
    this.publishAim();
  }

  public adjustAngle(deltaRadians: number): void { this.setAngle(this.angleRadians + deltaRadians); }

  public setPower(value: number): void {
    if (!Number.isFinite(value) || !this.canAdjust()) return;
    this.power = clamp(value, billiardsRules.minimumPower, billiardsRules.maximumPower);
    this.publishAim();
  }

  public adjustPower(delta: number): void { this.setPower(this.power + delta); }

  public setSpin(sideSpin: number, followSpin: number): void {
    if (![sideSpin, followSpin].every(Number.isFinite) || !this.canAdjust()) return;
    this.sideSpin = clamp(sideSpin, -billiardsRules.maximumSpin, billiardsRules.maximumSpin);
    this.followSpin = clamp(followSpin, -billiardsRules.maximumSpin, billiardsRules.maximumSpin);
    this.publishAim();
  }

  public lockAim(): boolean {
    if (this.state.mode !== modes.aiming) return false;
    this.state = { mode: modes.aimLocked, placementPreview: null, stroke: null };
    this.publishAim();
    return true;
  }

  public unlockAim(): void {
    if (this.state.mode !== modes.aimLocked && this.state.mode !== modes.manualStroke) return;
    this.state = createBilliardsInteractionState(false);
    this.publish({ ...this.messageBase(), kind: kinds.aimUnlocked });
  }

  public setPlacementPreview(match: BilliardsMatchState, position: Vec2): void {
    if (this.state.mode !== modes.placingCueBall || !isFiniteVec2(position)) return;
    const valid = canPlaceCueBall(match.table, position);
    this.state = { ...this.state, placementPreview: { position: { ...position }, valid } };
    this.publish({ ...this.messageBase(), kind: kinds.cuePlacementPreview, position: { ...position }, valid });
  }

  public consumeValidPlacement(): Vec2 | null {
    const preview = this.state.placementPreview;
    return preview?.valid === true ? { ...preview.position } : null;
  }

  public beginManualStroke(): boolean {
    if (this.state.mode !== modes.aimLocked) return false;
    this.state = { mode: modes.manualStroke, placementPreview: null,
      stroke: { cueOffset: 0, pullback: 0, forwardVelocity: 0, power: this.power } };
    this.publish({ ...this.messageBase(), kind: kinds.manualStroke, ...this.state.stroke! });
    return true;
  }

  public updateManualStroke(update: BilliardsManualStrokeUpdate): void {
    if (this.state.mode !== modes.manualStroke || !Object.values(update).every(Number.isFinite)) return;
    const pullback = clamp(update.pullback, 0, tuning.maximumCueOffsetPixels);
    const forwardVelocity = Math.max(0, update.forwardVelocity);
    this.power = clamp(manualStrokePower(pullback, forwardVelocity),
      billiardsRules.minimumPower, billiardsRules.maximumPower);
    const stroke = { cueOffset: clamp(update.cueOffset, -tuning.maximumCueOffsetPixels,
      tuning.maximumCueOffsetPixels), pullback, forwardVelocity, power: this.power };
    this.state = { ...this.state, stroke };
    this.publish({ ...this.messageBase(), kind: kinds.manualStroke, ...stroke });
  }

  public finishManualStroke(): number | null {
    if (this.state.mode !== modes.manualStroke) return null;
    const stroke = this.state.stroke;
    this.cancelManualStroke();
    return stroke !== null && stroke.cueOffset <= tuning.contactOffsetPixels
      && manualStrokeCanRelease(stroke.pullback, stroke.forwardVelocity) ? stroke.power : null;
  }

  public cancelManualStroke(): void {
    if (this.state.mode !== modes.manualStroke) return;
    this.state = { mode: modes.aimLocked, placementPreview: null, stroke: null };
    this.publishAim(); // Remote cue must also return to the prepared position.
  }

  public applyRemote(message: BilliardsInteractionMessage, match: BilliardsMatchState): void {
    if (message.revision !== match.revision || match.activeShot !== null) return;
    if (message.kind === kinds.cuePlacementPreview && match.ballInHand) {
      this.state = { mode: modes.placingCueBall, stroke: null,
        placementPreview: { position: message.position, valid: canPlaceCueBall(match.table, message.position) } };
    } else if (match.ballInHand) return;
    else if (message.kind === kinds.aimPreview || message.kind === kinds.aimLocked) {
      this.angleRadians = normalizeAngle(message.angleRadians);
      this.power = message.power ?? this.power;
      this.sideSpin = message.sideSpin ?? this.sideSpin;
      this.followSpin = message.followSpin ?? this.followSpin;
      this.state = { mode: message.kind === kinds.aimLocked ? modes.aimLocked : modes.aiming,
        placementPreview: null, stroke: null };
    } else if (message.kind === kinds.manualStroke) {
      this.power = message.power;
      this.state = { mode: modes.manualStroke, placementPreview: null, stroke: message };
    } else this.state = createBilliardsInteractionState(false);
    this.options.onChange(); // Applying remote state never echoes another intent.
  }

  public reset(ballInHand: boolean): void {
    this.angleRadians = shotDefaults.angleRadians;
    this.power = shotDefaults.power;
    this.sideSpin = shotDefaults.sideSpin;
    this.followSpin = shotDefaults.followSpin;
    this.state = createBilliardsInteractionState(ballInHand);
  }

  private canAdjust(): boolean { return this.state.mode === modes.aiming || this.state.mode === modes.aimLocked; }

  private publishAim(): void {
    this.publish({ ...this.messageBase(), kind: this.state.mode === modes.aiming ? kinds.aimPreview : kinds.aimLocked,
      angleRadians: this.angleRadians, power: this.power, sideSpin: this.sideSpin, followSpin: this.followSpin });
  }

  private messageBase() {
    return { schemaVersion: 1 as const, revision: this.options.currentRevision(),
      clientSequence: this.options.nextSequence() };
  }

  private publish(message: BilliardsInteractionMessage): void {
    this.options.onInteraction(message);
    this.options.onChange();
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeAngle(value: number): number {
  const fullCircle = Math.PI * 2;
  return ((value + Math.PI) % fullCircle + fullCircle) % fullCircle - Math.PI;
}
