import type { WorldInteractionMode } from './registry.ts';
import { worldEventTypes } from './registry.ts';

export interface WorldPoint {
  readonly x: number;
  readonly z: number;
}

export interface WorldBounds {
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumZ: number;
  readonly maximumZ: number;
}

export interface WorldResourceAmount {
  readonly resourceId: string;
  readonly amount: number;
}

export interface WorldInteractionEffect {
  readonly costs: ReadonlyArray<WorldResourceAmount>;
  readonly rewards: ReadonlyArray<WorldResourceAmount>;
}

export interface WorldInteractionDefinition {
  readonly id: string;
  readonly position: WorldPoint;
  readonly radius: number;
  readonly mode: WorldInteractionMode;
  readonly durationMs: number;
  readonly cooldownMs: number;
  readonly lockMovement: boolean;
  readonly effect: WorldInteractionEffect;
}

export interface WalkWorldDefinition {
  readonly bounds: WorldBounds;
  readonly spawn: WorldPoint;
  readonly movementSpeedPerSecond: number;
  readonly interactions: ReadonlyArray<WorldInteractionDefinition>;
}

export interface WorldActiveInteraction {
  readonly interactionId: string;
  readonly remainingMs: number;
  readonly totalMs: number;
}

export interface WalkWorldState {
  readonly player: WorldPoint;
  readonly resources: Readonly<Record<string, number>>;
  readonly cooldownsMs: Readonly<Record<string, number>>;
  readonly proximityId: string | null;
  readonly activeInteraction: WorldActiveInteraction | null;
  readonly revision: number;
}

export interface WalkWorldInput {
  readonly moveX: number;
  readonly moveZ: number;
  readonly interact: boolean;
}

export type WorldDomainEvent =
  | {
      readonly type: typeof worldEventTypes.proximityChanged;
      readonly interactionId: string | null;
    }
  | {
      readonly type: typeof worldEventTypes.interactionStarted;
      readonly interactionId: string;
      readonly durationMs: number;
    }
  | {
      readonly type: typeof worldEventTypes.interactionCompleted;
      readonly interactionId: string;
      readonly costs: ReadonlyArray<WorldResourceAmount>;
      readonly rewards: ReadonlyArray<WorldResourceAmount>;
    }
  | {
      readonly type: typeof worldEventTypes.interactionBlocked;
      readonly interactionId: string;
      readonly missing: ReadonlyArray<WorldResourceAmount>;
    };

export interface WalkWorldStepResult {
  readonly state: WalkWorldState;
  readonly events: ReadonlyArray<WorldDomainEvent>;
}
