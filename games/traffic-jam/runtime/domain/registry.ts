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

export type TrafficColor = ValueOf<typeof trafficColors>;

export const trafficColorOrder: ReadonlyArray<TrafficColor> = [
  trafficColors.coral,
  trafficColors.blue,
  trafficColors.mint,
  trafficColors.yellow,
  trafficColors.violet,
  trafficColors.orange,
  trafficColors.teal,
  trafficColors.pink,
  trafficColors.lime,
  trafficColors.sky,
  trafficColors.red,
  trafficColors.indigo,
] as const;

export const trafficLocations = {
  city: 'city',
  beach: 'beach',
} as const;

export type TrafficLocation = ValueOf<typeof trafficLocations>;

export const trafficCarStatuses = {
  parked: 'parked',
  waiting: 'waiting',
  departed: 'departed',
} as const;

export const trafficPassengerGroupSizes = [4, 5, 6, 7] as const;

export const trafficRules = {
  boardColumns: 8,
  boardRows: 10,
  carLength: 2,
  horizontalZoneColumns: 4,
  verticalZoneStartColumn: 4,
  verticalCarsPerColumn: 5,
  verticalMinimumTopChainLength: 1,
  verticalMaximumTopChainLength: 4,
  firstCoordinate: 0,
  firstIndex: 0,
  cellStep: 1,
  emptyCollectionSize: 0,
  initialMoveCount: 0,
  initialScore: 0,
  initialCoins: 0,
  initialCombo: 1,
  maximumCombo: 9,
  passengerPoints: 45,
  departurePoints: 260,
  departureCoins: 5,
  solverMaximumVisitedStates: 250_000,
} as const;

export const trafficRandomization = {
  defaultVariantSeeds: [1103, 2207, 3301],
  fallbackSeed: 0x6d2b79f5,
  seedIncrement: 0x9e3779b9,
  uint32Divisor: 0x1_0000_0000,
  hashOffset: 0x811c9dc5,
  hashPrime: 0x01000193,
} as const;

export const trafficLevelPatterns = {
  cityBlock: {
    id: 'parking-level-01',
    name: 'City block',
    objective: 'Bring each passenger group to a matching car.',
    horizontalRows: 6,
    verticalColumns: 3,
    bayCount: 3,
    colorOffset: 0,
    groupSizeOffset: 0,
    locations: [trafficLocations.city],
  },
  beachRush: {
    id: 'parking-level-02',
    name: 'Beach rush',
    objective: 'Keep a pickup bay open while beach traffic clears.',
    horizontalRows: 8,
    verticalColumns: 4,
    bayCount: 3,
    colorOffset: 3,
    groupSizeOffset: 1,
    locations: [trafficLocations.beach],
  },
  bossLot: {
    id: 'parking-level-03',
    name: 'Boss lot',
    objective: 'Clear the full lot without trapping the passenger crowd.',
    horizontalRows: 10,
    verticalColumns: 4,
    bayCount: 4,
    colorOffset: 6,
    groupSizeOffset: 2,
    locations: [trafficLocations.city, trafficLocations.beach],
  },
} as const;

export const trafficGame = {
  id: 'parking-jam',
  title: 'Parking Jam',
  progressStorageKey: 'slop.parking-jam.progress.v3',
  coinStorageKey: 'slop.parking-jam.coins.v3',
} as const;

export const trafficEvents = {
  carReleased: 'parking.car-released',
  passengerGroupBoarded: 'parking.passenger-group-boarded',
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
export type TrafficCarStatus = ValueOf<typeof trafficCarStatuses>;
export type TrafficEventType = ValueOf<typeof trafficEvents>;
export type TrafficErrorCode = ValueOf<typeof trafficErrors>;
