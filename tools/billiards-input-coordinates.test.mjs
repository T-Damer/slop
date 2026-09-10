import { clientToCanvas } from '../games/billiards/runtime/presentation/coordinates.ts';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import { inputPoint, aimPoint } from './browser-quality/billiards-controls.mjs';

test('billiards pointer coordinates reject non-finite protocol values instead of coercing to zero', () => {
  for (const point of [null, {}, { x: NaN, y: 12 }, { x: 12, y: Infinity }, { x: '12', y: 12 }]) {
    assert.throws(() => inputPoint(point), /Invalid billiards input coordinate/);
  }
  assert.deepEqual(inputPoint({ x: 180.00000000000003, y: 240.123456 }), { x: 180.00000000000003, y: 240.123456 });
});

test('aim input awaits the browser coordinate without quantizing either touch axis', async () => {
  const point = await aimPoint({ send: async (method, params) => {
    assert.equal(method, 'Runtime.evaluate');
    assert.match(params.expression, /950/);
    return { result: { value: { x: 166.66666666666666, y: 444.4444444444444 } } };
  } }, { canvasSelector: '[data-billiards-canvas]' }, 950, 360);
  assert.deepEqual(point, { x: 166.66666666666666, y: 444.4444444444444 });
});

test('touch device capabilities are configured once before navigation, not by individual gestures', async () => {
  const entry = await readFile('tools/check-billiards-quality.mjs', 'utf8');
  assert.ok(entry.indexOf('Emulation.setTouchEmulationEnabled') < entry.indexOf("cdp.send('Page.navigate'"));
  for (const path of ['billiards-controls.mjs', 'billiards-pinch.mjs']) {
    const source = await readFile(`tools/browser-quality/${path}`, 'utf8');
    assert.doesNotMatch(source, /Emulation.setTouchEmulationEnabled/);
    assert.match(source, /waitForExpression/);
  }
});

test('portrait and landscape aim retain the exact canvas direction across scaled viewports', () => {
  for (const portrait of [false, true]) for (const scale of [0.33653846, 0.51, 0.666667, 1.01]) {
    const bounds = { left: 67.123456789, top: 108.987654321,
      width: (portrait ? 720 : 1280) * scale, height: (portrait ? 1280 : 720) * scale };
    for (const target of [{ x: 950, y: 360 }, { x: 623.1432, y: 98.1723 }]) {
      const point = inputPoint(portrait
        ? { x: bounds.left + (1-target.y/720)*bounds.width, y: bounds.top + target.x/1280*bounds.height }
        : { x: bounds.left + target.x/1280*bounds.width, y: bounds.top + target.y/720*bounds.height });
      const actual = clientToCanvas(bounds, point, portrait);
      assert.ok(Math.hypot(actual.x-target.x, actual.y-target.y) < 1e-9);
    }
  }
});


test('non-scratch fixture restores the settled camera before the next real break', async () => {
  const source = await readFile(new URL('./browser-quality/billiards-hud-guide.mjs', import.meta.url), 'utf8');
  const reset = source.lastIndexOf('await chooseNewMatch(cdp, ui)');
  const settled = source.indexOf('await settleCamera(cdp)', reset);
  const returned = source.indexOf('return { cueStayedOnTable', reset);
  assert.ok(reset >= 0 && settled > reset && settled < returned);
  assert.doesNotMatch(source.slice(reset, returned), /await delay\(/);
});
