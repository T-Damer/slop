import {
  trafficColors,
  trafficDirections,
  trafficRules,
  type TrafficColor,
  type TrafficDirection,
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
  carReleaseMs: 940,
  passengerWalkMs: 620,
  passengerGapMs: 90,
  carDepartureMs: 620,
  blockedPulseMs: 560,
  hintPulseMs: 920,
  completionDelayMs: 900,
  popupMs: 900,
} as const;

export const parkingUiCopy = {
  title: 'Parking Jam',
  level: 'Level',
  score: 'Score',
  coins: 'coins',
  combo: 'combo',
  queue: 'Next',
  instruction: 'Tap a car with a clear route. Match the passenger queue.',
  blocked: 'That car is blocked.',
  noBay: 'Pickup bays are full.',
  hint: 'Try the highlighted car.',
  completedTitle: 'Parking cleared!',
  completedBody: 'Every passenger found the right car.',
  jammedTitle: 'Pickup jam',
  jammedBody: 'The next passenger cannot reach a matching car. Undo or reset.',
  next: 'Next level',
  replay: 'Play again',
  retry: 'Undo last car',
  reset: 'Reset',
  undo: 'Undo',
  hintButton: 'Hint',
} as const;

export const parkingUiSymbols = {
  coin: '●',
  undo: '↶',
  reset: '↻',
  hint: '?',
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
  bayCountMaximum: 4,
  bayX: [-2.38, -0.8, 0.8, 2.38],
  bayZ: -3.6,
  bayWidth: 1.42,
  bayDepth: 1.58,
  queueVisibleLimit: 40,
  queueColumns: 10,
  queueStartX: -3.1,
  queueStartZ: -5.14,
  queueSpacingX: 0.68,
  queueSpacingZ: 0.58,
  roadMergeZ: -2.55,
  outerRoadX: 4.45,
  departureZ: -8.7,
  exitMargin: 0.72,
  cameraHeightSpan: 14.8,
  cameraMinimumWidth: 8.7,
  cameraLookZ: 0.15,
  shadowMapSize: 1024,
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

export const parkingColorPalette: Readonly<Record<TrafficColor, number>> = {
  [trafficColors.coral]: 0xf17f72,
  [trafficColors.blue]: 0x52bde9,
  [trafficColors.mint]: 0x72d9aa,
  [trafficColors.yellow]: 0xf2cf54,
  [trafficColors.violet]: 0xb990e9,
  [trafficColors.orange]: 0xf1a15e,
  [trafficColors.teal]: 0x50ccc3,
  [trafficColors.pink]: 0xed91b4,
  [trafficColors.lime]: 0xaad45f,
  [trafficColors.sky]: 0x74ccea,
  [trafficColors.red]: 0xdf6269,
  [trafficColors.indigo]: 0x7885de,
};

export const parkingSceneColors = {
  sky: 0xc8e6dc,
  fog: 0xc8e6dc,
  grass: 0x76a66b,
  road: 0x4b5352,
  asphalt: 0x686e6b,
  asphaltEdge: 0x919590,
  marking: 0xe7e3c8,
  concrete: 0xc7c3ac,
  concreteDark: 0x7c8078,
  pickup: 0xf0d34d,
  pickupInactive: 0x8d8b78,
  danger: 0xe35a54,
  gold: 0xf5c744,
  white: 0xffffff,
  window: 0x274d5a,
  tire: 0x222728,
  rim: 0xb8c2c1,
  skin: 0xe6ad80,
  hair: 0x573d2b,
  treeTrunk: 0x79573a,
  treeLeaves: 0x4f9d61,
  lamp: 0x4b5755,
} as const;
