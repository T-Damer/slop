import { createInitialMatch, positionCueBall, restartMatch, startMatchShot } from '../domain/match.ts';
import { billiardsMatchPhases } from '../domain/registry.ts';
import { previewShot } from '../domain/shot.ts';
import { isTableAtRest } from '../domain/simulator.ts';
import type { BilliardsMatchState, BilliardsShotCommand, BilliardsShotPreview, Vec2 } from '../domain/types.ts';
import { createLocalBilliardsSession } from '../network/local-session.ts';
import { billiardsConnectionStates as states } from '../network/registry.ts';
import {
  createCuePlacementWireCommand, createRestartWireCommand, createShotWireCommand,
  readBilliardsSessionOptions, type BilliardsSession, type BilliardsSessionStatus,
  type BilliardsSessionListeners,
} from '../network/session.ts';
import { createCueFeedback, type BilliardsFeedbackBatch, type BilliardsFeedbackEvent } from './feedback.ts';
import { BilliardsMatchPlayback } from './match-playback.ts';
import {
  BilliardsShotInteraction, type BilliardsManualStrokeUpdate, type BilliardsShotInteractionSnapshot,
} from './shot-interaction-v2.ts';

export interface BilliardsControllerSnapshotV2 extends BilliardsShotInteractionSnapshot {
  readonly match: BilliardsMatchState;
  readonly preview: BilliardsShotPreview;
  readonly connection: BilliardsSessionStatus;
  readonly canInteract: boolean;
}

type SnapshotListener = (snapshot: BilliardsControllerSnapshotV2) => void;
type FeedbackListener = (batch: BilliardsFeedbackBatch) => void;

export class BilliardsGameControllerV2 {
  private match: BilliardsMatchState;
  private session: BilliardsSession;
  private connection: BilliardsSessionStatus = { state: states.local, detail: 'Локальная тренировка' };
  private sequence = 0;
  private feedbackRevision = 0;
  private disposed = false;
  private pendingRevision: number | null = null;
  private readonly playback = new BilliardsMatchPlayback();
  private readonly listeners = new Set<SnapshotListener>();
  private readonly feedbackListeners = new Set<FeedbackListener>();
  private readonly shot: BilliardsShotInteraction;
  private previewCache: { table: BilliardsMatchState['table']; key: string; value: BilliardsShotPreview } | null = null;

  public constructor(session = createLocalBilliardsSession(), match = createInitialMatch()) {
    this.session = session;
    this.match = match;
    this.shot = new BilliardsShotInteraction({ onChange: () => this.emit(),
      onInteraction: (message) => { if (this.canInteract()) this.session.sendInteraction(message); },
      currentRevision: () => this.match.revision, nextSequence: () => this.nextSequence() });
    this.shot.synchronizeMatch(match);
  }

