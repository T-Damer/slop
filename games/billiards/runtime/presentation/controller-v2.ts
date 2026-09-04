import {
  advanceMatchShotWithEvents,
  createInitialMatch,
  positionCueBall,
  restartMatch,
  startMatchShot,
} from '../domain/match.ts';
import { billiardsMatchPhases, billiardsPhysics } from '../domain/registry.ts';
import { previewShot } from '../domain/shot.ts';
import { isTableAtRest } from '../domain/simulator.ts';
import type {
  BilliardsMatchState,
  BilliardsShotCommand,
  BilliardsShotPreview,
  Vec2,
} from '../domain/types.ts';
import type { BilliardsInteractionMessage } from '../network/interaction-wire-v2.ts';
import { createLocalBilliardsSession } from '../network/local-session.ts';
import { billiardsConnectionStates } from '../network/registry.ts';
import {
  createCuePlacementWireCommand,
  createRestartWireCommand,
  createShotWireCommand,
  readBilliardsSessionOptions,
  type BilliardsSession,
  type BilliardsSessionStatus,
} from '../network/session.ts';
import {
  createCollisionFeedback,
  createCueFeedback,
  type BilliardsFeedbackBatch,
  type BilliardsFeedbackEvent,
} from './feedback.ts';
import {
  billiardsInteractionModes,
  type BilliardsInteractionState,
} from './interaction-state-v2.ts';
import {
  BilliardsShotInteraction,
  type BilliardsManualStrokeUpdate,
} from './shot-interaction-v2.ts';

export interface BilliardsControllerSnapshotV2 {
  readonly match: BilliardsMatchState;
  readonly preview: BilliardsShotPreview;
  readonly angleRadians: number;
  readonly power: number;
  readonly sideSpin: number;
  readonly followSpin: number;
  readonly interaction: BilliardsInteractionState;
  readonly connection: BilliardsSessionStatus;
}

type SnapshotListener = (snapshot: BilliardsControllerSnapshotV2) => void;
type FeedbackListener = (batch: BilliardsFeedbackBatch) => void;

interface InteractiveBilliardsSession extends BilliardsSession {
  readonly sendInteraction?: (message: BilliardsInteractionMessage) => void;
}

export class BilliardsGameControllerV2 {
  private match = createInitialMatch();
  private connection: BilliardsSessionStatus = {
    state: billiardsConnectionStates.local,
    detail: 'Локальная тренировка',
  };
  private sequence = 0;
  private feedbackRevision = 0;
  private accumulatorSeconds = 0;
  private disposed = false;
  private session: InteractiveBilliardsSession = createLocalBilliardsSession();
  private readonly listeners = new Set<SnapshotListener>();
  private readonly feedbackListeners = new Set<FeedbackListener>();
  private readonly shot = new BilliardsShotInteraction({
    onChange: () => this.emit(),
    onInteraction: (message) => this.session.sendInteraction?.(message),
    currentRevision: () => this.match.revision,
    nextSequence: () => this.nextSequence(),
  });

  public snapshot(): BilliardsControllerSnapshotV2 {
    const shot = this.shot.snapshot();
    return {
      match: this.match,
      preview: previewShot(this.match.table, this.createShotCommand(0)),
      angleRadians: shot.angleRadians,
      power: shot.power,
      sideSpin: shot.sideSpin,
      followSpin: shot.followSpin,
      interaction: shot.interaction,
      connection: this.connection,
    };
  }

  public subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  public subscribeFeedback(listener: FeedbackListener): () => void {
    this.feedbackListeners.add(listener);
    return () => this.feedbackListeners.delete(listener);
  }

  public async start(locationUrl: string): Promise<void> {
    this.disposed = false;
    const options = readBilliardsSessionOptions(locationUrl);
    if (options.endpoint === null) {
      await this.session.connect(this.sessionListeners());
      return;
    }
    try {
      const module = await import('../network/colyseus-session-v2.ts');
      this.session = module.createColyseusBilliardsSessionV2(options);
      await this.session.connect(this.sessionListeners());
    } catch {
      this.session = createLocalBilliardsSession();
      await this.session.connect(this.sessionListeners());
      this.connection = {
        state: billiardsConnectionStates.unavailable,
        detail: 'Сервер недоступен · локальная тренировка',
      };
      this.emit();
    }
  }

  public async dispose(): Promise<void> {
    this.disposed = true;
    this.listeners.clear();
    this.feedbackListeners.clear();
    await this.session.close();
  }

  public advance(deltaSeconds: number): void {
    if (this.disposed || this.match.activeShot === null) return;
    this.accumulatorSeconds += Math.min(0.1, Math.max(0, deltaSeconds));
    const events: BilliardsFeedbackEvent[] = [];
    let changed = false;
    for (
      let step = 0;
      step < billiardsPhysics.maximumFrameSteps
        && this.accumulatorSeconds >= billiardsPhysics.fixedStepSeconds
        && this.match.activeShot !== null;
      step += 1
    ) {
      const previousTable = this.match.table;
      const advanced = advanceMatchShotWithEvents(this.match);
      this.match = advanced.match;
      events.push(...createCollisionFeedback(previousTable, advanced.events));
      this.accumulatorSeconds -= billiardsPhysics.fixedStepSeconds;
      changed = true;
    }
    if (this.match.activeShot === null) {
      this.accumulatorSeconds = 0;
      this.shot.synchronizeMatch(this.match);
    }
    if (events.length > 0) this.emitFeedback(events);
    if (changed) this.emit();
  }

