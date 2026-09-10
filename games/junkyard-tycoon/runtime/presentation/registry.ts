import {
  junkyardInteractionIds,
  junkyardObjectiveIds,
} from '../domain/registry.ts';

export const junkyardUiIds = {
  root: 'slop-junkyard-tycoon',
  style: 'slop-junkyard-tycoon-style',
} as const;

export const junkyardUiActions = {
  reset: 'reset',
} as const;

export const junkyardUiAttributes = {
  action: 'data-junkyard-action',
  hud: 'data-junkyard-hud',
} as const;

export const junkyardUiEvents = {
  click: 'click',
} as const;

const junkyardObjectiveCopy: Readonly<Record<string, string>> = {
  [junkyardObjectiveIds.clearJunk]: 'Clear the junk',
  [junkyardObjectiveIds.buildPump]: 'Build the first pump',
  [junkyardObjectiveIds.fuelCar]: 'Refuel a customer',
  [junkyardObjectiveIds.collectPayment]: 'Collect the payment',
  [junkyardObjectiveIds.freePlay]: 'Station is running',
};

export const junkyardCopy = {
  title: 'Junkyard Station',
  subtitle: 'Walk close to objects. Actions happen automatically.',
  cash: 'Cash',
  scrap: 'Scrap',
  reset: 'Restart yard',
  interactionReady: 'Stay nearby',
  objectiveById: junkyardObjectiveCopy,
  messageByEvent: {
    junkCleared: '+1 scrap · the yard is opening up',
    pumpBuilt: 'Pump online · a customer is waiting',
    carFueled: 'Fuel delivered · collect the payment',
    cashCollected: 'First service complete',
    mechanicGreeted: 'Mechanic: clear three piles, then build the pump.',
  },
} as const;

export const junkyardInteractionIcons: Readonly<Record<string, string>> = {
  [junkyardInteractionIds.talkMechanic]: '💬',
  [junkyardInteractionIds.junkCrates]: '🔨',
  [junkyardInteractionIds.junkTires]: '🔨',
  [junkyardInteractionIds.junkWreck]: '🔨',
  [junkyardInteractionIds.buildPump]: '🔧',
  [junkyardInteractionIds.fuelCar]: '⛽',
  [junkyardInteractionIds.collectRegister]: '💵',
};

export const junkyardSceneColors = {
  sky: 0x8fd7f0,
  fog: 0xd5d5b2,
  sand: 0xd8a85f,
  road: 0x9a7450,
  roadMarking: 0xf7e6a8,
  fence: 0x6d4430,
  fenceLight: 0xa76b42,
  concrete: 0xbdb09c,
  shadow: 0x3d3027,
  playerShirt: 0xe74f3c,
  playerOveralls: 0x3189c9,
  playerSkin: 0xf1b37e,
  playerCap: 0x254d7a,
  mechanicShirt: 0xf2c14e,
  mechanicOveralls: 0x4b596b,
  junkMetal: 0x708090,
  junkRust: 0xa95632,
  tire: 0x24262a,
  crate: 0x8c5b34,
  pumpRed: 0xc83f36,
  pumpWhite: 0xf3eadc,
  pumpScreen: 0x203342,
  carBody: 0x50b86b,
  carRoof: 0xf3eee4,
  carGlass: 0x77aaca,
  register: 0x3f7f5f,
  cash: 0x5fbd55,
  blueprint: 0x59a8d8,
  highlight: 0xffd44a,
} as const;

export const junkyardSceneLayout = {
  cameraOffsetX: 7.6,
  cameraOffsetY: 10.2,
  cameraOffsetZ: 8.4,
  cameraLookAheadZ: -0.4,
  cameraFollow: 0.08,
  cameraFrustumHeight: 13.4,
  fogNear: 15,
  fogFar: 31,
  groundSize: 36,
  roadWidth: 5.2,
  roadDepth: 22,
  roadX: 3.8,
  laneMarkCount: 9,
  laneMarkSpacing: 2.1,
  playerY: 0,
  playerMoveBob: 0.045,
  playerActionBob: 0.08,
  interactionAnchorY: 2.35,
  buildingX: -4.2,
  buildingZ: -3.1,
  registerX: -3.8,
  registerZ: -2.9,
  pumpX: 0.7,
  pumpZ: -2.8,
  customerCarX: 2.8,
  customerCarZ: -2.8,
  mechanicX: -2.6,
  mechanicZ: 1.4,
  maximumPixelRatio: 1.5,
  shadowMapSize: 768,
} as const;

export interface JunkyardQualityProfile {
  readonly maximumPixelRatio: number;
  readonly shadows: boolean;
  readonly decorationDensity: number;
}

const junkyardQualityProfiles: Readonly<Record<string, JunkyardQualityProfile>> = {
  low: {
    maximumPixelRatio: 1,
    shadows: false,
    decorationDensity: 0.55,
  },
  medium: {
    maximumPixelRatio: 1.25,
    shadows: true,
    decorationDensity: 0.8,
  },
  high: {
    maximumPixelRatio: junkyardSceneLayout.maximumPixelRatio,
    shadows: true,
    decorationDensity: 1,
  },
};

export function resolveJunkyardQuality(
  search: string = typeof location === 'undefined' ? '' : location.search,
  runtimeNavigator: Navigator | null =
    typeof navigator === 'undefined' ? null : navigator,
): JunkyardQualityProfile {
  const requested = new URLSearchParams(search).get('quality');
  if (requested !== null && Object.hasOwn(junkyardQualityProfiles, requested)) {
    return junkyardQualityProfiles[requested]!;
  }
  const device = runtimeNavigator as
    | (Navigator & { readonly deviceMemory?: number })
    | null;
  const memory = device?.deviceMemory ?? 8;
  const cores = device?.hardwareConcurrency ?? 8;
  if (memory <= 4 || cores <= 4) {
    return junkyardQualityProfiles.low!;
  }
  if (memory >= 12 && cores >= 10) {
    return junkyardQualityProfiles.high!;
  }
  return junkyardQualityProfiles.medium!;
}
