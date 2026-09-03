import {
  billiardsCollisionKinds,
  billiardsPhysics,
} from '../domain/registry.ts';
import type {
  BilliardsCollisionEvent,
  BilliardsTableState,
} from '../domain/types.ts';
import type { BilliardsControllerSnapshot } from './controller.ts';

export type BilliardsAudioState = 'locked' | 'ready' | 'muted';

interface BilliardsImpactSound {
  readonly level: number;
  readonly pan: number;
}

export class BilliardsAudio {
  private context: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private previousShotActive = false;

  public state(): BilliardsAudioState {
    if (this.muted) return 'muted';
    return this.context === null ? 'locked' : 'ready';
  }

  public unlock(): void {
    if (this.context === null) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.noiseBuffer = createNoiseBuffer(this.context);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  public toggleMuted(): BilliardsAudioState {
    if (this.context === null && !this.muted) {
      this.unlock();
      this.playTone(760, 0.045, 0.07, 'sine', 0, 0);
      return this.state();
    }
    this.muted = !this.muted;
    if (!this.muted) {
      this.unlock();
      this.playTone(760, 0.045, 0.07, 'sine', 0, 0);
    }
    return this.state();
  }

  public update(snapshot: BilliardsControllerSnapshot): void {
    const shotActive = snapshot.match.activeShot !== null;
    if (!this.previousShotActive && shotActive) this.playCueStrike(snapshot.power);
    this.previousShotActive = shotActive;
    if (snapshot.recentEvents.length > 0) {
      this.playCollisionEvents(snapshot.recentEvents, snapshot.match.table);
    }
  }

  public async dispose(): Promise<void> {
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

  private playCollisionEvents(
    events: ReadonlyArray<BilliardsCollisionEvent>,
    table: BilliardsTableState,
  ): void {
    if (!this.canPlay()) return;
    let scheduled = 0;
    for (const event of events) {
      if (scheduled >= 7) break;
      const impact = readImpactSound(event, table);
      const delay = scheduled * 0.005;
      if (event.kind === billiardsCollisionKinds.ball) {
        this.playBallClick(impact, delay);
      } else if (
        event.kind === billiardsCollisionKinds.cushion
        || event.kind === billiardsCollisionKinds.jaw
      ) {
        this.playCushionHit(impact, delay);
      } else if (event.kind === billiardsCollisionKinds.pocket) {
        this.playPocketDrop(impact.pan, delay);
      }
      scheduled += 1;
    }
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
    return !this.muted && this.context !== null;
  }
}

function readImpactSound(
  event: BilliardsCollisionEvent,
  table: BilliardsTableState,
): BilliardsImpactSound {
  const ids = event.kind === billiardsCollisionKinds.ball
    ? [event.leftBallId, event.rightBallId]
    : [event.ballId];
  const balls = ids.flatMap((id) => {
    const ball = table.balls.find((candidate) => candidate.id === id);
    return ball === undefined ? [] : [ball];
  });
  const speed = balls.reduce(
    (total, ball) => total + Math.hypot(ball.velocity.x, ball.velocity.y),
    0,
  );
  const x = balls.length === 0
    ? billiardsPhysics.tableWidth / 2
    : balls.reduce((total, ball) => total + ball.position.x, 0) / balls.length;
  return {
    level: Math.min(1, speed / (billiardsPhysics.maximumShotSpeed * 0.62)),
    pan: Math.max(-0.85, Math.min(0.85, x / billiardsPhysics.tableWidth * 1.7 - 0.85)),
  };
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
