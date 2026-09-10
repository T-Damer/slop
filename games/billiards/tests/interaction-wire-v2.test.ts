import assert from 'node:assert/strict';
import test from 'node:test';

import {
  billiardsInteractionKinds,
  isBilliardsInteractionMessage,
  normalizeBilliardsInteraction,
  type BilliardsInteractionMessage,
} from '../runtime/network/interaction-wire-v2.ts';

test('accepts typed aim lock interaction', () => {
  const message: BilliardsInteractionMessage = {
    schemaVersion: 1,
    kind: billiardsInteractionKinds.aimLocked,
    revision: 7,
    clientSequence: 12,
    angleRadians: Math.PI / 3,
  };
  assert.equal(isBilliardsInteractionMessage(message), true);
});

test('rejects malformed manual stroke interaction', () => {
  assert.equal(isBilliardsInteractionMessage({
    schemaVersion: 1,
    kind: billiardsInteractionKinds.manualStroke,
    revision: 1,
    clientSequence: 2,
    cueOffset: 10,
    pullback: 20,
    forwardVelocity: Number.NaN,
    power: 0.5,
  }), false);
});

test('normalizes untrusted transient values before broadcast', () => {
  const normalized = normalizeBilliardsInteraction({
    schemaVersion: 1,
    kind: billiardsInteractionKinds.manualStroke,
    revision: 3,
    clientSequence: 4,
    cueOffset: 999,
    pullback: 999,
    forwardVelocity: 9999,
    power: 1,
  });
  assert.equal(normalized.kind, billiardsInteractionKinds.manualStroke);
  if (normalized.kind !== billiardsInteractionKinds.manualStroke) {
    assert.fail('Expected manual stroke interaction.');
  }
  assert.equal(normalized.cueOffset, 220);
  assert.equal(normalized.pullback, 220);
  assert.equal(normalized.forwardVelocity, 2400);
});
