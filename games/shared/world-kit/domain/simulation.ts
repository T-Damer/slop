import {
  worldEventTypes,
  worldInteractionModes,
  worldSimulationRules,
} from './registry.ts';
import type {
  WalkWorldDefinition,
  WalkWorldInput,
  WalkWorldState,
  WalkWorldStepResult,
  WorldActiveInteraction,
  WorldDomainEvent,
  WorldInteractionDefinition,
  WorldPoint,
  WorldResourceAmount,
} from './types.ts';

export function createWalkWorldState(
  definition: WalkWorldDefinition,
  initialResources: Readonly<Record<string, number>> = {},
): WalkWorldState {
  const cooldownsMs: Record<string, number> = {};
  for (const interaction of definition.interactions) {
    cooldownsMs[interaction.id] = worldSimulationRules.zero;
  }
  return {
    player: { ...definition.spawn },
    resources: sanitizeLedger(initialResources),
    cooldownsMs,
    proximityId: findNearestInteractionId(definition, definition.spawn),
    activeInteraction: null,
    revision: worldSimulationRules.firstRevision,
  };
}

export function advanceWalkWorld(
  definition: WalkWorldDefinition,
  state: WalkWorldState,
  input: WalkWorldInput,
  deltaMs: number,
): WalkWorldStepResult {
  const stepMs = clamp(
    deltaMs,
    worldSimulationRules.zero,
    worldSimulationRules.maximumStepMs,
  );
  const events: Array<WorldDomainEvent> = [];
  let nextState = tickCooldowns(state, stepMs);

  if (nextState.activeInteraction !== null) {
    nextState = advanceActiveInteraction(definition, nextState, stepMs, events);
    return { state: nextState, events };
  }

  const player = movePlayer(definition, nextState.player, input, stepMs);
  const proximityId = findNearestInteractionId(definition, player);
  if (proximityId !== nextState.proximityId) {
    events.push({
      type: worldEventTypes.proximityChanged,
      interactionId: proximityId,
    });
  }
  nextState = updateState(nextState, { player, proximityId });

  const interaction = proximityId === null
    ? null
    : getWorldInteraction(definition, proximityId);
  if (interaction === null || !shouldStartInteraction(interaction, input)) {
    return { state: nextState, events };
  }
  if ((nextState.cooldownsMs[interaction.id] ?? worldSimulationRules.zero) > 0) {
    return { state: nextState, events };
  }

  const missing = getMissingResources(nextState.resources, interaction.effect.costs);
  if (missing.length > worldSimulationRules.zero) {
    if (input.interact) {
      events.push({
        type: worldEventTypes.interactionBlocked,
        interactionId: interaction.id,
        missing,
      });
    }
    return { state: nextState, events };
  }

  const durationMs = Math.max(
    worldSimulationRules.minimumInteractionDurationMs,
    interaction.durationMs,
  );
  const activeInteraction: WorldActiveInteraction = {
    interactionId: interaction.id,
    remainingMs: durationMs,
    totalMs: durationMs,
  };
  events.push({
    type: worldEventTypes.interactionStarted,
    interactionId: interaction.id,
    durationMs,
  });
  return {
    state: updateState(nextState, { activeInteraction }),
    events,
  };
}

export function findNearestInteractionId(
  definition: WalkWorldDefinition,
  point: WorldPoint,
): string | null {
  let nearest: WorldInteractionDefinition | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const interaction of definition.interactions) {
    const distance = squaredDistance(point, interaction.position);
    if (distance > interaction.radius * interaction.radius) {
      continue;
    }
    const closer = distance < nearestDistance - worldSimulationRules.distanceTieEpsilon;
    const tied = Math.abs(distance - nearestDistance) <= worldSimulationRules.distanceTieEpsilon;
    if (closer || (tied && interaction.id < (nearest?.id ?? interaction.id))) {
      nearest = interaction;
      nearestDistance = distance;
    }
  }
  return nearest?.id ?? null;
}

export function getWorldInteraction(
  definition: WalkWorldDefinition,
  interactionId: string,
): WorldInteractionDefinition | null {
  return definition.interactions.find((interaction) => interaction.id === interactionId) ?? null;
}

export function getWorldResource(
  state: WalkWorldState,
  resourceId: string,
): number {
  return state.resources[resourceId] ?? worldSimulationRules.zero;
}

