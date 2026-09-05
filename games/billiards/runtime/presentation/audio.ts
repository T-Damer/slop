import type { BilliardsFeedbackBatch } from './feedback.ts';
import type { BilliardsAudioSynth, BilliardsAudioState } from './audio-voices.ts';

/** Create/resume the audio context inside the trusted gesture; load optional
 * synthesis only after sound is used. A disposed route never installs voices. */
export class BilliardsAudioEngine {
  private context: AudioContext | null = null;
  private voices: BilliardsAudioSynth | null = null;
  private loading: Promise<void> | null = null;
  private pending: BilliardsFeedbackBatch | null = null;
  private muted = false;
  private disposed = false;

  public state(): BilliardsAudioState {
    return this.muted ? 'muted' : this.voices?.state() ?? 'locked';
  }
  public isEnabled(): boolean { return !this.muted; }
  public async unlock(): Promise<void> {
    if (this.disposed) return;
    try {
      const context = this.context ??= new AudioContext({ latencyHint: 'interactive' });
      const resumed = context.state === 'suspended' ? context.resume() : Promise.resolve();
      this.loading ??= import('./audio-voices.ts').then(({ BilliardsAudioSynth }) => {
        if (this.disposed) return;
        this.voices = new BilliardsAudioSynth(context);
        if (this.muted) this.voices.toggle();
      });
      await Promise.all([this.loading, resumed]);
      if (this.pending !== null) { this.voices?.consume(this.pending); this.pending = null; }
    } catch {
      this.loading = null; this.pending = null;
      // Unavailable audio must not block aiming or the deterministic shot.
    }
  }
  public toggle(): boolean { this.muted = !this.muted; this.voices?.toggle(); return !this.muted; }
  public playDialTick(): void { this.voices?.playDialTick(); }
  public consume(batch: BilliardsFeedbackBatch): void {
    if (this.disposed) return;
    if (this.voices !== null) this.voices.consume(batch);
    else if (this.loading !== null) this.pending = batch;
  }
  public async dispose(): Promise<void> {
    this.disposed = true; this.pending = null;
    if (this.voices !== null) await this.voices.dispose();
    else if (this.context !== null && this.context.state !== 'closed') await this.context.close();
    this.voices = null; this.context = null;
  }
}