  public snapshot(): BilliardsControllerSnapshotV2 {
    const shot = this.shot.snapshot();
    return { match: this.match, ...shot, preview: this.preview(),
      connection: this.connection, canInteract: this.canInteract() };
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
    if (this.disposed) return;
    const options = readBilliardsSessionOptions(locationUrl);
    try {
      if (options.endpoint !== null) {
        this.connection = { state: states.connecting, detail: 'Подключение к комнате…' };
        this.emit();
        const module = await import('../network/colyseus-session.ts');
        if (this.disposed) return;
        await this.session.close();
        if (this.disposed) return;
        this.session = module.createColyseusBilliardsSession(options);
      }
      await this.session.connect(this.sessionListeners());
    } catch {
      await this.session.close().catch(() => undefined);
      if (this.disposed) return;
      this.session = createLocalBilliardsSession();
      this.connection = { state: states.unavailable, detail: 'Сервер недоступен · локальная тренировка' };
      this.pendingRevision = null;
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
    if (this.disposed || this.session.mode === 'colyseus' || this.match.activeShot === null) return;
    const result = this.playback.advance(this.match, deltaSeconds);
    if (result.match === this.match) return;
    this.match = result.match;
    this.shot.synchronizeMatch(this.match);
    this.emitFeedback(result.events);
    this.emit();
  }

  public setAimFromWorld(point: Vec2): void { if (this.canInteract()) this.shot.setAimFromWorld(this.match, point); }
  public setAngleRadians(value: number): void { if (this.canInteract()) this.shot.setAngle(value); }
  public adjustAngle(delta: number): void { if (this.canInteract()) this.shot.adjustAngle(delta); }
  public setPower(value: number): void { if (this.canInteract()) this.shot.setPower(value); }
  public adjustPower(delta: number): void { if (this.canInteract()) this.shot.adjustPower(delta); }
  public setSideSpin(value: number): void { this.setSpin(value, this.shot.snapshot().followSpin); }
  public setFollowSpin(value: number): void { this.setSpin(this.shot.snapshot().sideSpin, value); }
  public setSpin(side: number, follow: number): void { if (this.canInteract()) this.shot.setSpin(side, follow); }
  public setPlacementPreview(point: Vec2): void {
    if (this.canInteract() && this.match.ballInHand) this.shot.setPlacementPreview(this.match, point);
  }
  public lockAim(): boolean { return this.canInteract() && this.shot.lockAim(); }
  public unlockAim(): void { if (this.canInteract()) this.shot.unlockAim(); }
  public beginManualStroke(): boolean { return this.canInteract() && this.shot.beginManualStroke(); }
  public updateManualStroke(update: BilliardsManualStrokeUpdate): void {
    if (this.canInteract()) this.shot.updateManualStroke(update);
  }
  public cancelManualStroke(): void { this.shot.cancelManualStroke(); }
  public finishManualStroke(): boolean {
    if (!this.canInteract()) return false;
    const power = this.shot.finishManualStroke();
    if (power === null) return false;
    this.shot.setPower(power);
    return this.shoot();
  }
  public primaryAction(): boolean {
    return this.match.ballInHand ? this.confirmCuePlacement() : this.shoot();
  }

  public confirmCuePlacement(): boolean {
    if (!this.canInteract()) return false;
    const point = this.shot.consumeValidPlacement();
    if (point === null) return false;
    const result = positionCueBall(this.match, point);
    if (!result.accepted) return false;
    const command = createCuePlacementWireCommand(point, this.nextSequence(), this.match.revision);
    this.acceptOrAwait(result.match);
    this.session.sendCuePlacement(command);
    this.emit();
    return true;
  }

  public shoot(): boolean {
    if (!this.canInteract() || this.match.ballInHand) return false;
    const command = this.createShotCommand(this.nextSequence());
    const result = startMatchShot(this.match, command);
    if (!result.accepted) return false;
    const wire = createShotWireCommand(command, this.match.revision);
    const feedback = createCueFeedback(this.match, command.angleRadians, command.power);
    this.acceptOrAwait(result.match);
    this.session.sendShot(wire);
    if (feedback !== null) this.emitFeedback([feedback]);
    this.emit();
    return true;
  }

  public restart(): void {
    if (this.disposed || this.pendingRevision !== null || !this.ownsTurn()) return;
    const command = createRestartWireCommand(this.nextSequence(), this.match.revision);
    this.acceptOrAwait(restartMatch(this.match));
    this.playback.reset();
    this.shot.reset(this.match.ballInHand);
    this.session.sendRestart(command);
    this.emit();
  }

  private acceptOrAwait(match: BilliardsMatchState): void {
    if (this.session.mode === 'colyseus') this.pendingRevision = this.match.revision;
    else { this.match = match; this.shot.synchronizeMatch(match); }
  }

  private ownsTurn(): boolean {
    return this.session.mode === 'local' || (this.connection.state === states.online
      && this.connection.playerIndex === this.match.turnIndex);
  }

  private canInteract(): boolean {
    return !this.disposed && this.pendingRevision === null && this.ownsTurn()
      && this.connection.state !== states.connecting
      && this.match.phase !== billiardsMatchPhases.finished
      && this.match.activeShot === null && isTableAtRest(this.match.table);
  }

  private createShotCommand(clientSequence: number): BilliardsShotCommand {
    const { angleRadians, power, sideSpin, followSpin } = this.shot.snapshot();
    return { schemaVersion: 1, angleRadians, power, sideSpin, followSpin, clientSequence };
  }

  private preview(): BilliardsShotPreview {
    if (this.match.activeShot !== null || this.match.ballInHand) return { cuePath: [], objectPath: [], firstCollision: null };
    const command = this.createShotCommand(0);
    const key = `${command.angleRadians}:${command.power}:${command.sideSpin}:${command.followSpin}`;
    if (this.previewCache?.table !== this.match.table || this.previewCache.key !== key) {
      this.previewCache = { table: this.match.table, key, value: previewShot(this.match.table, command) };
    }
    return this.previewCache.value;
  }

  private nextSequence(): number { this.sequence += 1; return this.sequence; }
  private emit(): void {
    if (this.disposed) return;
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
  private emitFeedback(events: ReadonlyArray<BilliardsFeedbackEvent>): void {
    if (events.length === 0 || this.disposed) return;
    this.feedbackRevision += 1;
    for (const listener of this.feedbackListeners) listener({ revision: this.feedbackRevision, events });
  }

  private sessionListeners(): BilliardsSessionListeners {
    return {
      onSnapshot: (snapshot) => this.receiveSnapshot(snapshot),
      onRejected: (reason, snapshot) => {
        if (this.disposed || snapshot.revision < this.match.revision) return;
        this.pendingRevision = null;
        this.receiveSnapshot({ ...snapshot, status: reason });
      },
      onStatus: (status) => { if (!this.disposed) { this.connection = status; this.emit(); } },
      onInteraction: (message) => {
        if (!this.disposed && !this.ownsTurn()) this.shot.applyRemote(message, this.match);
      },
    };
  }

  private receiveSnapshot(snapshot: BilliardsMatchState): void {
    if (this.disposed || snapshot.revision < this.match.revision
      || (snapshot.revision === this.match.revision && snapshot.table.step < this.match.table.step)) return;
    if (this.pendingRevision !== null && snapshot.revision > this.pendingRevision) this.pendingRevision = null;
    this.match = snapshot;
    this.shot.synchronizeMatch(snapshot);
    this.emit();
  }
}
