export const billiardsBallIds = {
  cue: 0,
  eight: 8,
  solids: [1, 2, 3, 4, 5, 6, 7],
  stripes: [9, 10, 11, 12, 13, 14, 15],
  allObjects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
} as const;

export const billiardsBallKinds = {
  cue: 'cue',
  solid: 'solid',
  eight: 'eight',
  stripe: 'stripe',
} as const;

export const billiardsPlayerGroups = {
  open: 'open',
  solids: 'solids',
  stripes: 'stripes',
} as const;

export const billiardsMatchPhases = {
  break: 'break',
  open: 'open',
  groups: 'groups',
  finished: 'finished',
} as const;

export const billiardsTableIds = {
  pockets: {
    topLeft: 'pocket-top-left',
    topMiddle: 'pocket-top-middle',
    topRight: 'pocket-top-right',
    bottomLeft: 'pocket-bottom-left',
    bottomMiddle: 'pocket-bottom-middle',
    bottomRight: 'pocket-bottom-right',
  },
  cushions: {
    topLeft: 'cushion-top-left',
    topRight: 'cushion-top-right',
    bottomLeft: 'cushion-bottom-left',
    bottomRight: 'cushion-bottom-right',
    left: 'cushion-left',
    right: 'cushion-right',
  },
} as const;

export const billiardsCollisionKinds = {
  ball: 'ball-ball',
  cushion: 'ball-cushion',
  jaw: 'ball-jaw',
  pocket: 'ball-pocket',
} as const;

export const billiardsPhysics = {
  schemaVersion: 1,
  fixedStepSeconds: 1 / 120,
  maximumFrameSteps: 12,
  maximumCollisionIterations: 28,
  collisionEpsilonSeconds: 1e-7,
  separationEpsilon: 0.002,
  velocityEpsilon: 1e-8,
  stopSpeed: 1.5,
  tableWidth: 254,
  tableHeight: 127,
  ballRadius: 2.85,
  cornerPocketRadius: 7.2,
  sidePocketRadius: 6.6,
  cornerMouthHalfWidth: 10.2,
  sideMouthHalfWidth: 7.8,
  ballRestitution: 0.96,
  cushionRestitution: 0.82,
  jawRestitution: 0.78,
  rollingDeceleration: 43,
  sideSpinDecayPerSecond: 1.8,
  followSpinDecayPerSecond: 2.4,
  cushionSpinTransfer: 14,
  ballSpinTransfer: 0.11,
  maximumShotSpeed: 430,
  minimumShotSpeed: 34,
  maximumGuideDistance: 280,
  objectGuideDistance: 24,
  maximumShotSteps: 120 * 24,
} as const;

export const billiardsRules = {
  schemaVersion: 1,
  playerCount: 2,
  maximumPower: 1,
  minimumPower: 0.04,
  maximumSpin: 1,
  cueHeadSpotFraction: -0.52,
  cuePlacementRows: 14,
  cuePlacementColumns: 18,
  noRailAfterContactIsFoul: true,
  eightOnBreakReracks: true,
} as const;

export const billiardsMessages = {
  placementRequired: 'Сначала подтвердите установку битка',
  break: 'Разбей пирамиду',
  openTable: 'Стол открыт',
  solids: 'Сплошные',
  stripes: 'Полосатые',
  foul: 'Фол — соперник получает биток с руки',
  noContact: 'Фол: биток не коснулся прицельного шара',
  wrongFirstContact: 'Фол: первым задет чужой шар',
  noRail: 'Фол: после контакта не было борта или забитого шара',
  scratch: 'Фол: биток упал в лузу',
  eightEarly: 'Восьмёрка забита раньше времени',
  eightWin: 'Восьмёрка забита правильно',
  rerack: 'Восьмёрка на разбое — новая пирамида',
  turn: 'Ход игрока',
} as const;
