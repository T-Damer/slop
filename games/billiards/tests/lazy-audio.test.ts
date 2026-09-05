import assert from 'node:assert/strict';
import test from 'node:test';
import { BilliardsAudioEngine } from '../runtime/presentation/audio.ts';

test('lazy audio activates inside the gesture, handles mute during loading and never reopens disposed audio', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  let created = 0, resumed = 0, closed = 0, decoded = 0;
  class Context {
    public state = 'suspended';
    public sampleRate = 100;
    public constructor() { created++; }
    public async resume(): Promise<void> { resumed++; this.state = 'running'; }
    public async close(): Promise<void> { closed++; this.state = 'closed'; }
    public createBuffer(_channels: number, length: number) {
      decoded++; return { getChannelData: () => new Float32Array(length) };
    }
  }
  Object.defineProperty(globalThis, 'AudioContext', { value: Context, configurable: true });
  try {
    const audio = new BilliardsAudioEngine();
    assert.equal(created, 0); assert.equal(audio.state(), 'locked');
    const pending = audio.unlock();
    assert.equal(created, 1); assert.equal(resumed, 1, 'resume must occur before awaiting a chunk');
    audio.toggle(); await Promise.all([pending, audio.unlock()]);
    assert.equal(created, 1); assert.equal(decoded, 1); assert.equal(audio.state(), 'muted');
    audio.toggle(); assert.equal(audio.state(), 'ready');
    await audio.dispose(); await audio.unlock(); assert.equal(closed, 1); assert.equal(created, 1);
    const gone = new BilliardsAudioEngine();
    const loading = gone.unlock(); await gone.dispose(); await loading;
    assert.equal(closed, 2); assert.equal(decoded, 1, 'do not install a synth after route disposal');
  } finally {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original);
    else Reflect.deleteProperty(globalThis, 'AudioContext');
  }
});
