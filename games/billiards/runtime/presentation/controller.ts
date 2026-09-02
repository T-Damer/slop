import {
  advanceMatchShot,
  createInitialMatch,
  positionCueBall,
  restartMatch,
  startMatchShot,
} from '../domain/match.ts';
import { billiardsMatchPhases, billiardsPhysics, billiardsRules } from '../domain/registry.ts';
import { previewShot } from '../domain/shot.ts';
import { isTableAtRest } from '../domain/simulator.ts';
import type {
  BilliardsMatchState,
  BilliardsShotCommand,
  BilliardsShotPreview,
  Vec2,
} from '../domain/types.ts';
import { billiardsConnectionStates } from '../network/registry.ts';
import {
  createCuePlacementWireCommand,
  createRestartWireCommand,
  createShotWireCommand,
  readBilliardsSessionOptions,
  type BilliardsSession,
  type BilliardsSessionStatus,
} from '../network/session.ts';
import { createLocalBilliardsSession } from '../network/local-session.ts';

export interface BilliardsControllerSnapshot {
  readonly match: BilliardsMatchState;
  readonly preview: BilliardsShotPreview;
  readonly angleRadians: number;
  readonly power: number;
  readonly sideSpin: number;
  readonly followSpin: number;
  readonly connection: BilliardsSessionStatus;
}

type SnapshotListener = (snapshot: BilliardsControllerSnapshot) => void;

export class BilliardsGameController {
  private match = createInitialMatch();
  private angleRadians = 0;
  private power = 0.68;
  private sideSpin = 0;
  private followSpin = 0;
  private connection: BilliardsSessionStatus = {
    state: billiardsConnectionStates.local,
    detail: 'Локальная тренировка',
  };
  private clientSequence = 0;
  private session: BilliardsSession = createLocalBilliardsSession();
  private readonly listeners = new Set<SnapshotListener>();
  private animationFrame = 0;
  private lastFrameMs = 0;
  private accumulatorSeconds = 0;
  private disposed = false;

  public snapshot(): BilliardsControllerSnapshot {
    const command = this.createShotCommand(this.clientSequence);
    return {
      match: this.match,
      preview: previewShot(this.match.table, command),
      angleRadians: this.angleRadians,
      power: this.power,
      sideSpin: this.sideSpin,
      followSpin: this.followSpin,
      connection: this.connection,
    };
  }

  public subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  public async start(locationUrl: string): Promise<void> {
    this.disposed = false;
    this.lastFrameMs = performance.now();
    this.animationFrame = requestAnimationFrame(this.tick);
    const options = readBilliardsSessionOptions(locationUrl);
    if (options.endpoint === null) {
      await this.session.connect(this.sessionListeners());
      return;
    }
    try {
      const module = await import('../network/colyseus-session.ts');
      this.session = module.createColyseusBilliardsSession(options);
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
    cancelAnimationFrame(this.animationFrame);
    this.listeners.clear();
    await this.session.close();
  }

  public setAimFromWorld(point: Vec2): void {
    if (!this.canAdjustShot()) {
      return;
    }
    const cue = this.match.table.balls.find((ball) => ball.id === 0 && !ball.pocketed);
    if (cue === undefined) {
      return;
    }
    const delta = { x: point.x - cue.position.x, y: point.y - cue.position.y };
    if (Math.hypot(delta.x, delta.y) < billiardsPhysics.ballRadius) {
      return;
    }
    this.angleRadians = Math.atan2(delta.y, delta.x);
    this.emit();
  }

  public adjustAngle(deltaRadians: number): void {
    if (!this.canAdjustShot()) {
      return;
    }
    this.angleRadians = normalizeAngle(this.angleRadians + deltaRadians);
    this.emit();
  }

  public setPower(value: number): void {
    this.power = clamp(value, billiardsRules.minimumPower, billiardsRules.maximumPower);
    this.emit();
  }

  public setSideSpin(value: number): void {
    this.sideSpin = clamp(value, -billiardsRules.maximumSpin, billiardsRules.maximumSpin);
    this.emit();
  }

  public setFollowSpin(value: number): void {
    this.followSpin = clamp(value, -billiardsRules.maximumSpin, billiardsRules.maximumSpin);
    this.emit();
  }

  public placeCue(point: Vec2): boolean {
    const result = positionCueBall(this.match, point);
    if (!result.accepted) {
      this.match = { ...this.match, status: result.reason };
      this.emit();
      return false;
    }
    const sequence = this.nextSequence();
    this.match = result.match;
    this.session.sendCuePlacement(createCuePlacementWireCommand(
      point,
      sequence,
      result.match.revision - 1,
    ));
    this.emit();
    return true;
  }

  public shoot(): boolean {
    const sequence = this.nextSequence();
    const command = this.createShotCommand(sequence);
    const expectedRevision = this.match.revision;
    const result = startMatchShot(this.match, command);
    if (!result.accepted) {
      this.match = { ...this.match, status: result.reason };
      this.emit();
      return false;
    }
    this.match = result.match;
    this.session.sendShot(createShotWireCommand(command, expectedRevision));
    this.emit();
    return true;
  }

  public restart(): void {
    const sequence = this.nextSequence();
    const expectedRevision = this.match.revision;
    this.match = restartMatch(this.match);
    this.angleRadians = 0;
    this.sideSpin = 0;
    this.followSpin = 0;
    this.accumulatorSeconds = 0;
    this.session.sendRestart(createRestartWireCommand(sequence, expectedRevision));
    this.emit();
  }

  private readonly tick = (nowMs: number): void => {
    if (this.disposed) {
      return;
    }
    const elapsed = Math.min(0.1, Math.max(0, (nowMs - this.lastFrameMs) / 1000));
    this.lastFrameMs = nowMs;
    this.accumulatorSeconds += elapsed;
    let changed = false;
    for (
      let step = 0;
      step < billiardsPhysics.maximumFrameSteps
        && this.accumulatorSeconds >= billiardsPhysics.fixedStepSeconds
        && this.match.activeShot !== null;
      step += 1
    ) {
      this.match = advanceMatchShot(this.match);
      this.accumulatorSeconds -= billiardsPhysics.fixedStepSeconds;
      changed = true;
    }
    if (this.match.activeShot === null) {
      this.accumulatorSeconds = 0;
    }
    if (changed) {
      this.emit();
    }
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private sessionListeners() {
    return {
      onSnapshot: (snapshot: BilliardsMatchState): void => {
        if (snapshot.revision >= this.match.revision) {
          this.match = snapshot;
          this.emit();
        }
      },
      onRejected: (reason: string, snapshot: BilliardsMatchState): void => {
        this.match = { ...snapshot, status: reason };
        this.emit();
      },
      onStatus: (status: BilliardsSessionStatus): void => {
        this.connection = status;
        this.emit();
      },
    };
  }

  private canAdjustShot(): boolean {
    return this.match.phase !== billiardsMatchPhases.finished
      && this.match.activeShot === null
      && isTableAtRest(this.match.table);
  }

  private createShotCommand(clientSequence: number): BilliardsShotCommand {
    return {
      schemaVersion: 1,
      angleRadians: this.angleRadians,
      power: this.power,
      sideSpin: this.sideSpin,
      followSpin: this.followSpin,
      clientSequence,
    };
  }

  private nextSequence(): number {
    this.clientSequence += 1;
    return this.clientSequence;
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeAngle(value: number): number {
  const fullCircle = Math.PI * 2;
  return ((value + Math.PI) % fullCircle + fullCircle) % fullCircle - Math.PI;
}
