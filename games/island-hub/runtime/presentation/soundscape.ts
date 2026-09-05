import type { SoundMix, SoundBus } from '../domain/sound-settings.ts';
import type { IslandSurface } from '../domain/village-paths.ts';
import { islandScore as score, scoreTheme, noteFrequency, type IslandSoundEvent } from './audio-score.ts';
import { createIslandNoise, playIslandVoice, type SoundVoice } from './audio-voices.ts';

/** One island context, lazily gesture-unlocked and disconnected before a game handoff. */
export class IslandSoundscape {
  private context: AudioContext | null = null;
  private buses: Record<SoundBus, GainNode> | null = null;
  private noise: AudioBuffer | null = null;
  private ambience: AudioBufferSourceNode | null = null;
  private ambienceFilter: BiquadFilterNode | null = null;
  private ambienceLevel: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private readonly meter = new Uint8Array(128);
  private readonly voices = new Set<SoundVoice>();
  private readonly musicLayers: GainNode[] = [];
  private paused = false;
  private disposed = false;
  private indoors = false;
  private nextBeat = 0;
  private beat = 0;
  private footsteps = 0;
  private stepVariant = 0;
  private played = 0;
  private theme = scoreTheme(12);
  public constructor(private readonly root: HTMLElement, private mix: SoundMix) {
    root.addEventListener('pointerdown', this.gesture);
    window.addEventListener('keydown', this.gesture);
  }
  public snapshot() {
    const analyser = this.analyser;
    analyser?.getByteTimeDomainData(this.meter);
    const level = analyser === null ? 0 : Math.sqrt(this.meter.reduce((sum, value) => sum + (value - 128) ** 2, 0)
      / this.meter.length) / 128;
    return { status: this.context?.state ?? 'locked', voices: this.voices.size, played: this.played,
      indoors: this.indoors, theme: this.theme, mix: { ...this.mix }, level };
  }
  public setMix(mix: SoundMix): void {
    this.mix = mix;
    const context = this.context;
    if (context === null || this.buses === null) return;
    for (const bus of Object.keys(this.buses) as SoundBus[]) {
      this.buses[bus].gain.setTargetAtTime(this.paused ? 0 : mix[bus], context.currentTime, score.fadeSeconds);
    }
  }
  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      for (const voice of [...this.voices]) voice.stop();
      if (this.buses !== null && this.context !== null) this.buses.master.gain.value = 0;
      void this.context?.suspend().catch(() => {});
    } else if (this.context !== null) {
      this.nextBeat = this.context.currentTime;
      this.setMix(this.mix);
      // Returning focus is not necessarily an autoplay gesture. A later gesture retries.
      void this.context.resume().then(() => { if (this.paused) void this.context?.suspend(); }).catch(() => {});
    }
  }
  public setIndoors(indoors: boolean): void {
    this.indoors = indoors;
    this.footsteps = 0;
    const time = this.context?.currentTime ?? 0;
    this.musicLayers.forEach((layer, index) => layer.gain.setTargetAtTime(Number(index === Number(indoors)), time, score.fadeSeconds));
  }
  public step(distance: number, surface: IslandSurface): void {
    if (!Number.isFinite(distance) || distance <= 0) return;
    this.footsteps += distance;
    if (this.footsteps < score.stepDistance) return;
    this.footsteps %= score.stepDistance;
    const recipe = score.surfaces[surface];
    this.stepVariant = (this.stepVariant + 1) % 5;
    this.voice(recipe.frequency * (0.92 + this.stepVariant * 0.04), recipe.duration,
      recipe.gain, 'effects', true);
    if (surface === 'wood' || surface === 'path') this.voice(recipe.frequency / 2, 0.09, recipe.gain / 3, 'effects');
  }
  public event(kind: IslandSoundEvent): void {
    const [frequency, duration, volume] = score.effects[kind];
    this.voice(frequency, duration, volume, 'effects');
    if (kind === 'door' || kind === 'planting') this.voice(frequency * 2, duration, volume / 2, 'effects', true);
    if (kind === 'harvest') this.voice(frequency * 1.25, duration, volume / 2, 'effects', false, 0.1);
  }
  public update(hour: number, shoreDistance: number): void {
    const context = this.context;
    if (this.paused || context?.state !== 'running') return;
    this.theme = scoreTheme(hour);
    const now = context.currentTime;
    const ambient = this.indoors ? 0.045 : 0.09 + Math.max(0, 1 - shoreDistance / 4) * 0.2;
    this.ambienceLevel?.gain.setTargetAtTime(ambient * (0.85 + Math.sin(now * 0.35) * 0.15), now, score.fadeSeconds);
    if (this.nextBeat < now - score.lookAheadSeconds) this.nextBeat = now;
    for (let i = 0; i < score.maximumCatchupBeats && this.nextBeat < now + score.lookAheadSeconds; i += 1) {
      this.scheduleBeat(this.nextBeat);
      this.beat = (this.beat + 1) % (score.beatsPerBar * score.barsPerPhrase);
      this.nextBeat += score.secondsPerMinute / score.beatsPerMinute;
    }
  }
  public dispose(): void {
    this.disposed = true;
    this.root.removeEventListener('pointerdown', this.gesture);
    window.removeEventListener('keydown', this.gesture);
    for (const voice of [...this.voices]) voice.stop();
    this.ambience?.stop(); this.ambience?.disconnect(); this.ambienceFilter?.disconnect();
    this.ambienceLevel?.disconnect(); this.analyser?.disconnect();
    for (const layer of this.musicLayers) layer.disconnect();
    if (this.buses !== null) for (const bus of Object.values(this.buses)) bus.disconnect();
    const context = this.context;
    this.context = null;
    if (context !== null && context.state !== 'closed') void context.close().catch(() => {});
  }
  private readonly gesture = (event: Event): void => {
    if (!event.isTrusted || this.paused || this.disposed) return;
    try {
      if (this.context === null) this.initialize();
      if (this.context?.state === 'suspended') void this.context.resume().then(() => {
        if (this.disposed || this.paused) void this.context?.suspend().catch(() => {});
      }).catch(() => {});
    } catch { /* Audio failure must never prevent movement or saving. */ }
  };
  private initialize(): void {
    const context = this.context = new AudioContext({ latencyHint: 'interactive' });
    const master = context.createGain();
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = this.meter.length;
    master.connect(this.analyser).connect(context.destination);
    this.buses = { master, music: context.createGain(), ambience: context.createGain(), effects: context.createGain() };
    for (const bus of ['music', 'ambience', 'effects'] as const) this.buses[bus].connect(master);
    for (let index = 0; index < 2; index += 1) {
      const layer = context.createGain(); layer.connect(this.buses.music); this.musicLayers.push(layer);
    }
    this.noise = createIslandNoise(context);
    this.ambience = context.createBufferSource();
    this.ambience.buffer = this.noise; this.ambience.loop = true;
    this.ambienceFilter = context.createBiquadFilter();
    this.ambienceFilter.type = 'lowpass'; this.ambienceFilter.frequency.value = 650;
    this.ambienceLevel = context.createGain(); this.ambienceLevel.gain.value = 0;
    this.ambience.connect(this.ambienceFilter).connect(this.ambienceLevel).connect(this.buses.ambience);
    this.ambience.start(); this.setMix(this.mix); this.setIndoors(this.indoors);
    this.nextBeat = context.currentTime;
  }
  private scheduleBeat(at: number): void {
    const theme = score.themes[this.theme];
    const bar = Math.floor(this.beat / score.beatsPerBar);
    const root = score.roots[bar % score.roots.length]! + theme.transpose;
    const delay = Math.max(0, at - (this.context?.currentTime ?? 0));
    if (this.beat % score.beatsPerBar === 0) {
      for (const interval of score.chord) this.voice(noteFrequency(root + interval), 2.2, 0.024, 'music', false, delay);
    }
    if (this.beat % theme.spacing === 0) {
      const melody = this.indoors ? score.indoorMelody : score.melody;
      this.voice(noteFrequency(root + 12 + melody[(this.beat + bar) % melody.length]!), 0.65, 0.08, 'music', false, delay);
    }
  }
  private voice(frequency: number, duration: number, volume: number, bus: 'music' | 'effects', noise = false, delay = 0): void {
    const context = this.context;
    if (this.paused || this.disposed || context?.state !== 'running' || this.buses === null
      || this.mix.master === 0 || this.mix[bus] === 0 || this.voices.size >= score.voiceLimit) return;
    const destination = bus === 'music' ? this.musicLayers[Number(this.indoors)]! : this.buses.effects;
    const voice = playIslandVoice(context, destination, frequency, duration, volume,
      context.currentTime + delay, noise ? this.noise : null, (entry) => this.voices.delete(entry));
    this.voices.add(voice); this.played += 1;
  }
}
