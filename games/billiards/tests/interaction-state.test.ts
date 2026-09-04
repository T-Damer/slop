import assert from 'node:assert/strict';
import test from 'node:test';

import {
  projectedPullPixels,
  resolveManualStroke,
} from '../runtime/presentation/interaction-state.ts';

test('manual cue pull only uses movement along the cue butt axis', () => {
  const start = { x: 100, y: 100 };
  assert.equal(projectedPullPixels(start, { x: 40, y: 100 }, 0), 60);
  assert.equal(projectedPullPixels(start, { x: 100, y: 40 }, 0), 0);
  assert.equal(projectedPullPixels(start, { x: 260, y: 100 }, 0), 0);
});

test('manual cue power increases with pull distance and forward velocity', () => {
  const weak = resolveManualStroke(24, 0);
  const pulled = resolveManualStroke(110, 0);
  const flicked = resolveManualStroke(110, 1500);
  assert.ok(weak.power < pulled.power);
  assert.ok(pulled.power < flicked.power);
  assert.ok(flicked.power <= 1);
});

test('manual cue power remains bounded for extreme pointer samples', () => {
  const result = resolveManualStroke(10_000, 40_000);
  assert.equal(result.power, 1);
});
