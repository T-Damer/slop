import { worldInteractionModes } from '../../shared/world-kit/domain/registry.ts';
import type {
  WalkWorldDefinition,
  WorldInteractionDefinition,
} from '../../shared/world-kit/domain/types.ts';

export const junkyardResourceIds = {
  coins: 'coins',
  scrap: 'scrap',
  fuel: 'fuel',
  reputation: 'reputation',
  upgrades: 'upgrades',
} as const;

export const junkyardInteractionIds = {
  scrapPile: 'scrap-pile',
  crusher: 'scrap-crusher',
  fuelRack: 'fuel-rack',
  customer: 'waiting-customer',
  upgradePad: 'upgrade-pad',
} as const;

export const junkyardVisualKinds = {
  scrapPile: 'scrap-pile',
  crusher: 'crusher',
  fuelRack: 'fuel-rack',
  customer: 'customer',
  upgradePad: 'upgrade-pad',
} as const;

export type JunkyardVisualKind =
  typeof junkyardVisualKinds[keyof typeof junkyardVisualKinds];

export interface JunkyardStationDefinition {
  readonly interaction: WorldInteractionDefinition;
  readonly visualKind: JunkyardVisualKind;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly accentColor: number;
  readonly anchorHeight: number;
  readonly unavailableMessage: string;
  readonly completionMessage: string;
}

export const junkyardCopy = {
  title: 'Junkyard Station',
  subtitle: 'Turn discarded machines into a working roadside business.',
  movementHint: 'Move with WASD, arrows, or the joystick.',
  automaticHint: 'Automatic interaction',
  actionHint: 'Press E or tap the action button',
  idleMessage: 'Collect scrap, process it, refill fuel, and serve the driver.',
  resources: {
    coins: 'Coins',
    scrap: 'Scrap',
    fuel: 'Fuel',
    reputation: 'Rep',
  },
  actionLabel: 'Interact',
} as const;

export const junkyardInitialResources: Readonly<Record<string, number>> = {
  [junkyardResourceIds.coins]: 0,
  [junkyardResourceIds.scrap]: 0,
  [junkyardResourceIds.fuel]: 0,
  [junkyardResourceIds.reputation]: 0,
  [junkyardResourceIds.upgrades]: 0,
};

export const junkyardStations: ReadonlyArray<JunkyardStationDefinition> = [
  {
    interaction: {
      id: junkyardInteractionIds.scrapPile,
      position: { x: 0, z: 1.45 },
      radius: 1.18,
      mode: worldInteractionModes.automatic,
      durationMs: 620,
      cooldownMs: 420,
      lockMovement: true,
      effect: {
        costs: [],
        rewards: [{ resourceId: junkyardResourceIds.scrap, amount: 1 }],
      },
    },
    visualKind: junkyardVisualKinds.scrapPile,
    label: 'Sort the scrap pile',
    shortLabel: 'Collect scrap',
    icon: '⚙',
    accentColor: 0xf1a638,
    anchorHeight: 1.9,
    unavailableMessage: 'The pile is being sorted.',
    completionMessage: '+1 scrap recovered',
  },
  {
    interaction: {
      id: junkyardInteractionIds.crusher,
      position: { x: -3.45, z: -1.15 },
      radius: 1.32,
      mode: worldInteractionModes.automatic,
      durationMs: 920,
      cooldownMs: 420,
      lockMovement: true,
      effect: {
        costs: [{ resourceId: junkyardResourceIds.scrap, amount: 1 }],
        rewards: [{ resourceId: junkyardResourceIds.coins, amount: 4 }],
      },
    },
    visualKind: junkyardVisualKinds.crusher,
    label: 'Feed the crusher',
    shortLabel: 'Process scrap',
    icon: '▾',
    accentColor: 0xe8573d,
    anchorHeight: 2.8,
    unavailableMessage: 'Collect at least one piece of scrap first.',
    completionMessage: '+4 coins from processed metal',
  },
  {
    interaction: {
      id: junkyardInteractionIds.fuelRack,
      position: { x: 3.5, z: 0.7 },
      radius: 1.22,
      mode: worldInteractionModes.automatic,
      durationMs: 720,
      cooldownMs: 520,
      lockMovement: true,
      effect: {
        costs: [],
        rewards: [{ resourceId: junkyardResourceIds.fuel, amount: 1 }],
      },
    },
    visualKind: junkyardVisualKinds.fuelRack,
    label: 'Fill a fuel can',
    shortLabel: 'Prepare fuel',
    icon: '◆',
    accentColor: 0x51b98e,
    anchorHeight: 2.15,
    unavailableMessage: 'The pump is cycling.',
    completionMessage: '+1 fuel can filled',
  },
  {
    interaction: {
      id: junkyardInteractionIds.customer,
      position: { x: 3.35, z: -3.05 },
      radius: 1.42,
      mode: worldInteractionModes.prompted,
      durationMs: 820,
      cooldownMs: 650,
      lockMovement: true,
      effect: {
        costs: [{ resourceId: junkyardResourceIds.fuel, amount: 1 }],
        rewards: [
          { resourceId: junkyardResourceIds.coins, amount: 8 },
          { resourceId: junkyardResourceIds.reputation, amount: 1 },
        ],
      },
    },
    visualKind: junkyardVisualKinds.customer,
    label: 'Serve the waiting driver',
    shortLabel: 'Serve driver',
    icon: '!',
    accentColor: 0x4e8fda,
    anchorHeight: 2.4,
    unavailableMessage: 'Bring one filled fuel can to the driver.',
    completionMessage: '+8 coins · +1 reputation',
  },
  {
    interaction: {
      id: junkyardInteractionIds.upgradePad,
      position: { x: -0.2, z: -4.7 },
      radius: 1.28,
      mode: worldInteractionModes.prompted,
      durationMs: 1050,
      cooldownMs: 800,
      lockMovement: true,
      effect: {
        costs: [{ resourceId: junkyardResourceIds.coins, amount: 20 }],
        rewards: [{ resourceId: junkyardResourceIds.upgrades, amount: 1 }],
      },
    },
    visualKind: junkyardVisualKinds.upgradePad,
    label: 'Improve the station',
    shortLabel: 'Buy upgrade',
    icon: '↑',
    accentColor: 0xb66bda,
    anchorHeight: 1.15,
    unavailableMessage: 'An upgrade costs 20 coins.',
    completionMessage: 'Station upgraded',
  },
];

export const junkyardWorldDefinition: WalkWorldDefinition = {
  bounds: {
    minimumX: -7.2,
    maximumX: 7.2,
    minimumZ: -6.5,
    maximumZ: 5.8,
  },
  spawn: { x: 0, z: 3.35 },
  movementSpeedPerSecond: 3.6,
  interactions: junkyardStations.map((station) => station.interaction),
};

export function getJunkyardStation(
  interactionId: string,
): JunkyardStationDefinition | null {
  return junkyardStations.find(
    (station) => station.interaction.id === interactionId,
  ) ?? null;
}
