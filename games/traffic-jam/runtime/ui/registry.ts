import {
  trafficColors,
  trafficDirections,
  type TrafficColor,
  type TrafficDirection,
} from '../domain/registry.ts';

export const trafficUiIds = {
  root: 'slop-traffic-jam',
  style: 'slop-traffic-jam-style',
} as const;

export const trafficUiActions = {
  vehicle: 'vehicle',
  reset: 'reset',
  undo: 'undo',
  hint: 'hint',
  next: 'next',
  replay: 'replay',
} as const;

export const trafficUiAttributes = {
  action: 'data-action',
  vehicleId: 'data-vehicle-id',
  direction: 'data-direction',
} as const;

export const trafficUiClasses = {
  app: 'traffic-app',
  busy: 'is-busy',
  exiting: 'is-exiting',
  blocked: 'is-blocked',
  blocking: 'is-blocking',
  hinted: 'is-hinted',
} as const;

export const trafficUiEvents = {
  click: 'click',
  keydown: 'keydown',
} as const;

export const trafficUiKeys = {
  reset: 'r',
  hint: 'h',
  undo: 'z',
  escape: 'Escape',
} as const;

export const trafficUiTimings = {
  exitAnimationMs: 460,
  blockedPulseMs: 640,
  hintPulseMs: 1200,
  statusResetMs: 1700,
} as const;

export const trafficUiLayout = {
  percentageScale: 100,
  horizontalArrowDegrees: 0,
  downArrowDegrees: 90,
  leftArrowDegrees: 180,
  upArrowDegrees: -90,
} as const;

export const trafficUiCopy = {
  eyebrow: 'SLOP / MODOKI SPIKE',
  title: 'Traffic Jam',
  levelLabel: 'LEVEL',
  movesLabel: 'MOVES',
  remainingLabel: 'CARS',
  reset: 'Reset',
  undo: 'Undo',
  hint: 'Hint',
  next: 'Next level',
  replay: 'Play again',
  instruction: 'Tap a car with a clear route. Every car follows its arrow.',
  blocked: 'That route is blocked.',
  hintPrefix: 'Try the highlighted car.',
  completedTitle: 'Road cleared',
  completedBodyPrefix: 'Solved in',
  completedBodySuffix: 'moves.',
  allCompletedTitle: 'All roads cleared',
  allCompletedBody: 'You completed the current Traffic Jam prototype.',
  keyboardHelp: 'Keyboard: H hint · Z undo · R reset',
  vehicleAriaPrefix: 'Release car',
} as const;

export const trafficUiSymbols = {
  arrow: '➜',
  reset: '↻',
  undo: '↶',
  hint: '✦',
  check: '✓',
} as const;

export const trafficDirectionAngles: Readonly<Record<TrafficDirection, number>> = {
  [trafficDirections.right]: trafficUiLayout.horizontalArrowDegrees,
  [trafficDirections.down]: trafficUiLayout.downArrowDegrees,
  [trafficDirections.left]: trafficUiLayout.leftArrowDegrees,
  [trafficDirections.up]: trafficUiLayout.upArrowDegrees,
};

export const trafficVehiclePalette: Readonly<Record<TrafficColor, string>> = {
  [trafficColors.coral]: '#ff8075',
  [trafficColors.blue]: '#6cacff',
  [trafficColors.mint]: '#6ee0ad',
  [trafficColors.yellow]: '#f6ce67',
  [trafficColors.violet]: '#b58cff',
  [trafficColors.orange]: '#ffab64',
  [trafficColors.teal]: '#57d4d1',
  [trafficColors.pink]: '#f28fb8',
  [trafficColors.lime]: '#b4dc67',
  [trafficColors.sky]: '#7ed3f7',
  [trafficColors.red]: '#ef6570',
  [trafficColors.indigo]: '#7f88e8',
};
