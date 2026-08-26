export type ValueOf<T> = T[keyof T];

export const trafficDirections = {
  left: 'left',
  right: 'right',
  up: 'up',
  down: 'down',
} as const;

export const trafficColors = {
  coral: 'coral',
  blue: 'blue',
  mint: 'mint',
  yellow: 'yellow',
  violet: 'violet',
  orange: 'orange',
  teal: 'teal',
  pink: 'pink',
  lime: 'lime',
  sky: 'sky',
  red: 'red',
  indigo: 'indigo',
} as const;

export const trafficRules = {
  boardColumns: 6,
  boardRows: 6,
  minimumVehicleLength: 2,
  maximumVehicleLength: 3,
  initialMoveCount: 0,
  firstCoordinate: 0,
  firstIndex: 0,
  cellStep: 1,
  emptyCollectionSize: 0,
} as const;

export const trafficGame = {
  id: 'traffic-jam',
  title: 'Traffic Jam',
  progressStorageKey: 'slop.traffic-jam.progress.v1',
} as const;

export const trafficEvents = {
  vehicleReleased: 'traffic.vehicle-released',
  levelCompleted: 'traffic.level-completed',
  moveRejected: 'traffic.move-rejected',
} as const;

export const trafficErrors = {
  vehicleMissing: 'traffic.vehicle-missing',
  vehicleAlreadyReleased: 'traffic.vehicle-already-released',
  pathBlocked: 'traffic.path-blocked',
  levelCompleted: 'traffic.level-completed',
  invalidLevel: 'traffic.invalid-level',
} as const;

export type TrafficDirection = ValueOf<typeof trafficDirections>;
export type TrafficColor = ValueOf<typeof trafficColors>;
export type TrafficEventType = ValueOf<typeof trafficEvents>;
export type TrafficErrorCode = ValueOf<typeof trafficErrors>;
