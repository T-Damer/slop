export const proximityInteractionStatuses = {
  locked: 'locked',
  ready: 'ready',
  cooldown: 'cooldown',
  completed: 'completed',
} as const;

export type ProximityInteractionStatus =
  typeof proximityInteractionStatuses[keyof typeof proximityInteractionStatuses];

export const proximityEventTypes = {
  activeInteractionChanged: 'proximity.active-interaction-changed',
  interactionCompleted: 'proximity.interaction-completed',
  playerMoved: 'proximity.player-moved',
} as const;

export interface ProximityVector {
  readonly x: number;
  readonly z: number;
}

export interface ProximityWorldBounds {
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumZ: number;
  readonly maximumZ: number;
}

export interface ProximityInteractionDefinition {
  readonly id: string;
  readonly position: ProximityVector;
  readonly radius: number;
  readonly durationMs: number;
  readonly repeatable: boolean;
  readonly cooldownMs: number;
}

export interface ProximityWorldDefinition {
  readonly bounds: ProximityWorldBounds;
  readonly movementSpeed: number;
  readonly interactions: ReadonlyArray<ProximityInteractionDefinition>;
}

export interface ProximityInteractionRuntimeState {
  readonly status: ProximityInteractionStatus;
  readonly progressMs: number;
  readonly cooldownRemainingMs: number;
  readonly completions: number;
}

export interface ProximityWorldState {
  readonly playerPosition: ProximityVector;
  readonly facing: ProximityVector;
  readonly activeInteractionId: string | null;
  readonly interactions: Readonly<Record<string, ProximityInteractionRuntimeState>>;
}

export interface ProximityWorldInput {
  readonly moveX: number;
  readonly moveZ: number;
  readonly deltaMs: number;
}

export type ProximityWorldEvent =
  | {
      readonly type: typeof proximityEventTypes.playerMoved;
      readonly position: ProximityVector;
      readonly facing: ProximityVector;
    }
  | {
      readonly type: typeof proximityEventTypes.activeInteractionChanged;
      readonly previousInteractionId: string | null;
      readonly interactionId: string | null;
    }
  | {
      readonly type: typeof proximityEventTypes.interactionCompleted;
      readonly interactionId: string;
      readonly completions: number;
    };

export interface ProximityWorldStepResult {
  readonly state: ProximityWorldState;
  readonly events: ReadonlyArray<ProximityWorldEvent>;
}
