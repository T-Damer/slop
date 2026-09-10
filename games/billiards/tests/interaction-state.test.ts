import assert from 'node:assert/strict';
import test from 'node:test';
import { ManualCueStroke } from '../runtime/presentation/manual-stroke.ts';
import { manualStrokePower } from '../runtime/presentation/interaction-state-v2.ts';

test('manual cue pull only uses movement along the cue butt axis', () => {
  const sample = (x: number, y: number): number =>
    new ManualCueStroke({ x: 100, y: 100 }, 0, 0).sample({ x, y }, 10).pullback;
  assert.equal(sample(40, 100), 60);
  assert.equal(sample(100, 40), 0);
  assert.equal(sample(260, 100), 0);
});

test('manual cue power increases with pull distance and forward velocity', () => {
  const weak = manualStrokePower(24, 0);
  const pulled = manualStrokePower(110, 0);
  const flicked = manualStrokePower(110, 1500);
  assert.ok(weak < pulled);
  assert.ok(pulled < flicked);
  assert.ok(flicked <= 1);
});

test('manual cue power remains bounded for extreme pointer samples', () => {
  assert.equal(manualStrokePower(10_000, 40_000), 1);
});
