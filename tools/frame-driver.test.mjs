import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { patchFrameDriver, frameDriverPatch } from './patch-frame-driver.mjs';
const installed = existsSync('.modoki-engine/node_modules/typescript');

function driver() {
  const require = createRequire(import.meta.url);
  const ts = require('../.modoki-engine/node_modules/typescript');
  const source = readFileSync(`.modoki-engine/${frameDriverPatch.path}`, 'utf8');
  const patched = patchFrameDriver(source);
  assert.equal(patchFrameDriver(patched), patched);
  const importsRemoved = patched.replace(/^import .*;\r?$/gm, '');
  const code = ts.transpileModule(importsRemoved, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let now = 1000, serial = 0;
  const frames = new Map(), intervals = new Map(), errors = [];
  const document = new EventTarget(), window = new EventTarget(); document.visibilityState = 'visible';
  const noop = () => {};
  const context = { exports: {}, document, window, console: { error: (...args) => errors.push(args), warn: noop },
    rawNow: () => now, setProfilerFrameCap: noop, beginProfilerFrame: noop, endProfilerFrame: noop,
    profileScope: (_key, callback) => callback(), beginBootSpan: () => 0, endBootSpan: noop, recordBootSpan: noop,
    recordMarkerFrame: noop, captureFrame: noop, recordCounterFrame: noop, pollGpuTimings: noop,
    recordFrame: () => ({ frameMs: 16, cpuMs: 1 }),
    requestAnimationFrame: (cb) => { frames.set(++serial, cb); return serial; },
    cancelAnimationFrame: (id) => frames.delete(id), setInterval: (cb) => { intervals.set(++serial, cb); return serial; },
    clearInterval: (id) => intervals.delete(id) };
  vm.runInNewContext(code, context);
  return { api: context.exports, frames, errors,
    frame() { now += 17; const queue = [...frames.values()]; frames.clear(); queue.forEach((cb) => cb(now)); },
    wait(ms) { now += ms; [...intervals.values()].forEach((cb) => cb()); },
    visibility(value) { document.visibilityState = value; document.dispatchEvent(new Event('visibilitychange')); },
    restore() { window.dispatchEvent(new Event('pageshow')); },
  };
}

test('frameDriver patch rejects unknown upstream source', () => {
  assert.throws(() => patchFrameDriver('unknown'), /Unreviewed/);
});
const options = { skip: !installed && 'Requires the pinned Modoki source and TypeScript (installed in CI).' };
test('tab resume and BFCache preserve refs and arm one frame, without a false stall', options, () => {
  const d = driver(); let calls = 0;
  d.api.registerFrameCallback('test', () => calls++, 0); d.api.startFrameDriver(); d.api.startFrameDriver(); d.frame();
  const before = calls;
  d.visibility('hidden'); d.wait(13000); assert.equal(d.frames.size, 0);
  d.visibility('visible'); d.wait(1); assert.equal(d.frames.size, 1); d.frame();
  assert.equal(calls, before + 1); assert.equal(d.errors.length, 0);
  d.restore(); d.restore(); assert.equal(d.frames.size, 1); d.frame();
  assert.equal(d.api.getFrameLoopHealth().refCount, 2);
  d.api.stopFrameDriver(); assert.equal(d.frames.size, 1);
  d.api.stopFrameDriver(); assert.equal(d.frames.size, 0);
});
test('event-loop suspension gets a grace frame; a genuinely lost chain still reports and recovers', options, () => {
  const d = driver(); d.api.startFrameDriver(); d.frame(); d.wait(12941);
  assert.equal(d.errors.length, 0); assert.equal(d.frames.size, 1); d.frame();
  d.frames.clear();
  for (let i = 0; i < 4; i++) d.wait(1000);
  assert.equal(d.errors.length, 1); assert.match(String(d.errors[0]), /FRAME LOOP STALLED/);
  assert.equal(d.frames.size, 1); d.frame(); assert.equal(d.api.getFrameLoopHealth().status, 'running');
  d.api.stopFrameDriver();
});
test('stale callback generations cannot double-tick ECS and exceptions remain reported', options, () => {
  const d = driver(); let calls = 0;
  d.api.registerFrameCallback('test', () => { calls++; throw new Error('intentional callback failure'); }, 0);
  d.api.startFrameDriver(); const stale = [...d.frames.values()][0];
  d.restore(); stale(1100); assert.equal(calls, 0); d.frame();
  assert.equal(calls, 1); assert.equal(d.errors.length, 1); assert.equal(d.frames.size, 1);
  d.api.stopFrameDriver();
});
