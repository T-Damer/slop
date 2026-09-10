import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraScale, cameraTuning, clampCamera, rotateCameraPoint, screenToScene } from '../runtime/presentation/camera-geometry.ts';
import { clientToCanvas } from '../runtime/presentation/coordinates.ts';
import { graphicsDefaults, graphicsSettings, normalizeGraphics, bindRendererGraphics } from '../../shared/game-shell/graphics-settings.ts';

for (const portrait of [true, false]) test(`zoom/pan drawing and cue input share exact coordinates (portrait=${portrait})`, () => {
  const width = portrait ? 378 : 1300, height = portrait ? 540 : 440;
  for (const zoom of [1, 1.7, 2.6]) {
    const pose = clampCamera({ x: 760, y: 300, zoom }, width, height, portrait);
    const scale = cameraScale(width, height, portrait) * pose.zoom;
    for (const point of [{ x: 640, y: 360 }, { x: 395, y: 245 }, { x: 1050, y: 590 }]) {
      const delta = rotateCameraPoint({ x: point.x - pose.x, y: point.y - pose.y }, portrait);
      const screen = { x: width / 2 + delta.x * scale, y: height / 2 + delta.y * scale };
      const roundtrip = screenToScene(screen, pose, width, height, portrait);
      assert.ok(Math.hypot(roundtrip.x - point.x, roundtrip.y - point.y) < 1e-9);
      const origin = rotateCameraPoint({ x: 640 - pose.x, y: 360 - pose.y }, portrait);
      const rect = { left: width / 2 + origin.x * scale - (portrait ? 720 : 1280) * scale / 2,
        top: height / 2 + origin.y * scale - (portrait ? 1280 : 720) * scale / 2,
        width: (portrait ? 720 : 1280) * scale, height: (portrait ? 1280 : 720) * scale };
      const cueInput = clientToCanvas(rect, screen, portrait)!;
      assert.ok(Math.hypot(cueInput.x - point.x, cueInput.y - point.y) < 1e-9);
    }
  }
});

test('camera remains bounded and overview centres the complete table', () => {
  for (const portrait of [true, false]) {
    const all = clampCamera({ x: 99999, y: -99999, zoom: 0.1 }, 390, 540, portrait);
    assert.equal(all.zoom, 1);
    assert.equal(all.x, cameraTuning.centre.x);
    assert.equal(all.y, cameraTuning.centre.y);
    const zoom = clampCamera({ x: 99999, y: -99999, zoom: 99 }, 390, 540, portrait);
    assert.equal(zoom.zoom, cameraTuning.maxZoom);
    assert.ok(zoom.x < cameraTuning.bounds.right && zoom.y > cameraTuning.bounds.top);
  }
});

test('graphics settings reject malformed storage and notify live subscribers without storage access', () => {
  assert.deepEqual(normalizeGraphics(null), graphicsDefaults);
  assert.deepEqual(normalizeGraphics({ quality: 'ultra', autoZoom: 'false', reducedMotion: 1 }), graphicsDefaults);
  assert.equal(normalizeGraphics({ quality: 'low' }).quality, 'low');
  let seen = '';
  const unsubscribe = graphicsSettings.subscribe((value) => { seen = value.quality; });
  graphicsSettings.set({ quality: 'low' }); assert.equal(seen, 'low');
  unsubscribe(); graphicsSettings.set({ quality: 'high' }); assert.equal(seen, 'low');
  graphicsSettings.set(graphicsDefaults);
});

test('shared renderer settings change actual resolution and shadows, and restore automatic defaults', () => {
  Object.defineProperty(globalThis, 'devicePixelRatio', { value: 2, configurable: true });
  let ratio = 1.5;
  const renderer = { getPixelRatio: () => ratio, setPixelRatio: (value: number) => { ratio = value; },
    shadowMap: { enabled: true, needsUpdate: false } };
  const remove = bindRendererGraphics(renderer);
  graphicsSettings.set({ quality: 'low' }); assert.equal(ratio, 0.85); assert.equal(renderer.shadowMap.enabled, false);
  graphicsSettings.set({ quality: 'high' }); assert.equal(ratio, 2); assert.equal(renderer.shadowMap.enabled, true);
  graphicsSettings.set({ quality: 'auto' }); assert.equal(ratio, 1.5);
  remove(); graphicsSettings.set({ quality: 'low' }); assert.equal(ratio, 1.5);
  graphicsSettings.set(graphicsDefaults); Reflect.deleteProperty(globalThis, 'devicePixelRatio');
});
