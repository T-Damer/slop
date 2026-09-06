import assert from 'node:assert/strict';
import test from 'node:test';
import { BilliardsAudioEngine } from '../runtime/presentation/audio.ts';

test('recordings load only after a gesture, share decoding, cap voices and stop on mute/disposal', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const originalFetch = globalThis.fetch;
  let created = 0, resumed = 0, closed = 0, decoded = 0, requests = 0, stopped = 0;
  const starts: number[][] = [];
  class Node {
    public value = 0;
    public gain = this; public pan = this; public threshold = this; public ratio = this;
    public attack = this; public release = this; public frequency = this;
    public onended: (() => void) | null = null;
    public connect(_target: unknown) { return this; }
    public disconnect() {}
    public setValueAtTime(value: number) { this.value = value; }
    public start(...args: number[]) { starts.push(args); }
    public stop() { stopped++; this.onended?.(); }
  }
  class Context {
    public state = 'suspended'; public currentTime = 0; public destination = new Node();
    public constructor() { created++; }
    public async resume() { resumed++; this.state = 'running'; }
    public async close() { closed++; this.state = 'closed'; }
    public createGain() { return new Node(); }
    public createStereoPanner() { return new Node(); }
    public createDynamicsCompressor() { return new Node(); }
    public createBufferSource() { return new Node(); }
    public createOscillator() { return new Node(); }
    public async decodeAudioData() { decoded++; return { duration: 1.4 }; }
  }
  Object.defineProperty(globalThis, 'AudioContext', { value: Context, configurable: true });
  globalThis.fetch = async () => { requests++; return new Response(new Uint8Array([1, 2])); };
  try {
    const audio = new BilliardsAudioEngine();
    assert.equal(created, 0); assert.equal(requests, 0); assert.equal(audio.state(), 'locked');
    const loading = audio.unlock();
    assert.equal(created, 1); assert.equal(resumed, 1, 'resume before awaiting chunks or downloads');
    audio.toggle(); await Promise.all([loading, audio.unlock()]);
    assert.equal(requests, 1); assert.equal(decoded, 1); assert.equal(audio.state(), 'muted');
    audio.toggle(); assert.equal(audio.state(), 'ready');
    for (let revision = 0; revision < 30; revision++) audio.consume({ revision,
      events: [{ kind: 'ball-contact', intensity: 1, position: { x: 0, y: 0 } }] });
    assert.equal(starts.length, 16, 'bounded polyphony across batches');
    assert.deepEqual(starts[0]?.slice(1), [0.25, 0.239], 'ball event uses recorded sprite section');
    audio.toggle(); assert.equal(stopped, 16, 'mute stops scheduled and playing nodes');
    await audio.dispose(); await audio.unlock(); assert.equal(closed, 1); assert.equal(created, 1);
    const gone = new BilliardsAudioEngine();
    const pending = gone.unlock(); await gone.dispose(); await pending;
    assert.equal(closed, 2); assert.equal(decoded, 1, 'no decoding after route disposal');
  } finally {
    globalThis.fetch = originalFetch;
    if (original) Object.defineProperty(globalThis, 'AudioContext', original);
    else Reflect.deleteProperty(globalThis, 'AudioContext');
  }
});
