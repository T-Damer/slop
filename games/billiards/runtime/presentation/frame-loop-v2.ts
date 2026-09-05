export interface BilliardsFrameLoopTelemetry {
  readonly running: boolean;
  readonly callbackCount: number;
  readonly recoveryCount: number;
  readonly lastFrameAtMs: number;
  readonly maximumObservedDeltaMs: number;
}

export interface BilliardsFrameLoopOptions {
  readonly onFrame: (nowMs: number, deltaSeconds: number) => void;
  readonly stallThresholdMs?: number;
  readonly maximumDeltaMs?: number;
}

const defaultFrameLoopTuning = {
  stallThresholdMs: 2200,
  maximumDeltaMs: 100,
  watchdogIntervalMs: 750,
} as const;

export class BilliardsFrameLoop {
  private readonly onFrame: BilliardsFrameLoopOptions['onFrame'];
  private readonly stallThresholdMs: number;
  private readonly maximumDeltaMs: number;
  private animationFrameId = 0;
  private watchdogId = 0;
  private generation = 0;
  private running = false;
  private callbackCount = 0;
  private recoveryCount = 0;
  private lastFrameAtMs = 0;
  private maximumObservedDeltaMs = 0;
  private readonly removeListeners: Array<() => void> = [];

  public constructor(options: BilliardsFrameLoopOptions) {
    this.onFrame = options.onFrame;
    this.stallThresholdMs = options.stallThresholdMs
      ?? defaultFrameLoopTuning.stallThresholdMs;
    this.maximumDeltaMs = options.maximumDeltaMs
      ?? defaultFrameLoopTuning.maximumDeltaMs;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameAtMs = performance.now();
    this.installRecoveryListeners();
    this.scheduleFreshChain(false);
    this.watchdogId = window.setInterval(
      () => this.recoverWhenStalled(),
      defaultFrameLoopTuning.watchdogIntervalMs,
    );
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;
    this.generation += 1;
    cancelAnimationFrame(this.animationFrameId);
    window.clearInterval(this.watchdogId);
    this.animationFrameId = 0;
    this.watchdogId = 0;
    for (const remove of this.removeListeners.splice(0)) remove();
  }

  public ensureRunning(): void {
    if (!this.running || document.visibilityState !== 'visible') return;
    const elapsed = performance.now() - this.lastFrameAtMs;
    if (elapsed >= this.stallThresholdMs) this.scheduleFreshChain(true);
  }

  public snapshot(): BilliardsFrameLoopTelemetry {
    return {
      running: this.running,
      callbackCount: this.callbackCount,
      recoveryCount: this.recoveryCount,
      lastFrameAtMs: this.lastFrameAtMs,
      maximumObservedDeltaMs: this.maximumObservedDeltaMs,
    };
  }

  private scheduleFreshChain(recovery: boolean): void {
    if (!this.running || document.visibilityState !== 'visible') return;
    this.generation += 1;
    const generation = this.generation;
    cancelAnimationFrame(this.animationFrameId);
    if (recovery) this.recoveryCount += 1;
    this.lastFrameAtMs = performance.now();
    this.animationFrameId = requestAnimationFrame(
      (nowMs) => this.tick(nowMs, generation),
    );
  }

  private tick(nowMs: number, generation: number): void {
    if (!this.running || generation !== this.generation) return;
    const rawDeltaMs = Math.max(0, nowMs - this.lastFrameAtMs);
    this.maximumObservedDeltaMs = Math.max(
      this.maximumObservedDeltaMs,
      rawDeltaMs,
    );
    this.lastFrameAtMs = nowMs;
    this.callbackCount += 1;
    if (!this.running || generation !== this.generation) return;
    this.animationFrameId = requestAnimationFrame(
      (nextNowMs) => this.tick(nextNowMs, generation),
    );
    this.onFrame(nowMs, Math.min(rawDeltaMs, this.maximumDeltaMs) / 1000);
  }

  private recoverWhenStalled(): void {
    if (!this.running || document.visibilityState !== 'visible') return;
    if (performance.now() - this.lastFrameAtMs >= this.stallThresholdMs) {
      this.scheduleFreshChain(true);
    }
  }

  private installRecoveryListeners(): void {
    this.addListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') this.scheduleFreshChain(false);
      else { this.generation += 1; cancelAnimationFrame(this.animationFrameId); }
    });
    this.addListener(window, 'pageshow', () => this.scheduleFreshChain(false));
    this.addListener(window, 'focus', () => this.ensureRunning());
    for (const eventName of ['pointerdown', 'keydown', 'touchstart'] as const) {
      this.addListener(window, eventName, () => this.ensureRunning(), true);
    }
  }

  private addListener(
    target: Window | Document,
    type: string,
    listener: EventListener,
    capture = false,
  ): void {
    target.addEventListener(type, listener, { capture, passive: true });
    this.removeListeners.push(() => target.removeEventListener(type, listener, capture));
  }
}
