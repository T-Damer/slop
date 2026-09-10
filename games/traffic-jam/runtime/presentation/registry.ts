import {
  trafficColorOrder,
  trafficColors,
  trafficDirections,
  trafficLocations,
  trafficRules,
  type TrafficColor,
  type TrafficDirection,
  type TrafficLocation,
} from '../domain/registry.ts';

export const parkingUiIds = {
  root: 'slop-parking-jam',
  style: 'slop-parking-jam-style',
} as const;

export const parkingUiActions = {
  undo: 'undo',
  reset: 'reset',
  hint: 'hint',
  next: 'next',
  retry: 'retry',
} as const;

export const parkingUiAttributes = {
  action: 'data-action',
} as const;

export const parkingUiEvents = {
  click: 'click',
  pointerUp: 'pointerup',
  resize: 'resize',
  visibilityChange: 'visibilitychange',
} as const;

export const parkingUiKeys = {
  undo: 'z',
  reset: 'r',
  hint: 'h',
} as const;

export const parkingUiTimings = {
  carReleaseMs: 520,
  passengerGroupWalkMs: 500,
  passengerStaggerMs: 42,
  passengerGapMs: 24,
  groupImpactMs: 520,
  carDepartureMs: 340,
  blockedPulseMs: 480,
  hintPulseMs: 760,
  completionDelayMs: 700,
  popupMs: 820,
} as const;

export const parkingUiCopy = {
  title: 'Parking Jam',
  level: 'Level',
  score: 'Score',
  coins: 'coins',
  combo: 'combo',
  queue: 'Queue',
  targetLabel: 'Bring next',
  targetSuffix: 'car',
  groupSuffix: 'people',
  instruction: 'Tap a car with a clear route. Match the passenger queue.',
  instructionPrefix: 'Bring the',
  instructionMiddle: 'car for',
  instructionSuffix: 'waiting people.',
  blocked: 'That car is blocked. Follow its roof arrow.',
  noBay: 'Pickup bays are full.',
  hint: 'Try the highlighted car.',
  shuffled: 'The parking layout has been shuffled.',
  completedTitle: 'Parking cleared!',
  completedBody: 'Every passenger group found the right car.',
  jammedTitle: 'Pickup jam',
  jammedBody: 'The next group cannot reach a matching car. Undo or reshuffle.',
  next: 'Next level',
  replay: 'Play again',
  retry: 'Undo last car',
  reset: 'Shuffle',
  undo: 'Undo',
  hintButton: 'Hint',
} as const;

export const parkingUiSymbols = {
  coin: '●',
  undo: '↶',
  reset: '↻',
  hint: '?',
  targetArrow: '›',
  group: '×',
} as const;

export const parkingLayout = {
  maxPixelRatio: 1.6,
  cellSize: 0.86,
  carY: 0.2,
  personY: 0.01,
  boardOffsetZ: 1.85,
  lotWidth: trafficRules.boardColumns * 0.86 + 0.48,
  lotDepth: trafficRules.boardRows * 0.86 + 0.48,
  lotHeight: 0.15,
  lotY: 0.015,
  roadApronMargin: 1.18,
  roadApronHeight: 0.08,
  exitChevronOffset: 0.7,
  exitChevronScale: 0.58,
  bayCountMaximum: 4,
  bayX: [-2.38, -0.8, 0.8, 2.38],
  bayZ: -3.6,
  bayWidth: 1.42,
  bayDepth: 1.58,
  queueVisibleLimit: 60,
  queueColumns: 12,
  queueStartX: -3.1,
  queueStartZ: -5.02,
  queueSpacingX: 0.56,
  queueSpacingZ: 0.48,
  roadMergeZ: -2.55,
  outerRoadX: 4.45,
  departureZ: -8.7,
  exitMargin: 0.72,
  cameraHeightSpan: 14.8,
  cameraMinimumWidth: 8.7,
  cameraLookZ: 0.15,
  shadowMapSize: 1024,
  targetPulseMinimum: 0.12,
  targetPulseMaximum: 0.3,
  recommendedPulseScale: 0.055,
  passengerPriorityScale: 1.12,
  passengerGroupPriorityScale: 1.06,
  passengerDoorOffset: 0.52,
  passengerApproachZ: 0.78,
  passengerCrowdSpread: 0.16,
  identityRingInnerRadius: 0.26,
  identityRingOuterRadius: 0.34,
  identityRingY: 0.91,
  cityBuildingCount: 9,
  beachPalmCount: 7,
  beachUmbrellaCount: 5,
  queueHudLimit: 14,
  boardingParticleMinimum: 12,
  boardingParticleMultiplier: 3,
  celebrationPieceCount: 52,
} as const;

export const parkingCamera = {
  positionX: 8.1,
  positionY: 12.4,
  positionZ: 14.2,
  near: 0.1,
  far: 80,
  toneMappingExposure: 1.08,
  fogNear: 16,
  fogFar: 31,
} as const;

export const parkingDirectionYaw: Readonly<Record<TrafficDirection, number>> = {
  [trafficDirections.up]: 0,
  [trafficDirections.right]: Math.PI / 2,
  [trafficDirections.down]: Math.PI,
  [trafficDirections.left]: -Math.PI / 2,
};

