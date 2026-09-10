import type {
  ProximityInteractionDefinition,
  ProximityWorldInput,
  ProximityWorldState,
} from '../../../shared/proximity-world/domain/types.ts';

export const junkyardInteractionKinds = {
  build: 'build',
  cash: 'cash',
  fuel: 'fuel',
  junk: 'junk',
  talk: 'talk',
} as const;

export type JunkyardInteractionKind =
  typeof junkyardInteractionKinds[keyof typeof junkyardInteractionKinds];

export interface JunkyardInteractionDefinition
  extends ProximityInteractionDefinition {
  readonly kind: JunkyardInteractionKind;
}

export interface JunkyardLevelDefinition {
  readonly world: {
    readonly bounds: {
      readonly minimumX: number;
      readonly maximumX: number;
      readonly minimumZ: number;
      readonly maximumZ: number;
    };
    readonly movementSpeed: number;
    readonly interactions: ReadonlyArray<JunkyardInteractionDefinition>;
  };
  readonly spawn: {
    readonly x: number;
    readonly z: number;
  };
}

export interface JunkyardState {
  readonly world: ProximityWorldState;
  readonly cash: number;
  readonly scrap: number;
  readonly clearedJunkCount: number;
  readonly pumpBuilt: boolean;
  readonly carsFueled: number;
  readonly pendingRegisterCash: number;
  readonly paymentsCollected: number;
  readonly mechanicGreeted: boolean;
}

export const junkyardEventTypes = {
  carFueled: 'junkyard.car-fueled',
  cashCollected: 'junkyard.cash-collected',
  junkCleared: 'junkyard.junk-cleared',
  mechanicGreeted: 'junkyard.mechanic-greeted',
  pumpBuilt: 'junkyard.pump-built',
} as const;

export type JunkyardDomainEvent =
  | {
      readonly type: typeof junkyardEventTypes.junkCleared;
      readonly interactionId: string;
      readonly scrapAwarded: number;
      readonly cashAwarded: number;
    }
  | {
      readonly type: typeof junkyardEventTypes.pumpBuilt;
      readonly interactionId: string;
      readonly scrapSpent: number;
    }
  | {
      readonly type: typeof junkyardEventTypes.carFueled;
      readonly interactionId: string;
      readonly paymentQueued: number;
    }
  | {
      readonly type: typeof junkyardEventTypes.cashCollected;
      readonly interactionId: string;
      readonly cashCollected: number;
    }
  | {
      readonly type: typeof junkyardEventTypes.mechanicGreeted;
      readonly interactionId: string;
    };

export interface JunkyardStepResult {
  readonly state: JunkyardState;
  readonly events: ReadonlyArray<JunkyardDomainEvent>;
}

export type JunkyardInput = ProximityWorldInput;

export interface JunkyardObjective {
  readonly id: string;
  readonly current: number;
  readonly target: number;
}
