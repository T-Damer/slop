import { billiardsPhysics } from '../domain/registry.ts';
import type { BilliardsFeedbackBatch } from './feedback.ts';
import { billiardsFeedbackKinds as kinds, billiardsFeedbackTuning as tuning } from './registry.ts';

export type BilliardsAudioState = 'locked' | 'ready' | 'muted';
const recordedAudio = {
  url: new URL('./assets/billiards-impacts.mp3?no-inline', import.meta.url).href,
  clips: { cue: [0, 0.20], ball: [0.25, 0.239], rail: [0.55, 0.25], pocket: [0.85, 0.49] },
  maximumVoices: 16, masterGain: 0.35,
} as const;

/** The historical class name is retained at the lazy boundary; impacts are now
 * exclusively recorded samples. Only the mechanical control detent is a tone. */
export class BilliardsAudioSynth {
  private buffer: AudioBuffer | null = null;
  private muted = false;
  private disposed = false;
  private consumedRevision = -1;
  private lastDialAt = -Infinity;
  private readonly voices = new Set<AudioScheduledSourceNode>();
  private readonly master: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly request = new AbortController();
  private loading: Promise<void> | null = null;

  private readonly context: AudioContext;
  public constructor(context: AudioContext) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = recordedAudio.masterGain;
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -15; this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.002; this.compressor.release.value = 0.08;
    this.master.connect(this.compressor).connect(context.destination);
  }

  public load(): Promise<void> {
    return this.loading ??= fetch(recordedAudio.url, { signal: this.request.signal })
      .then(response => { if (!response.ok) throw new Error('Missing billiards audio'); return response.arrayBuffer(); })
      .then(bytes => this.context.decodeAudioData(bytes))
      .then(buffer => { if (!this.disposed) this.buffer = buffer; })
      .catch(() => { this.loading = null; });
  }

  public state(): BilliardsAudioState {
    return this.muted ? 'muted' : this.buffer !== null && this.context.state === 'running' ? 'ready' : 'locked';
  }
  public toggle(): boolean {
    this.muted = !this.muted;
    this.master.gain.value = this.muted ? 0 : recordedAudio.masterGain;
    if (this.muted) this.stopVoices();
    return !this.muted;
  }
  public playDialTick(): void {
    const now = this.context.currentTime;
    if (!this.canPlay() || now - this.lastDialAt < 0.025) return;
    this.lastDialAt = now;
    const tone = this.context.createOscillator();
    tone.type = 'triangle'; tone.frequency.value = 720;
    this.startVoice(tone, 0.055, 0, now, () => { tone.start(now); tone.stop(now + 0.012); });
  }
  public consume(batch: BilliardsFeedbackBatch): void {
    if (batch.revision <= this.consumedRevision) return;
    this.consumedRevision = batch.revision;
    if (!this.canPlay() || this.buffer === null) return;
    batch.events.slice(0, tuning.maximumSoundsPerBatch).forEach((event, index) => {
      if (this.voices.size >= recordedAudio.maximumVoices) return;
      const key = event.kind === kinds.cue ? 'cue' : event.kind === kinds.ball ? 'ball'
        : event.kind === kinds.pocket ? 'pocket' : 'rail';
      const [offset, duration] = recordedAudio.clips[key];
      const source = this.context.createBufferSource(); source.buffer = this.buffer;
      const start = this.context.currentTime + index * tuning.soundSpacingSeconds;
      const level = Math.max(0, Math.min(1, event.power ?? event.intensity));
      const pan = Math.max(-tuning.maximumStereoPan, Math.min(tuning.maximumStereoPan,
        event.position.x / (billiardsPhysics.tableWidth / 2)));
      this.startVoice(source, 0.06 + level * 0.24, pan, start, () => source.start(start, offset, duration));
    });
  }
  public async dispose(): Promise<void> {
    this.disposed = true; this.request.abort(); this.stopVoices(); this.buffer = null;
    this.master.disconnect(); this.compressor.disconnect();
    if (this.context.state !== 'closed') await this.context.close();
  }
  private startVoice(source: AudioScheduledSourceNode, volume: number, pan: number, start: number,
    play: () => void): void {
    if (this.voices.size >= recordedAudio.maximumVoices) { source.disconnect(); return; }
    const gain = this.context.createGain(), panner = this.context.createStereoPanner();
    gain.gain.setValueAtTime(volume, start); panner.pan.value = pan;
    source.connect(gain).connect(panner).connect(this.master);
    this.voices.add(source);
    source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); panner.disconnect(); };
    play();
  }
  private stopVoices(): void {
    for (const source of this.voices) source.stop();
    this.voices.clear();
  }
  private canPlay(): boolean { return !this.disposed && !this.muted && this.context.state === 'running'; }
}
