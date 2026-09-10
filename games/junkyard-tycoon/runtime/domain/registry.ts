export const junkyardInteractionIds = {
  buildPump: 'build-pump',
  collectRegister: 'collect-register',
  fuelCar: 'fuel-car',
  junkCrates: 'junk-crates',
  junkTires: 'junk-tires',
  junkWreck: 'junk-wreck',
  talkMechanic: 'talk-mechanic',
} as const;

export const junkyardObjectiveIds = {
  buildPump: 'build-pump',
  clearJunk: 'clear-junk',
  collectPayment: 'collect-payment',
  freePlay: 'free-play',
  fuelCar: 'fuel-car',
} as const;

export const junkyardRules = {
  initialCash: 0,
  initialScrap: 0,
  junkCashAward: 4,
  junkScrapAward: 1,
  junkTarget: 3,
  pumpScrapCost: 3,
  fuelPayment: 24,
  firstPaymentTarget: 1,
  fuelCooldownMs: 2400,
  registerDurationMs: 650,
  talkDurationMs: 500,
  junkDurationMs: 900,
  buildDurationMs: 1500,
  fuelDurationMs: 1700,
} as const;