function advanceActiveInteraction(
  definition: WalkWorldDefinition,
  state: WalkWorldState,
  stepMs: number,
  events: Array<WorldDomainEvent>,
): WalkWorldState {
  const active = state.activeInteraction;
  if (active === null) {
    return state;
  }
  const remainingMs = Math.max(worldSimulationRules.zero, active.remainingMs - stepMs);
  if (remainingMs > worldSimulationRules.zero) {
    return updateState(state, {
      activeInteraction: { ...active, remainingMs },
    });
  }

  const interaction = getWorldInteraction(definition, active.interactionId);
  if (interaction === null) {
    return updateState(state, { activeInteraction: null });
  }
  const missing = getMissingResources(state.resources, interaction.effect.costs);
  if (missing.length > worldSimulationRules.zero) {
    events.push({
      type: worldEventTypes.interactionBlocked,
      interactionId: interaction.id,
      missing,
    });
    return updateState(state, { activeInteraction: null });
  }

  const resources = applyEffect(
    state.resources,
    interaction.effect.costs,
    interaction.effect.rewards,
  );
  const cooldownsMs = {
    ...state.cooldownsMs,
    [interaction.id]: Math.max(worldSimulationRules.zero, interaction.cooldownMs),
  };
  events.push({
    type: worldEventTypes.interactionCompleted,
    interactionId: interaction.id,
    costs: interaction.effect.costs,
    rewards: interaction.effect.rewards,
  });
  return updateState(state, {
    resources,
    cooldownsMs,
    activeInteraction: null,
  });
}

function movePlayer(
  definition: WalkWorldDefinition,
  point: WorldPoint,
  input: WalkWorldInput,
  stepMs: number,
): WorldPoint {
  const magnitude = Math.hypot(input.moveX, input.moveZ);
  if (magnitude <= worldSimulationRules.movementEpsilon || stepMs <= 0) {
    return point;
  }
  const normalization = magnitude > 1 ? 1 / magnitude : 1;
  const distance = definition.movementSpeedPerSecond * stepMs / 1000;
  return {
    x: clamp(
      point.x + input.moveX * normalization * distance,
      definition.bounds.minimumX,
      definition.bounds.maximumX,
    ),
    z: clamp(
      point.z + input.moveZ * normalization * distance,
      definition.bounds.minimumZ,
      definition.bounds.maximumZ,
    ),
  };
}

function tickCooldowns(state: WalkWorldState, stepMs: number): WalkWorldState {
  let changed = false;
  const cooldownsMs: Record<string, number> = {};
  for (const [interactionId, remainingMs] of Object.entries(state.cooldownsMs)) {
    const nextRemaining = Math.max(worldSimulationRules.zero, remainingMs - stepMs);
    cooldownsMs[interactionId] = nextRemaining;
    changed ||= nextRemaining !== remainingMs;
  }
  return changed ? updateState(state, { cooldownsMs }) : state;
}

function shouldStartInteraction(
  interaction: WorldInteractionDefinition,
  input: WalkWorldInput,
): boolean {
  return interaction.mode === worldInteractionModes.automatic || input.interact;
}

function getMissingResources(
  resources: Readonly<Record<string, number>>,
  costs: ReadonlyArray<WorldResourceAmount>,
): Array<WorldResourceAmount> {
  const missing: Array<WorldResourceAmount> = [];
  for (const cost of costs) {
    const available = resources[cost.resourceId] ?? worldSimulationRules.zero;
    if (available < cost.amount) {
      missing.push({
        resourceId: cost.resourceId,
        amount: cost.amount - available,
      });
    }
  }
  return missing;
}

function applyEffect(
  resources: Readonly<Record<string, number>>,
  costs: ReadonlyArray<WorldResourceAmount>,
  rewards: ReadonlyArray<WorldResourceAmount>,
): Readonly<Record<string, number>> {
  const nextResources: Record<string, number> = { ...resources };
  for (const cost of costs) {
    nextResources[cost.resourceId] = Math.max(
      worldSimulationRules.zero,
      (nextResources[cost.resourceId] ?? worldSimulationRules.zero) - cost.amount,
    );
  }
  for (const reward of rewards) {
    nextResources[reward.resourceId] = Math.max(
      worldSimulationRules.zero,
      (nextResources[reward.resourceId] ?? worldSimulationRules.zero) + reward.amount,
    );
  }
  return nextResources;
}

function sanitizeLedger(
  resources: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const sanitized: Record<string, number> = {};
  for (const [resourceId, amount] of Object.entries(resources)) {
    sanitized[resourceId] = Number.isFinite(amount)
      ? Math.max(worldSimulationRules.zero, amount)
      : worldSimulationRules.zero;
  }
  return sanitized;
}

function updateState(
  state: WalkWorldState,
  patch: Partial<Omit<WalkWorldState, 'revision'>>,
): WalkWorldState {
  return {
    ...state,
    ...patch,
    revision: state.revision + 1,
  };
}

function squaredDistance(left: WorldPoint, right: WorldPoint): number {
  const deltaX = left.x - right.x;
  const deltaZ = left.z - right.z;
  return deltaX * deltaX + deltaZ * deltaZ;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
