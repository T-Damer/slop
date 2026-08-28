import assert from 'node:assert/strict';
import test from 'node:test';

import {
  worldEventTypes,
  worldInteractionModes,
} from './registry.ts';
import {
  advanceWalkWorld,
  createWalkWorldState,
  findNearestInteractionId,
  getWorldResource,
} from './simulation.ts';
import type {
  WalkWorldDefinition,
  WalkWorldInput,
  WalkWorldState,
} from './types.ts';

const resourceIds = {
  coins: 'coins',
  scrap: 'scrap',
} as const;

const interactionIds = {
  automatic: 'scrap-pile',
  prompted: 'crusher',
} as const;

const definition: WalkWorldDefinition = {
  bounds: {
    minimumX: -2,
    maximumX: 2,
    minimumZ: -2,
    maximumZ: 2,
  },
  spawn: { x: 0, z: 1.8 },
  movementSpeedPerSecond: 4,
  interactions: [
    {
      id: interactionIds.automatic,
      position: { x: 0, z: 0.8 },
      radius: 0.65,
      mode: worldInteractionModes.automatic,
      durationMs: 200,
      cooldownMs: 100,
      lockMovement: true,
      effect: {
        costs: [],
        rewards: [{ resourceId: resourceIds.scrap, amount: 1 }],
      },
    },
    {
      id: interactionIds.prompted,
      position: { x: 1.3, z: 0.8 },
      radius: 0.7,
      mode: worldInteractionModes.prompted,
      durationMs: 100,
      cooldownMs: 0,
      lockMovement: true,
      effect: {
        costs: [{ resourceId: resourceIds.scrap, amount: 1 }],
        rewards: [{ resourceId: resourceIds.coins, amount: 4 }],
      },
    },
  ],
};

const idleInput: WalkWorldInput = {
  moveX: 0,
  moveZ: 0,
  interact: false,
};

test('movement is normalized and clamped to world bounds', () => {
  const state = createWalkWorldState(definition);
  const moved = advanceWalkWorld(
    definition,
    state,
    { moveX: 1, moveZ: 1, interact: false },
    100,
  ).state;
  const distance = Math.hypot(
    moved.player.x - state.player.x,
    moved.player.z - state.player.z,
  );
  assert.ok(Math.abs(distance - 0.4) < 0.0001);

  let boundary = moved;
  for (let step = 0; step < 20; step += 1) {
    boundary = advanceWalkWorld(
      definition,
      boundary,
      { moveX: 1, moveZ: 1, interact: false },
      100,
    ).state;
  }
  assert.equal(boundary.player.x, definition.bounds.maximumX);
  assert.equal(boundary.player.z, definition.bounds.maximumZ);
});

test('nearest interaction selection is deterministic', () => {
  assert.equal(
    findNearestInteractionId(definition, { x: 0, z: 0.8 }),
    interactionIds.automatic,
  );
  assert.equal(
    findNearestInteractionId(definition, { x: 1.3, z: 0.8 }),
    interactionIds.prompted,
  );
  assert.equal(findNearestInteractionId(definition, { x: -2, z: -2 }), null);
});

test('automatic interaction starts on entry and applies its reward', () => {
  let state = createWalkWorldState(definition);
  const entry = advanceWalkWorld(
    definition,
    state,
    { moveX: 0, moveZ: -1, interact: false },
    100,
  );
  state = entry.state;
  assert.equal(state.activeInteraction?.interactionId, interactionIds.automatic);
  assert.ok(entry.events.some((event) => event.type === worldEventTypes.interactionStarted));

  state = advanceWalkWorld(definition, state, idleInput, 100).state;
  const completion = advanceWalkWorld(definition, state, idleInput, 100);
  assert.equal(getWorldResource(completion.state, resourceIds.scrap), 1);
  assert.equal(completion.state.activeInteraction, null);
  assert.ok(
    completion.events.some((event) => event.type === worldEventTypes.interactionCompleted),
  );
});

test('prompted interaction waits for explicit input and consumes costs', () => {
  const initial = createWalkWorldState(definition, { [resourceIds.scrap]: 1 });
  const nearby: WalkWorldState = {
    ...initial,
    player: { x: 1.3, z: 0.8 },
    proximityId: interactionIds.prompted,
  };
  const waiting = advanceWalkWorld(definition, nearby, idleInput, 16);
  assert.equal(waiting.state.activeInteraction, null);

  let state = advanceWalkWorld(
    definition,
    waiting.state,
    { ...idleInput, interact: true },
    16,
  ).state;
  assert.equal(state.activeInteraction?.interactionId, interactionIds.prompted);
  state = advanceWalkWorld(definition, state, idleInput, 100).state;
  assert.equal(getWorldResource(state, resourceIds.scrap), 0);
  assert.equal(getWorldResource(state, resourceIds.coins), 4);
});

test('blocked prompt leaves resources unchanged and explains the missing cost', () => {
  const initial = createWalkWorldState(definition);
  const nearby: WalkWorldState = {
    ...initial,
    player: { x: 1.3, z: 0.8 },
    proximityId: interactionIds.prompted,
  };
  const result = advanceWalkWorld(
    definition,
    nearby,
    { ...idleInput, interact: true },
    16,
  );
  assert.deepEqual(result.state.resources, nearby.resources);
  assert.equal(result.state.activeInteraction, null);
  const blocked = result.events.find(
    (event) => event.type === worldEventTypes.interactionBlocked,
  );
  assert.deepEqual(blocked, {
    type: worldEventTypes.interactionBlocked,
    interactionId: interactionIds.prompted,
    missing: [{ resourceId: resourceIds.scrap, amount: 1 }],
  });
});