export const parkingDirectionVectors: Readonly<Record<TrafficDirection, Readonly<{ x: number; z: number }>>> = {
  [trafficDirections.up]: { x: 0, z: 1 },
  [trafficDirections.right]: { x: 1, z: 0 },
  [trafficDirections.down]: { x: 0, z: -1 },
  [trafficDirections.left]: { x: -1, z: 0 },
};

export interface ParkingCarColorDefinition {
  readonly id: TrafficColor;
  readonly name: string;
  readonly css: string;
  readonly value: number;
}

export const parkingCarColors: ReadonlyArray<ParkingCarColorDefinition> = [
  { id: trafficColors.coral, name: 'coral', css: '#ff6f61', value: 0xff6f61 },
  { id: trafficColors.blue, name: 'blue', css: '#3b82f6', value: 0x3b82f6 },
  { id: trafficColors.mint, name: 'mint', css: '#43d17b', value: 0x43d17b },
  { id: trafficColors.yellow, name: 'yellow', css: '#ffd43b', value: 0xffd43b },
  { id: trafficColors.violet, name: 'violet', css: '#a855f7', value: 0xa855f7 },
  { id: trafficColors.orange, name: 'orange', css: '#ff9f1c', value: 0xff9f1c },
  { id: trafficColors.teal, name: 'teal', css: '#16b8a6', value: 0x16b8a6 },
  { id: trafficColors.pink, name: 'pink', css: '#f472b6', value: 0xf472b6 },
  { id: trafficColors.lime, name: 'lime', css: '#a3e635', value: 0xa3e635 },
  { id: trafficColors.sky, name: 'sky blue', css: '#38bdf8', value: 0x38bdf8 },
  { id: trafficColors.red, name: 'red', css: '#e63946', value: 0xe63946 },
  { id: trafficColors.indigo, name: 'indigo', css: '#6366f1', value: 0x6366f1 },
] as const;

const colorDefinitionById = new Map(
  parkingCarColors.map((definition) => [definition.id, definition]),
);

export const parkingColorPalette = Object.fromEntries(
  trafficColorOrder.map((color) => [color, colorDefinitionById.get(color)!.value]),
) as Readonly<Record<TrafficColor, number>>;

export const parkingColorCss = Object.fromEntries(
  trafficColorOrder.map((color) => [color, colorDefinitionById.get(color)!.css]),
) as Readonly<Record<TrafficColor, string>>;

export const parkingColorNames = Object.fromEntries(
  trafficColorOrder.map((color) => [color, colorDefinitionById.get(color)!.name]),
) as Readonly<Record<TrafficColor, string>>;

export interface ParkingLocationTheme {
  readonly name: string;
  readonly sky: number;
  readonly fog: number;
  readonly ground: number;
  readonly road: number;
  readonly asphalt: number;
  readonly asphaltEdge: number;
  readonly concrete: number;
  readonly concreteDark: number;
  readonly marking: number;
  readonly water: number;
  readonly accent: number;
}

export const parkingLocationThemes: Readonly<Record<TrafficLocation, ParkingLocationTheme>> = {
  [trafficLocations.city]: {
    name: 'City',
    sky: 0xc8e6dc,
    fog: 0xc8e6dc,
    ground: 0x76a66b,
    road: 0x4b5352,
    asphalt: 0x686e6b,
    asphaltEdge: 0x919590,
    concrete: 0xc7c3ac,
    concreteDark: 0x7c8078,
    marking: 0xe7e3c8,
    water: 0x4da8cc,
    accent: 0xe8a85a,
  },
  [trafficLocations.beach]: {
    name: 'Beach',
    sky: 0x9eddf0,
    fog: 0xc8edf2,
    ground: 0xe7cf91,
    road: 0x565d5c,
    asphalt: 0x747a75,
    asphaltEdge: 0xa5a69d,
    concrete: 0xd7c69e,
    concreteDark: 0x958b70,
    marking: 0xfff2c5,
    water: 0x35a6d6,
    accent: 0xff7b65,
  },
} as const;

export const parkingLocationNames = Object.fromEntries(
  Object.entries(parkingLocationThemes).map(([location, theme]) => [location, theme.name]),
) as Readonly<Record<TrafficLocation, string>>;

export const parkingSceneColors = {
  exitMarking: 0xf7f2cf,
  pickup: 0xf0d34d,
  pickupInactive: 0x8d8b78,
  concrete: 0xc7c3ac,
  concreteDark: 0x7c8078,
  danger: 0xe35a54,
  gold: 0xf5c744,
  target: 0xffffff,
  white: 0xffffff,
  window: 0x274d5a,
  tire: 0x222728,
  rim: 0xb8c2c1,
  skin: 0xe6ad80,
  hair: 0x573d2b,
  treeTrunk: 0x79573a,
  treeLeaves: 0x4f9d61,
  lamp: 0x4b5755,
  cityBuildingPalette: [0xe9b067, 0xc97e70, 0x7fa9b8, 0xc9b37f, 0xa985ad],
  cityWindow: 0x6eb9d0,
  beachPalmLeaves: 0x3f9c62,
  beachPalmTrunk: 0xa67c4f,
  beachUmbrellaPalette: [0xff7b65, 0x4dbde0, 0xf5cf4e, 0x9a76d9],
  beachFoam: 0xeefcff,
} as const;
