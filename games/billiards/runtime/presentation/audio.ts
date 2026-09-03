import type {
  BilliardsFeedbackBatch,
  BilliardsFeedbackEvent,
} from './feedback.ts';
import {
  billiardsAudioTuning,
  billiardsFeedbackKinds,
} from './registry.ts';

export interface BilliardsAudioDebugSnapshot {
  readonly enabled: boolean;
  readonly unlocked: boolean;
  readonly contextState: AudioContextState | 'unavailable';
  readonly cueEvents: number;
  readonly ballEvents: number;
  readonly cushionEvents: number;
  readonly pocketEvents: number;
  readonly queuedEvents: number;
  readonly activeVoices: number;
}

export class BilliardsAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private consumedRevision = -1;
  private enabled = true;
  private unlocked = false;
  private pendingEvents: BilliardsFeedbackEvent[] = [];
  private activeVoices = 0;
  private cueEvents = 0;
  private ballEvents = 0;
  private cushionEvents = 0;
  private pocketEvents = 0;

  public async unlock(): Promise<void> {
    if (this.context === null) {
      this.createGraph();
    }
    const context = this.context;
    if (context === null) {
      return;
    }
    try {
      if (context.state === 'suspended') {
        await context.resume();
      }
      this.unlocked = context.state === 'running';
      if (this.unlocked) {
        this.flushPending();
      }
    } catch {
      this.unlocked = false;
    }
  }

  public consume(batch: BilliardsFeedbackBatch): void {
    if (batch.revision === this.consumedRevision) {
      return;
    }
    this.consumedRevision = batch.revision;
    if (!this.enabled || batch.events.length === 0) {
      return;
    }
    if (!this.unlocked || this.context?.state !== 'running') {
      this.pendingEvents.push(...batch.events);
      this.pendingEvents = this.pendingEvents.slice(-billiardsAudioTuning.maximumVoices);
      return;
    }
    for (const event of batch.events) {
      this.playEvent(event);
    }
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.master !== null && this.context !== null) {
      this.master.gain.setTargetAtTime(
        this.enabled ? billiardsAudioTuning.masterGain : 0,
        this.context.currentTime,
        0.012,
      );
    }
    if (!this.enabled) {
      this.pendingEvents = [];
    }
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public debugSnapshot(): BilliardsAudioDebugSnapshot {
    return {
      enabled: this.enabled,
      unlocked: this.unlocked,
      contextState: this.context?.state ?? 'unavailable',
      cueEvents: this.cueEvents,
      ballEvents: this.ballEvents,
      cushionEvents: this.cushionEvents,
      pocketEvents: this.pocketEvents,
      queuedEvents: this.pendingEvents.length,
      activeVoices: this.activeVoices,
    };
  }

  public async dispose(): Promise<void> {
    const context = this.context;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.pendingEvents = [];
    this.unlocked = false;
    if (context !== null && context.state !== 'closed') {
      await context.close();
    }
  }

  private createGraph(): void {
    try {
      const context = new AudioContext({ latencyHint: 'interactive' });
      const master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      master.gain.value = this.enabled ? billiardsAudioTuning.masterGain : 0;
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.11;
      master.connect(compressor);
      compressor.connect(context.destination);
      this.context = context;
      this.master = master;
      this.noiseBuffer = createNoiseBuffer(context);
    } catch {
      this.context = null;
      this.master = null;
      this.noiseBuffer = null;
    }
  }

  private flushPending(): void {
    const queued = this.pendingEvents;
    this.pendingEvents = [];
    for (const event of queued) {
      this.playEvent(event);
    }
  }

  private playEvent(event: BilliardsFeedbackEvent): void {
    if (this.activeVoices >= billiardsAudioTuning.maximumVoices) {
      return;
    }
    if (event.kind === billiardsFeedbackKinds.cue) {
      this.cueEvents += 1;
      this.playCue(event);
    } else if (event.kind === billiardsFeedbackKinds.ball) {
      this.ballEvents += 1;
      this.playBallImpact(event);
    } else if (
      event.kind === billiardsFeedbackKinds.cushion
      || event.kind === billiardsFeedbackKinds.jaw
    ) {
      this.cushionEvents += 1;
      this.playCushion(event);
    } else {
      this.pocketEvents += 1;
      this.playPocket(event);
    }
  }

  private playCue(event: BilliardsFeedbackEvent): void {
    const intensity = event.intensity;
    this.playTone(
      billiardsAudioTuning.cueFrequency + intensity * 170,
      0.055,
      0.22 + intensity * 0.32,
      'triangle',
    );
    this.playTone(145 + intensity * 80, 0.09, 0.12 + intensity * 0.18, 'sine');
    this.playNoise(1100, 0.038, 0.08 + intensity * 0.14, 'bandpass');
  }

  private playBallImpact(event: BilliardsFeedbackEvent): void {
    const seed = event.ballIds.reduce((sum, id) => sum + id * 17, 0);
    const frequency = billiardsAudioTuning.ballMinimumFrequency
      + seed % billiardsAudioTuning.ballFrequencyRange;
    const gain = 0.08 + event.intensity * 0.3;
    this.playTone(frequency, 0.075, gain, 'sine');
    this.playTone(frequency * 1.71, 0.048, gain * 0.42, 'triangle');
  }

  private playCushion(event: BilliardsFeedbackEvent): void {
    const gain = 0.06 + event.intensity * 0.2;
    this.playTone(
      billiardsAudioTuning.cushionFrequency + event.intensity * 85,
      0.105,
      gain,
      'triangle',
    );
    this.playNoise(420, 0.07, gain * 0.5, 'lowpass');
  }

  private playPocket(event: BilliardsFeedbackEvent): void {
    const gain = 0.09 + event.intensity * 0.24;
    this.playTone(billiardsAudioTuning.pocketFrequency, 0.18, gain, 'sine');
    this.playNoise(260, 0.14, gain * 0.8, 'lowpass');
  }

  private playTone(
    frequency: number,
    duration: number,
    gainValue: number,
    type: OscillatorType,
  ): void {
    const context = this.context;
    const master = this.master;
    if (context === null || master === null || context.state !== 'running') {
      return;
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, frequency * 0.72),
      now + duration,
    );
    shapeVoice(gain.gain, now, duration, gainValue);
    oscillator.connect(gain);
    gain.connect(master);
    this.startVoice(oscillator, gain, now, duration);
  }

  private playNoise(
    frequency: number,
    duration: number,
    gainValue: number,
    filterType: BiquadFilterType,
  ): void {
    const context = this.context;
    const master = this.master;
    const buffer = this.noiseBuffer;
    if (context === null || master === null || buffer === null || context.state !== 'running') {
      return;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;
    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = filterType === 'bandpass' ? 7 : 1.2;
    shapeVoice(gain.gain, now, duration, gainValue);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    this.startVoice(source, gain, now, duration);
  }

  private startVoice(
    source: AudioScheduledSourceNode,
    gain: GainNode,
    now: number,
    duration: number,
  ): void {
    this.activeVoices += 1;
    source.addEventListener('ended', () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      source.disconnect();
      gain.disconnect();
    }, { once: true });
    source.start(now);
    source.stop(now + duration + billiardsAudioTuning.voiceReleaseSeconds);
  }
}

function shapeVoice(
  gain: AudioParam,
  now: number,
  duration: number,
  peak: number,
): void {
  gain.setValueAtTime(0.0001, now);
  gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.003);
  gain.exponentialRampToValueAtTime(0.0001, now + duration);
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.ceil(context.sampleRate * 0.25);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = 0x51f15e;
  for (let index = 0; index < data.length; index += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    data[index] = state / 0xffffffff * 2 - 1;
  }
  return buffer;
}
