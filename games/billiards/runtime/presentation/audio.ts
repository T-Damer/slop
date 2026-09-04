import { billiardsPhysics } from '../domain/registry.ts';
import type { BilliardsFeedbackBatch } from './feedback.ts';
import { billiardsFeedbackKinds as kinds, billiardsFeedbackTuning as tuning } from './registry.ts';

export type BilliardsAudioState = 'locked' | 'ready' | 'muted';

interface BilliardsImpactSound {
  readonly level: number;
  readonly pan: number;
}

export class BilliardsAudioEngine {
  private context: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private consumedRevision = -1;
  private disposed = false;

  public state(): BilliardsAudioState {
    if (this.muted) return 'muted';
    return this.context?.state === 'running' ? 'ready' : 'locked';
  }

  public isEnabled(): boolean { return !this.muted; }

  public async unlock(): Promise<void> {
    if (this.disposed) return;
    try {
      if (this.context === null) {
        this.context = new AudioContext({ latencyHint: 'interactive' });
        this.noiseBuffer = createNoiseBuffer(this.context);
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      // Audio can be unavailable or denied; input and rendering must keep working.
    }
  }

  public toggle(): boolean {
    this.muted = !this.muted;
    return this.isEnabled();
  }

  public consume(batch: BilliardsFeedbackBatch): void {
    if (batch.revision <= this.consumedRevision) return;
    this.consumedRevision = batch.revision;
    if (!this.canPlay()) return;
    batch.events.slice(0, tuning.maximumSoundsPerBatch).forEach((event, index) => {
      const delay = index * tuning.soundSpacingSeconds;
      const impact = { level: event.intensity, pan: Math.max(-tuning.maximumStereoPan,
        Math.min(tuning.maximumStereoPan, event.position.x / (billiardsPhysics.tableWidth / 2))) };
      if (event.kind === kinds.cue) this.playCueStrike(event.power ?? event.intensity);
      else if (event.kind === kinds.ball) this.playBallClick(impact, delay);
      else if (event.kind === kinds.pocket) this.playPocketDrop(impact.pan, delay);
      else this.playCushionHit(impact, delay);
    });
  }

  public async dispose(): Promise<void> {
    this.disposed = true;
    const context = this.context;
    this.context = null;
    this.noiseBuffer = null;
    if (context !== null && context.state !== 'closed') await context.close();
  }

  private playCueStrike(power: number): void {
    if (!this.canPlay()) return;
    const intensity = 0.18 + Math.min(1, Math.max(0, power)) * 0.28;
    this.playTone(145, 0.08, intensity, 'sine', 0, -0.42);
    this.playTone(520, 0.035, intensity * 0.3, 'triangle', 0.002, -0.42);
    this.playNoise(0.026, intensity * 0.24, 1900, 0, -0.42);
  }

  private playBallClick(impact: BilliardsImpactSound, delay: number): void {
    const volume = 0.038 + impact.level * 0.13;
    const pitch = 1180 + impact.level * 360;
    this.playTone(pitch, 0.052, volume, 'sine', delay, impact.pan);
    this.playTone(pitch * 1.86, 0.025, volume * 0.38, 'triangle', delay + 0.001, impact.pan);
    this.playNoise(0.018, volume * 0.24, 3300, delay, impact.pan);
  }

  private playCushionHit(impact: BilliardsImpactSound, delay: number): void {
    const volume = 0.035 + impact.level * 0.09;
    this.playTone(205 + impact.level * 90, 0.085, volume, 'sine', delay, impact.pan);
    this.playTone(620, 0.04, volume * 0.3, 'triangle', delay + 0.002, impact.pan);
    this.playNoise(0.036, volume * 0.28, 720, delay, impact.pan);
  }

  private playPocketDrop(pan: number, delay: number): void {
    this.playTone(86, 0.24, 0.13, 'sine', delay, pan);
    this.playTone(172, 0.15, 0.05, 'triangle', delay + 0.014, pan);
    this.playNoise(0.15, 0.075, 410, delay + 0.012, pan);
  }

  private playTone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    delay: number,
    pan: number,
  ): void {
    const context = this.context;
    if (context === null) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, frequency * 0.78),
      start + duration,
    );
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    panner.pan.setValueAtTime(pan, start);
    oscillator.connect(gain).connect(panner).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  private playNoise(
    duration: number,
    volume: number,
    cutoff: number,
    delay: number,
    pan: number,
  ): void {
    const context = this.context;
    const buffer = this.noiseBuffer;
    if (context === null || buffer === null) return;
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cutoff, start);
    filter.Q.setValueAtTime(1.2, start);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    panner.pan.setValueAtTime(pan, start);
    source.connect(filter).connect(gain).connect(panner).connect(context.destination);
    source.start(start, 0, duration);
  }

  private canPlay(): boolean {
    return !this.muted && this.context?.state === 'running';
  }
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.ceil(context.sampleRate * 0.25);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.72 + white * 0.28;
    data[index] = previous;
  }
  return buffer;
}
