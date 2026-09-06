import assert from 'node:assert/strict';
import test from 'node:test';
import { setPowerWithWheel } from './browser-quality/billiards-camera.mjs';
import { billiardsInputTuning as tuning } from '../games/billiards/runtime/presentation/registry.ts';

test('native wheel fixture honors event caps and works in both directions without state writes', async () => {
  for (const [initial, target] of [[0.68, 0.35], [0.04, 1], [1, 0.04]]) {
    let power = initial;
    const events = [];
    const cdp = { send: async (method, params) => {
      if (method === 'Input.dispatchMouseEvent') {
        assert.equal(params.type, 'mouseWheel');
        assert.ok(Math.abs(params.deltaY) <= tuning.crownWheelPixels);
        assert.equal(params.deltaX, 0);
        events.push(params);
        power -= params.deltaY / tuning.wheelPixelsPerPower;
        return {};
      }
      assert.equal(method, 'Runtime.evaluate');
      const expression = params.expression;
      assert.doesNotMatch(expression, /setPower|adjustPower|dispatchEvent/);
      if (expression.includes('const rail=')) return { result: { value: { x: 80, y: 520 } } };
      if (expression.startsWith('Math.abs')) {
        const expected = Number(expression.match(/controller.power - ([^)]+)/)[1]);
        return { result: { value: Math.abs(power - expected) < 0.00001 } };
      }
      return { result: { value: { power, angleRadians: 0.5, canInteract: true, match: { revision: 4 } } } };
    } };
    await setPowerWithWheel(cdp, target);
    assert.ok(events.length > 0);
    assert.ok(Math.abs(power - target) < 1e-10);
  }
});

test('native wheel fixture rejects invalid power before sending browser commands', async () => {
  const cdp = { send: () => assert.fail('Invalid target must not dispatch input') };
  for (const target of [NaN, Infinity, 0, 1.01]) await assert.rejects(setPowerWithWheel(cdp, target), /Invalid test shot power/);
});
