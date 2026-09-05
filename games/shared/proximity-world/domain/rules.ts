import { proximityWorldRules } from './registry.ts';
import {
  proximityEventTypes,
  proximityInteractionStatuses,
  type ProximityInteractionDefinition,
  type ProximityInteractionRuntimeState,
  type ProximityInteractionStatus,
  type ProximityVector,
  type ProximityWorldDefinition,
  type ProximityWorldEvent,
  type ProximityWorldInput,
  type ProximityWorldState,
  type ProximityWorldStepResult,
} from './types.ts';

export function createProximityWorldState(
  definition: ProximityWorldDefinition,
  playerPosition: ProximityVector,
  initialStatuses: Readonly<Record<string, ProximityInteractionStatus>> = {},
): ProximityWorldState {
  const interactions: Record<string, ProximityInteractionRuntimeState> = {};
  for (const interaction of definition.interactions) {
    interactions[interaction.id] = {
      status: initialStatuses[interaction.id] ?? proximityInteractionStatuses.ready,
      progressMs: proximityWorldRules.noProgressMs,
      cooldownRemainingMs: proximityWorldRules.noCooldownMs,
      completions: 0,
    };
  }
  return {
    playerPosition: clampPosition(playerPosition, definition),
    facing: {
      x: proximityWorldRules.defaultFacingX,
      z: proximityWorldRules.defaultFacingZ,
    },
    activeInteractionId: null,
    interactions,
  };
}

export function setProximityInteractionStatus(
  state: ProximityWorldState,
  interactionId: string,
  status: ProximityInteractionStatus,
): ProximityWorldState {
  const current = state.interactions[interactionId];
  if (current === undefined || current.status === status) {
    return state;
  }
  return {
    ...state,
    activeInteractionId:
      state.activeInteractionId === interactionId ? null : state.activeInteractionId,
    interactions: {
      ...state.interactions,
      [interactionId]: {
        ...current,
        status,
        progressMs: proximityWorldRules.noProgressMs,
        cooldownRemainingMs: proximityWorldRules.noCooldownMs,
      },
    },
  };
}

export function stepProximityWorld(
  definition: ProximityWorldDefinition,
  state: ProximityWorldState,
  input: ProximityWorldInput,
): ProximityWorldStepResult {
  const deltaMs = clamp(
    input.deltaMs,
    proximityWorldRules.noProgressMs,
    proximityWorldRules.maximumDeltaMs,
  );
  const events: Array<ProximityWorldEvent> = [];
  const cooledInteractions = tickCooldowns(state.interactions, deltaMs);
  const movement = normalizeMovement(input.moveX, input.moveZ);
  const distance = definition.movementSpeed * (deltaMs / 1000);
  const playerPosition = clampPosition(
    {
      x: state.playerPosition.x + movement.x * distance,
      z: state.playerPosition.z + movement.z * distance,
    },
    definition,
  );
  const moved = playerPosition.x !== state.playerPosition.x
    || playerPosition.z !== state.playerPosition.z;
  const facing = moved ? movement : state.facing;
  if (moved) {
    events.push({
      type: proximityEventTypes.playerMoved,
      position: playerPosition,
      facing,
    });
  }

  const activeInteractionId = findClosestReadyInteraction(
    definition.interactions,
    cooledInteractions,
    playerPosition,
  );
  const interactions = resetInactiveProgress(
    cooledInteractions,
    state.activeInteractionId,
    activeInteractionId,
  );
  if (state.activeInteractionId !== activeInteractionId) {
    events.push({
      type: proximityEventTypes.activeInteractionChanged,
      previousInteractionId: state.activeInteractionId,
      interactionId: activeInteractionId,
    });
  }

  const completed = advanceActiveInteraction(
    definition,
    interactions,
    activeInteractionId,
    deltaMs,
    events,
  );
  return {
    state: {
      playerPosition,
      facing,
      activeInteractionId: completed ? null : activeInteractionId,
      interactions,
    },
    events,
  };
}

