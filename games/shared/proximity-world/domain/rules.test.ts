import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createProximityWorldState,
  setProximityInteractionStatus,
  stepProximityWorld,
} from './rules.ts';
import {
  proximityEventTypes,
  proximityInteractionStatuses,
  type ProximityWorldDefinition,
} from './types.ts';

const definition: ProximityWorldDefinition = {
  bounds: {
    minimumX: -2,
    maximumX: 2,
    minimumZ: -2,
    maximumZ: 2,
  },
  movementSpeed: 4,
  interactions: [
    {
      id: 'crate',
      position: { x: 1, z: 0 },
      radius: 0.6,
      durationMs: 200,
      repeatable: false,
      cooldownMs: 0,
    },
    {
      id: 'vendor',
      position: { x: -1, z: 0 },
      radius: 0.6,
      durationMs: 100,
      repeatable: true,
      cooldownMs: 300,
    },
  ],
};

test('movement is normalized and clamped to world bounds', () => {
  const state = createProximityWorldState(definition, { x: 0, z: 0 });
  const result = stepProximityWorld(definition, state, {
    moveX: 10,
    moveZ: 10,
    deltaMs: 100,
  });
  assert.ok(result.state.playerPosition.x > 0);
  assert.ok(result.state.playerPosition.z > 0);
  assert.ok(result.state.playerPosition.x < 0.4);
  assert.equal(
    result.events.some((event) => event.type === proximityEventTypes.playerMoved),
    true,
  );
});

test('a one-shot interaction completes only after sustained proximity', () => {
  let state = createProximityWorldState(definition, { x: 1, z: 0 });
  state = stepProximityWorld(definition, state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  }).state;
  assert.equal(state.interactions.crate?.progressMs, 100);
  const result = stepProximityWorld(definition, state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  });
  assert.equal(
    result.state.interactions.crate?.status,
    proximityInteractionStatuses.completed,
  );
  assert.equal(
    result.events.some(
      (event) =>
        event.type === proximityEventTypes.interactionCompleted
        && event.interactionId === 'crate',
    ),
    true,
  );
});

test('repeatable interactions enter cooldown before becoming ready again', () => {
  let state = createProximityWorldState(definition, { x: -1, z: 0 });
  state = stepProximityWorld(definition, state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  }).state;
  assert.equal(
    state.interactions.vendor?.status,
    proximityInteractionStatuses.cooldown,
  );
  state = {
    ...state,
    playerPosition: { x: 0, z: 2 },
  };
  state = stepProximityWorld(definition, state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  }).state;
  assert.equal(
    state.interactions.vendor?.status,
    proximityInteractionStatuses.cooldown,
  );
  state = stepProximityWorld(definition, state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  }).state;
  state = stepProximityWorld(definition, state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  }).state;
  assert.equal(
    state.interactions.vendor?.status,
    proximityInteractionStatuses.ready,
  );
});

test('locked interactions are ignored until explicitly unlocked', () => {
  let state = createProximityWorldState(definition, { x: 1, z: 0 });
  state = setProximityInteractionStatus(
    state,
    'crate',
    proximityInteractionStatuses.locked,
  );
  state = stepProximityWorld(definition, state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  }).state;
  assert.equal(state.activeInteractionId, null);
  state = setProximityInteractionStatus(
    state,
    'crate',
    proximityInteractionStatuses.ready,
  );
  state = stepProximityWorld(definition, state, {
    moveX: 0,
    moveZ: 0,
    deltaMs: 100,
  }).state;
  assert.equal(state.activeInteractionId, 'crate');
});
