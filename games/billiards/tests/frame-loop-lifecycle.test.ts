import assert from 'node:assert/strict';
import test from 'node:test';
import { BilliardsFrameLoop } from '../runtime/presentation/frame-loop-v2.ts';

test('frame callback errors cannot kill the RAF chain; hidden/resume and stale generations stay bounded', () => {
  const names = ['window', 'document', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] as const;
  const descriptors = names.map((name) => Object.getOwnPropertyDescriptor(globalThis, name));
  let now = 1000, id = 0, calls = 0, maxDelta = 0, shouldThrow = true;
  const frames = new Map<number, FrameRequestCallback>();
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const win = Object.assign(new EventTarget(), { setInterval: () => 1, clearInterval: () => {} });
  const values = [win, doc, { now: () => now }, (fn: FrameRequestCallback) => { frames.set(++id, fn); return id; },
    (key: number) => { frames.delete(key); }];
  names.forEach((name, index) => Object.defineProperty(globalThis, name, { value: values[index], configurable: true }));
  const loop = new BilliardsFrameLoop({ onFrame: (_time, delta) => {
    calls++; maxDelta = Math.max(maxDelta, delta);
    if (shouldThrow) throw new Error('test exception');
  } });
  const frame = (): void => { now += 17; const queued = [...frames.values()]; frames.clear(); queued.forEach((fn) => fn(now)); };
  try {
    loop.start(); loop.start(); assert.equal(frames.size, 1);
    assert.throws(frame, /test exception/); assert.equal(frames.size, 1);
    shouldThrow = false; frame(); assert.equal(calls, 2);
    const old = [...frames.values()][0]!;
    doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(frames.size, 0);
    now += 12941; doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange'));
    assert.equal(frames.size, 1); old(now); assert.equal(calls, 2);
    frame(); assert.equal(calls, 3); assert.ok(maxDelta <= 0.1);
    assert.equal(loop.snapshot().recoveryCount, 0);
    win.dispatchEvent(new Event('pageshow')); assert.equal(frames.size, 1);
    loop.stop(); assert.equal(frames.size, 0); win.dispatchEvent(new Event('pageshow')); assert.equal(frames.size, 0);
  } finally {
    loop.stop(); names.forEach((name, index) => {
      if (descriptors[index]) Object.defineProperty(globalThis, name, descriptors[index]!);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
});