function tickCooldowns(
  interactions: Readonly<Record<string, ProximityInteractionRuntimeState>>,
  deltaMs: number,
): Record<string, ProximityInteractionRuntimeState> {
  const next: Record<string, ProximityInteractionRuntimeState> = {};
  for (const [interactionId, state] of Object.entries(interactions)) {
    if (state.status !== proximityInteractionStatuses.cooldown) {
      next[interactionId] = state;
      continue;
    }
    const cooldownRemainingMs = Math.max(
      proximityWorldRules.noCooldownMs,
      state.cooldownRemainingMs - deltaMs,
    );
    next[interactionId] = {
      ...state,
      status: cooldownRemainingMs === proximityWorldRules.noCooldownMs
        ? proximityInteractionStatuses.ready
        : proximityInteractionStatuses.cooldown,
      cooldownRemainingMs,
    };
  }
  return next;
}

function normalizeMovement(moveX: number, moveZ: number): ProximityVector {
  const magnitude = Math.hypot(moveX, moveZ);
  if (magnitude < proximityWorldRules.minimumMovementMagnitude) {
    return { x: 0, z: 0 };
  }
  return {
    x: moveX / magnitude,
    z: moveZ / magnitude,
  };
}

function clampPosition(
  position: ProximityVector,
  definition: ProximityWorldDefinition,
): ProximityVector {
  return {
    x: clamp(position.x, definition.bounds.minimumX, definition.bounds.maximumX),
    z: clamp(position.z, definition.bounds.minimumZ, definition.bounds.maximumZ),
  };
}

function findClosestReadyInteraction(
  definitions: ReadonlyArray<ProximityInteractionDefinition>,
  states: Readonly<Record<string, ProximityInteractionRuntimeState>>,
  playerPosition: ProximityVector,
): string | null {
  let closestId: string | null = null;
  let closestDistanceSquared = Number.POSITIVE_INFINITY;
  for (const definition of definitions) {
    if (states[definition.id]?.status !== proximityInteractionStatuses.ready) {
      continue;
    }
    const distanceSquared = squaredDistance(playerPosition, definition.position);
    if (
      distanceSquared <= definition.radius * definition.radius
      && distanceSquared < closestDistanceSquared
    ) {
      closestId = definition.id;
      closestDistanceSquared = distanceSquared;
    }
  }
  return closestId;
}

function resetInactiveProgress(
  interactions: Record<string, ProximityInteractionRuntimeState>,
  previousInteractionId: string | null,
  activeInteractionId: string | null,
): Record<string, ProximityInteractionRuntimeState> {
  if (
    previousInteractionId === null
    || previousInteractionId === activeInteractionId
  ) {
    return interactions;
  }
  const previous = interactions[previousInteractionId];
  if (
    previous === undefined
    || previous.status !== proximityInteractionStatuses.ready
    || previous.progressMs === proximityWorldRules.noProgressMs
  ) {
    return interactions;
  }
  interactions[previousInteractionId] = {
    ...previous,
    progressMs: proximityWorldRules.noProgressMs,
  };
  return interactions;
}

function advanceActiveInteraction(
  definition: ProximityWorldDefinition,
  interactions: Record<string, ProximityInteractionRuntimeState>,
  activeInteractionId: string | null,
  deltaMs: number,
  events: Array<ProximityWorldEvent>,
): boolean {
  if (activeInteractionId === null) {
    return false;
  }
  const runtime = interactions[activeInteractionId];
  const interaction = definition.interactions.find(
    (candidate) => candidate.id === activeInteractionId,
  );
  if (runtime === undefined || interaction === undefined) {
    return false;
  }
  const progressMs = Math.min(interaction.durationMs, runtime.progressMs + deltaMs);
  if (progressMs < interaction.durationMs) {
    interactions[activeInteractionId] = { ...runtime, progressMs };
    return false;
  }

  const completions = runtime.completions + proximityWorldRules.firstCompletion;
  interactions[activeInteractionId] = {
    status: interaction.repeatable
      ? interaction.cooldownMs > proximityWorldRules.noCooldownMs
        ? proximityInteractionStatuses.cooldown
        : proximityInteractionStatuses.ready
      : proximityInteractionStatuses.completed,
    progressMs: proximityWorldRules.noProgressMs,
    cooldownRemainingMs: interaction.repeatable
      ? interaction.cooldownMs
      : proximityWorldRules.noCooldownMs,
    completions,
  };
  events.push({
    type: proximityEventTypes.interactionCompleted,
    interactionId: activeInteractionId,
    completions,
  });
  return true;
}

function squaredDistance(left: ProximityVector, right: ProximityVector): number {
  const deltaX = left.x - right.x;
  const deltaZ = left.z - right.z;
  return deltaX * deltaX + deltaZ * deltaZ;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