  public setAimFromWorld(point: Vec2): void {
    if (!this.canInteract()) return;
    this.shot.setAimFromWorld(this.match, point);
  }

  public setAngleRadians(value: number): void {
    if (!this.canInteract()) return;
    this.shot.setAngle(value);
  }

  public adjustAngle(deltaRadians: number): void {
    if (!this.canInteract()) return;
    this.shot.adjustAngle(deltaRadians);
  }

  public setPower(value: number): void {
    this.shot.setPower(value);
  }

  public adjustPower(delta: number): void {
    this.shot.adjustPower(delta);
  }

  public setSideSpin(value: number): void {
    const current = this.shot.snapshot();
    this.shot.setSpin(value, current.followSpin);
  }

  public setFollowSpin(value: number): void {
    const current = this.shot.snapshot();
    this.shot.setSpin(current.sideSpin, value);
  }

  public setSpin(sideSpin: number, followSpin: number): void {
    this.shot.setSpin(sideSpin, followSpin);
  }

  public setPlacementPreview(position: Vec2): void {
    if (!this.match.ballInHand || !this.canInteract()) return;
    this.shot.setPlacementPreview(this.match, position);
  }

  public lockAim(): boolean {
    return this.canInteract() && this.shot.lockAim();
  }

  public unlockAim(): void {
    this.shot.unlockAim();
  }

  public beginManualStroke(): boolean {
    return this.canInteract() && this.shot.beginManualStroke();
  }

  public updateManualStroke(update: BilliardsManualStrokeUpdate): void {
    this.shot.updateManualStroke(update);
  }

  public finishManualStroke(): boolean {
    const power = this.shot.finishManualStroke();
    if (power === null) return false;
    this.shot.setPower(power);
    return this.shoot();
  }

  public cancelManualStroke(): void {
    this.shot.cancelManualStroke();
  }

  public primaryAction(): boolean {
    if (this.match.ballInHand) return this.confirmCuePlacement();
    return this.shoot();
  }

  public confirmCuePlacement(): boolean {
    const position = this.shot.consumeValidPlacement();
    if (position === null) return false;
    const expectedRevision = this.match.revision;
    const result = positionCueBall(this.match, position);
    if (!result.accepted) {
      this.match = { ...this.match, status: result.reason };
      this.emit();
      return false;
    }
    this.match = result.match;
    this.session.sendCuePlacement(createCuePlacementWireCommand(
      position,
      this.nextSequence(),
      expectedRevision,
    ));
    this.shot.synchronizeMatch(this.match);
    this.emit();
    return true;
  }

  public shoot(): boolean {
    if (!this.canInteract() || this.match.ballInHand) return false;
    const expectedRevision = this.match.revision;
    const command = this.createShotCommand(this.nextSequence());
    const before = this.match;
    const result = startMatchShot(this.match, command);
    if (!result.accepted) {
      this.match = { ...this.match, status: result.reason };
      this.emit();
      return false;
    }
    this.match = result.match;
    const feedback = createCueFeedback(before, command.angleRadians, command.power);
    if (feedback !== null) this.emitFeedback([feedback]);
    this.session.sendShot(createShotWireCommand(command, expectedRevision));
    this.emit();
    return true;
  }

  public restart(): void {
    const expectedRevision = this.match.revision;
    this.match = restartMatch(this.match);
    this.accumulatorSeconds = 0;
    this.shot.reset(this.match.ballInHand);
    this.session.sendRestart(createRestartWireCommand(
      this.nextSequence(),
      expectedRevision,
    ));
    this.emit();
  }

  private canInteract(): boolean {
    return this.match.phase !== billiardsMatchPhases.finished
      && this.match.activeShot === null
      && isTableAtRest(this.match.table);
  }

  private createShotCommand(clientSequence: number): BilliardsShotCommand {
    const shot = this.shot.snapshot();
    return {
      schemaVersion: 1,
      angleRadians: shot.angleRadians,
      power: shot.power,
      sideSpin: shot.sideSpin,
      followSpin: shot.followSpin,
      clientSequence,
    };
  }

  private nextSequence(): number {
    this.sequence += 1;
    return this.sequence;
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  private emitFeedback(events: ReadonlyArray<BilliardsFeedbackEvent>): void {
    if (events.length === 0) return;
    this.feedbackRevision += 1;
    const batch: BilliardsFeedbackBatch = {
      revision: this.feedbackRevision,
      events,
    };
    for (const listener of this.feedbackListeners) listener(batch);
  }

  private sessionListeners() {
    return {
      onSnapshot: (snapshot: BilliardsMatchState): void => {
        if (snapshot.revision < this.match.revision) return;
        this.match = snapshot;
        this.shot.synchronizeMatch(snapshot);
        this.emit();
      },
      onRejected: (reason: string, snapshot: BilliardsMatchState): void => {
        this.match = { ...snapshot, status: reason };
        this.shot.synchronizeMatch(snapshot);
        this.emit();
      },
      onStatus: (status: BilliardsSessionStatus): void => {
        this.connection = status;
        this.emit();
      },
    };
  }
}
