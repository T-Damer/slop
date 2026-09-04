import assert from 'node:assert/strict';
import test from 'node:test';

import {
  billiardsInteractionModes,
  createBilliardsInteractionState,
  manualStrokeCanRelease,
  manualStrokePower,
} from '../runtime/presentation/interaction-state-v2.ts';

test('cue-ball placement starts in a dedicated interaction state', () => {
  const state = createBilliardsInteractionState(true);
  assert.equal(state.mode, billiardsInteractionModes.placingCueBall);
  assert.equal(state.placementPreview, null);
  assert.equal(state.stroke, null);
});

test('normal play starts with free aiming', () => {
  const state = createBilliardsInteractionState(false);
  assert.equal(state.mode, billiardsInteractionModes.aiming);
});

test('manual stroke power combines pullback and forward velocity', () => {
  const low = manualStrokePower(24, 120);
  const high = manualStrokePower(150, 1450);
  assert.ok(low > 0);
  assert.ok(low < high);
  assert.ok(high <= 1);
});

test('manual stroke rejects accidental taps and accepts deliberate flicks', () => {
  assert.equal(manualStrokeCanRelease(3, 20), false);
  assert.equal(manualStrokeCanRelease(80, 40), false);
  assert.equal(manualStrokeCanRelease(6, 1200), false);
  assert.equal(manualStrokeCanRelease(70, 520), true);
});
