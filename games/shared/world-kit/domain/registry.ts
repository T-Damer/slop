export const worldInteractionModes = {
  automatic: 'automatic',
  prompted: 'prompted',
} as const;

export type WorldInteractionMode =
  typeof worldInteractionModes[keyof typeof worldInteractionModes];

export const worldEventTypes = {
  proximityChanged: 'world.proximity.changed',
  interactionStarted: 'world.interaction.started',
  interactionCompleted: 'world.interaction.completed',
  interactionBlocked: 'world.interaction.blocked',
} as const;

export const worldSimulationRules = {
  zero: 0,
  firstRevision: 0,
  maximumStepMs: 100,
  minimumInteractionDurationMs: 1,
  movementEpsilon: 0.0001,
  distanceTieEpsilon: 0.000001,
} as const;
