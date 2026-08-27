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

export const trafficCarStatuses = {
  parked: 'parked',
  waiting: 'waiting',
  departed: 'departed',
} as const;

export const trafficRules = {
  boardColumns: 8,
  boardRows: 10,
  carLength: 2,
  carCapacity: 1,
  horizontalZoneColumns: 4,
  verticalZoneStartColumn: 4,
  verticalCarsPerColumn: 5,
  verticalTopChainLength: 3,
  firstCoordinate: 0,
  firstIndex: 0,
  cellStep: 1,
  emptyCollectionSize: 0,
  initialMoveCount: 0,
  initialScore: 0,
  initialCoins: 0,
  initialCombo: 1,
  maximumCombo: 9,
  passengerPoints: 80,
  departurePoints: 240,
  departureCoins: 3,
  solverMaximumVisitedStates: 250_000,
} as const;

export const trafficLevelPatterns = {
  cityBlock: {
    id: 'parking-level-01',
    name: 'City block',
    objective: 'Match the queue without filling all pickup bays.',
    horizontalRows: 6,
    verticalColumns: 3,
    bayCount: 3,
    colorOffset: 0,
  },
  rushHour: {
    id: 'parking-level-02',
    name: 'Rush hour',
    objective: 'Keep a pickup bay open while the lot gets busier.',
    horizontalRows: 8,
    verticalColumns: 4,
    bayCount: 3,
    colorOffset: 3,
  },
  bossLot: {
    id: 'parking-level-03',
    name: 'Boss lot',
    objective: 'Clear the full lot and protect the passenger queue.',
    horizontalRows: 10,
    verticalColumns: 4,
    bayCount: 4,
    colorOffset: 6,
  },
} as const;

export const trafficGame = {
  id: 'parking-jam',
  title: 'Parking Jam',
  progressStorageKey: 'slop.parking-jam.progress.v2',
  coinStorageKey: 'slop.parking-jam.coins.v2',
} as const;

export const trafficEvents = {
  carReleased: 'parking.car-released',
  passengerBoarded: 'parking.passenger-boarded',
  carDeparted: 'parking.car-departed',
  comboReset: 'parking.combo-reset',
  levelCompleted: 'parking.level-completed',
} as const;

export const trafficErrors = {
  carMissing: 'parking.car-missing',
  carUnavailable: 'parking.car-unavailable',
  pathBlocked: 'parking.path-blocked',
  noBayAvailable: 'parking.no-bay-available',
  levelCompleted: 'parking.level-completed',
  stateJammed: 'parking.state-jammed',
  invalidLevel: 'parking.invalid-level',
  solverLimit: 'parking.solver-limit',
} as const;

export const trafficIdPrefixes = {
  horizontalOuter: 'h-outer',
  horizontalInner: 'h-inner',
  vertical: 'v',
} as const;

export type TrafficDirection = ValueOf<typeof trafficDirections>;
export type TrafficColor = ValueOf<typeof trafficColors>;
export type TrafficCarStatus = ValueOf<typeof trafficCarStatuses>;
export type TrafficEventType = ValueOf<typeof trafficEvents>;
export type TrafficErrorCode = ValueOf<typeof trafficErrors>;
