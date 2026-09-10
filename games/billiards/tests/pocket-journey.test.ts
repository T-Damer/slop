import assert from 'node:assert/strict';
import test from 'node:test';
import { BilliardsPocketJourney, pocketMotion } from '../runtime/presentation/pocket-journey.ts';
import { createInitialMatch } from '../runtime/domain/match.ts';
import { tableModelFor } from '../runtime/domain/table-model.ts';
import { graphicsDefaults, graphicsSettings } from '../../shared/game-shell/graphics-settings.ts';
import type { BilliardsViewElements } from '../runtime/presentation/view-elements.ts';
import type { BilliardsFeedbackBatch } from '../runtime/presentation/feedback.ts';

function fixture(id = 3) {
  const base = createInitialMatch();
  const match = { ...base, revision: 2, table: { ...base.table, step: 30,
    balls: base.table.balls.map((ball) => ball.id === id ? { ...ball, pocketed: true, pocketedBy: 1 as const } : ball) } };
  let animations = 0, cancelled = 0;
  const slot = { hidden: false, dataset: {} as Record<string, string>, animate: () => {
    animations++; return { cancel: () => { cancelled++; }, onfinish: null, oncancel: null };
  } };
  const view = { pocketSlots: [Array(15).fill(slot), Array(15).fill(slot)], root: { querySelectorAll: () => [slot] } } as unknown as BilliardsViewElements;
  const batch: BilliardsFeedbackBatch = { revision: 1, events: [{ kind: 'pocket-drop', primaryBallId: id,
    shooterIndex: 1, pocketId: tableModelFor(base.table).pockets[0]!.id, position: { x: -120, y: -60 }, intensity: 0.5 }] };
  return { base, match, view, slot, batch, animations: () => animations, cancelled: () => cancelled };
}

test('real pocket event sinks first, then rolls into the actual shooter slot exactly once', () => {
  const f = fixture(), journey = new BilliardsPocketJourney();
  journey.consume(f.batch, f.match, 0, () => null);
  journey.synchronize(f.match, f.view, 100);
  assert.equal(journey.snapshot(100).activeDrops, 1); assert.equal(f.slot.dataset.returnPending, 'true');
  assert.equal(f.animations(), 0);
  journey.synchronize(f.match, f.view, pocketMotion.sinkMs + 1);
  assert.equal(f.slot.dataset.returnPending, undefined); assert.equal(f.animations(), 1);
  journey.consume(f.batch, f.match, 500, () => null); journey.synchronize(f.match, f.view, 600);
  assert.equal(f.animations(), 1); assert.equal(journey.snapshot(600).deliveredCount, 1);
  journey.clear(f.view); assert.equal(f.cancelled(), 1);
});

test('scratch animates but never becomes a player reward, including repeated scratches', () => {
  const f = fixture(0), journey = new BilliardsPocketJourney();
  journey.consume(f.batch, f.match, 0, () => null); journey.synchronize(f.match, f.view, 500);
  assert.equal(f.animations(), 0); assert.equal(journey.snapshot(500).deliveredCount, 0);
  journey.consume({ ...f.batch, revision: 2 }, f.match, 1000, () => null);
  assert.equal(journey.snapshot(1050).activeDrops, 1);
});

test('reduced motion reveals authoritative pots directly; restart cancels stale arrivals', () => {
  const f = fixture(), journey = new BilliardsPocketJourney();
  graphicsSettings.set({ reducedMotion: true });
  journey.consume(f.batch, f.match, 0, () => null); journey.synchronize(f.match, f.view, 5);
  assert.equal(f.animations(), 0); assert.equal(journey.active(5), false);
  assert.equal(journey.snapshot(5).deliveredCount, 1);
  journey.synchronize({ ...f.base, revision: 3 }, f.view, 20);
  assert.equal(journey.snapshot(20).deliveredCount, 0); assert.equal(journey.snapshot(20).activeDrops, 0);
  graphicsSettings.set(graphicsDefaults);
});
