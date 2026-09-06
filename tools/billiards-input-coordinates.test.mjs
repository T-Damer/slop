import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import { inputPoint, aimPoint } from './browser-quality/billiards-controls.mjs';

test('billiards pointer coordinates reject non-finite protocol values instead of coercing to zero', () => {
  for (const point of [null, {}, { x: NaN, y: 12 }, { x: 12, y: Infinity }, { x: '12', y: 12 }]) {
    assert.throws(() => inputPoint(point), /Invalid billiards input coordinate/);
  }
  assert.deepEqual(inputPoint({ x: 180.00000000000003, y: 240.123456 }), { x: 180, y: 240.12 });
});

test('aim input awaits the browser coordinate and rounds both touch axes consistently', async () => {
  const point = await aimPoint({ send: async (method, params) => {
    assert.equal(method, 'Runtime.evaluate');
    assert.match(params.expression, /950/);
    return { result: { value: { x: 166.66666666666666, y: 444.4444444444444 } } };
  } }, { canvasSelector: '[data-billiards-canvas]' }, 950, 360);
  assert.deepEqual(point, { x: 166.67, y: 444.44 });
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
