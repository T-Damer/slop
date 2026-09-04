export interface BilliardsFrameLoopSnapshot {
  readonly running: boolean;
  readonly recoveryCount: number;
  readonly lastFrameAgeMs: number;
}

type FrameCallback = (nowMs: number) => boolean;

const frameLoopTuning = {
  watchdogIntervalMs: 800,
  stalledFrameMs: 1800,
} as const;

export class BilliardsSimulationFrameLoop {
  private callback: FrameCallback | null = null;
  private animationFrame = 0;
  private framePending = false;
  private running = false;
  private lastFrameMs = 0;
  private recoveryCount = 0;
  private readonly watchdog: number;

  public constructor() {
    this.watchdog = window.setInterval(
      () => this.watchdogTick(),
      frameLoopTuning.watchdogIntervalMs,
    );
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pageshow', this.handlePageShow);
    window.addEventListener('focus', this.handleFocus);
  }

  public start(callback: FrameCallback): void {
    this.callback = callback;
    this.running = true;
    this.lastFrameMs = performance.now();
    this.schedule();
  }

  public stop(): void {
    this.running = false;
    this.callback = null;
    if (this.framePending) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.framePending = false;
    this.animationFrame = 0;
  }

  public pulse(): void {
    if (!this.running) {
      return;
    }
    const nowMs = performance.now();
    if (nowMs - this.lastFrameMs >= frameLoopTuning.stalledFrameMs) {
      this.recoveryCount += 1;
      this.lastFrameMs = nowMs;
      this.rearm();
    }
  }

  public snapshot(): BilliardsFrameLoopSnapshot {
    return {
      running: this.running,
      recoveryCount: this.recoveryCount,
      lastFrameAgeMs: this.lastFrameMs <= 0
        ? 0
        : Math.max(0, performance.now() - this.lastFrameMs),
    };
  }

  public dispose(): void {
    this.stop();
    window.clearInterval(this.watchdog);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pageshow', this.handlePageShow);
    window.removeEventListener('focus', this.handleFocus);
  }

  private readonly frame = (nowMs: number): void => {
    this.framePending = false;
    if (!this.running) {
      return;
    }
    this.lastFrameMs = nowMs;
    const keepRunning = this.callback?.(nowMs) ?? false;
    if (!keepRunning) {
      this.stop();
      return;
    }
    this.schedule();
  };

  private schedule(): void {
    if (!this.running || this.framePending) {
      return;
    }
    this.framePending = true;
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private rearm(): void {
    if (!this.running) {
      return;
    }
    if (this.framePending) {
      cancelAnimationFrame(this.animationFrame);
      this.framePending = false;
    }
    this.schedule();
  }

  private watchdogTick(): void {
    if (
      !this.running
      || document.visibilityState !== 'visible'
      || this.lastFrameMs <= 0
    ) {
      return;
    }
    if (performance.now() - this.lastFrameMs >= frameLoopTuning.stalledFrameMs) {
      this.recoveryCount += 1;
      this.lastFrameMs = performance.now();
      this.rearm();
    }
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible' || !this.running) {
      return;
    }
    this.lastFrameMs = performance.now();
    this.rearm();
  };

  private readonly handlePageShow = (): void => {
    if (!this.running) {
      return;
    }
    this.lastFrameMs = performance.now();
    this.rearm();
  };

  private readonly handleFocus = (): void => {
    this.pulse();
  };
}
