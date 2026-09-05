import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const compilerPath = process.env.SLOP_TEST_TYPESCRIPT ?? '../.modoki-engine/node_modules/typescript';
let compiler;
try { compiler = require(compilerPath); } catch { /* The pinned toolchain is installed in CI. */ }
const options = { skip: !compiler && 'Requires the pinned TypeScript toolchain.' };

/** Execute the real bootstrap with eager callback owners and a minimal DOM.
 * This tests initialization/lifetime, not pixels or real browser behavior. */
function bootstrap({ failControls = false, qa = false } = {}) {
  const calls = [], cleanups = [], listeners = new Set();
  const source = readFileSync('games/billiards/runtime/presentation/app-v2.ts', 'utf8');
  const javascript = compiler.transpileModule(source, { compilerOptions: {
    module: compiler.ModuleKind.CommonJS, target: compiler.ScriptTarget.ES2022,
  } }).outputText;
  const snapshot = { match: { activeShot: null } };
  const view = { root: { connected: false, remove() { this.connected = false; calls.push('remove'); } },
    stage: {}, canvas: { focus() { calls.push('focus'); } }, zoom: {} };
  let qualityReady = false, frameReady = false;
  const signal = (value) => [() => value, (next) => { value = next; return next; }];
  class Controller {
    snapshot() { return snapshot; }
    subscribe(listener) { assert.ok(frameReady); listener(snapshot); listeners.add(listener); return () => listeners.delete(listener); }
    subscribeFeedback() { return () => calls.push('unfeedback'); }
    async start() { calls.push('connect'); }
    async dispose() { calls.push('disconnect'); }
    advance() { calls.push('advance'); }
  }
  class Audio { isEnabled() { return true; } async dispose() { calls.push('audio-close'); } }
  class Pockets { clear() { calls.push('pockets-clear'); } synchronize() {} }
  class Renderer { draw() { calls.push('draw'); } }
  class Camera {
    constructor() { assert.ok(view.root.connected, 'camera must observe an attached stage'); calls.push('camera'); }
    advance() {} synchronize() {} dispose() { calls.push('camera-close'); }
  }
  class Quality { constructor() { qualityReady = true; } mode() { return 'low'; } shouldRender() { return true; } }
  class Loop {
    constructor(options) { this.options = options; frameReady = true; }
    start() { calls.push('frames-start'); this.options.onFrame(100, 0.016); }
    stop() { calls.push('frames-stop'); }
  }
  const media = { matches: true, addEventListener() {}, removeEventListener() {} };
  const window = { addEventListener() {}, removeEventListener() {} };
  const modules = {
    'solid-js': { createSignal: signal, createEffect: (callback) => callback(),
      onCleanup: (callback) => cleanups.push(callback),
      createRoot: (callback) => { let disposed = false; callback(() => {
        if (disposed) return; disposed = true;
        for (const cleanup of cleanups.reverse()) cleanup();
      }); } },
    '../../../shared/game-shell/graphics-settings.ts': {
      prefersReducedMotion: () => false,
      graphicsSettings: { subscribe(callback) { assert.ok(qualityReady && frameReady);
        callback(); listeners.add(callback); return () => listeners.delete(callback); } },
    },
    './controller-v2.ts': { BilliardsGameControllerV2: Controller },
    './audio.ts': { BilliardsAudioEngine: Audio },
    './effects-renderer.ts': { BilliardsEffectsRenderer: class {} },
    './pocket-journey.ts': { BilliardsPocketJourney: Pockets },
    './canvas-renderer-v2.ts': { BilliardsCanvasRendererV2: Renderer },
    './table-camera.ts': { BilliardsTableCamera: Camera },
    './adaptive-quality-v2.ts': { BilliardsAdaptiveQuality: Quality },
    './frame-loop-v2.ts': { BilliardsFrameLoop: Loop },
    './view-elements.ts': { createBilliardsViewElements: () => view },
    './view-state-v2.ts': { updateBilliardsViewV2() { calls.push('view'); } },
    './control-input-v2.ts': { bindBilliardsControlsV2() {
      if (failControls) throw new Error('binding failed');
      return () => calls.push('unbind');
    } },
    './registry.ts': { billiardsCopy: { title: 'Pocket Club' }, billiardsUiIds: {} },
    './pocket-club.css': {},
    './qa-bridge-v2.ts': { installQaBridge() { window.__SLOP_BILLIARDS_QA_V2__ = {}; } },
  };
  const context = { exports: {}, window, URLSearchParams, performance: { now: () => 100 },
    location: { search: qa ? '?qa=1' : '', origin: 'https://example.test' },
    document: { getElementById: () => null }, matchMedia: () => media,
    require(id) { assert.ok(id in modules, `Unexpected dependency ${id}`); return modules[id]; } };
  vm.runInNewContext(javascript, context);
  return { api: context.exports, calls, listeners, view, window,
    parent: { append() { view.root.connected = true; calls.push('attach'); } } };
}

test('billiards attaches DOM before observers and initializes owners before eager subscribers', options, () => {
  const b = bootstrap();
  b.api.mountBilliards(b.parent);
  assert.ok(b.calls.indexOf('attach') < b.calls.indexOf('camera'));
  assert.ok(b.calls.includes('draw'));
  b.api.unmountBilliards();
  assert.equal(b.listeners.size, 0);
  assert.equal(b.view.root.connected, false);
  assert.ok(b.calls.includes('frames-stop') && b.calls.includes('camera-close'));
});
test('partial startup failure rolls back resources and remains retryable', options, () => {
  const b = bootstrap({ failControls: true });
  assert.throws(() => b.api.mountBilliards(b.parent), /binding failed/);
  assert.equal(b.listeners.size, 0);
  assert.equal(b.view.root.connected, false);
  for (const resource of ['frames-stop', 'camera-close', 'pockets-clear', 'audio-close', 'disconnect']) {
    assert.ok(b.calls.includes(resource), resource);
  }
  b.api.unmountBilliards();
  assert.equal(b.calls.filter((call) => call === 'disconnect').length, 1);
});
test('late QA chunk cannot install after unmount; normal play does not install QA', options, async () => {
  const b = bootstrap({ qa: true });
  b.api.mountBilliards(b.parent); b.api.unmountBilliards();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(b.window.__SLOP_BILLIARDS_QA_V2__, undefined);
  const normal = bootstrap(); normal.api.mountBilliards(normal.parent);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(normal.window.__SLOP_BILLIARDS_QA_V2__, undefined);
  normal.api.unmountBilliards();
});
