import assert from 'node:assert/strict';
import test from 'node:test';

import { junkyardLevel } from './level.ts';
import {
  junkyardInteractionIds,
  junkyardObjectiveIds,
  junkyardRules,
} from './registry.ts';
import {
  createInitialJunkyardState,
  getJunkyardObjective,
  stepJunkyard,
} from './rules.ts';
import type { JunkyardState } from './types.ts';

test('the starter loop clears junk, builds a pump, fuels a car, and collects payment', () => {
  let state = createInitialJunkyardState();
  for (const interactionId of [
    junkyardInteractionIds.junkCrates,
    junkyardInteractionIds.junkTires,
    junkyardInteractionIds.junkWreck,
  ]) {
    state = completeInteraction(state, interactionId);
  }
  assert.equal(state.scrap, junkyardRules.junkTarget);
  assert.equal(
    state.world.interactions[junkyardInteractionIds.buildPump]?.status,
    'ready',
  );

  state = completeInteraction(state, junkyardInteractionIds.buildPump);
  assert.equal(state.pumpBuilt, true);
  assert.equal(state.scrap, 0);

  state = completeInteraction(state, junkyardInteractionIds.fuelCar);
  assert.equal(state.pendingRegisterCash, junkyardRules.fuelPayment);

  state = completeInteraction(state, junkyardInteractionIds.collectRegister);
  assert.equal(
    state.cash,
    junkyardRules.junkTarget * junkyardRules.junkCashAward
      + junkyardRules.fuelPayment,
  );
  assert.equal(getJunkyardObjective(state).id, junkyardObjectiveIds.freePlay);
});


test('fuel service preserves the shared cooldown instead of immediately unlocking again', () => {
  let state = createInitialJunkyardState();
  for (const interactionId of [
    junkyardInteractionIds.junkCrates,
    junkyardInteractionIds.junkTires,
    junkyardInteractionIds.junkWreck,
  ]) {
    state = completeInteraction(state, interactionId);
  }
  state = completeInteraction(state, junkyardInteractionIds.buildPump);
  state = completeInteraction(state, junkyardInteractionIds.fuelCar);
  assert.equal(
    state.world.interactions[junkyardInteractionIds.fuelCar]?.status,
    'cooldown',
  );
  const carsFueled = state.carsFueled;
  state = stepJunkyard(state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  }).state;
  assert.equal(state.carsFueled, carsFueled);
  assert.equal(
    state.world.interactions[junkyardInteractionIds.fuelCar]?.status,
    'cooldown',
  );
});

test('a locked pump cannot be built before the junk objective is complete', () => {
  const state = createInitialJunkyardState();
  const result = stepJunkyard(
    {
      ...state,
      world: {
        ...state.world,
        playerPosition: interactionPosition(junkyardInteractionIds.buildPump),
      },
    },
    { moveX: 0, moveZ: 0, deltaMs: 100 },
  );
  assert.equal(result.state.pumpBuilt, false);
  assert.equal(result.state.scrap, 0);
});

test('leaving an interaction radius resets partial progress', () => {
  let state = createInitialJunkyardState();
  state = {
    ...state,
    world: {
      ...state.world,
      playerPosition: interactionPosition(junkyardInteractionIds.junkCrates),
    },
  };
  state = stepJunkyard(state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  }).state;
  assert.equal(
    state.world.interactions[junkyardInteractionIds.junkCrates]?.progressMs,
    100,
  );
  state = {
    ...state,
    world: {
      ...state.world,
      playerPosition: { x: -5, z: -5 },
    },
  };
  state = stepJunkyard(state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  }).state;
  assert.equal(
    state.world.interactions[junkyardInteractionIds.junkCrates]?.progressMs,
    0,
  );
});

function completeInteraction(
  state: JunkyardState,
  interactionId: string,
): JunkyardState {
  const definition = junkyardLevel.world.interactions.find(
    (candidate) => candidate.id === interactionId,
  );
  assert.ok(definition);
  let next = {
    ...state,
    world: {
      ...state.world,
      playerPosition: definition.position,
    },
  };
  let remainingMs = definition.durationMs;
  while (remainingMs > 0) {
    const deltaMs = Math.min(100, remainingMs);
    next = stepJunkyard(next, {
      moveX: 0,
      moveZ: 0,
      deltaMs,
    }).state;
    remainingMs -= deltaMs;
  }
  return next;
}

function interactionPosition(interactionId: string): { x: number; z: number } {
  const definition = junkyardLevel.world.interactions.find(
    (candidate) => candidate.id === interactionId,
  );
  assert.ok(definition);
  return definition.position;
}
