import {
  createProximityWorldState,
  setProximityInteractionStatus,
  stepProximityWorld,
} from '../../../shared/proximity-world/domain/rules.ts';
import {
  proximityEventTypes,
  proximityInteractionStatuses,
} from '../../../shared/proximity-world/domain/types.ts';
import {
  junkyardInitialStatuses,
  junkyardLevel,
} from './level.ts';
import {
  junkyardInteractionIds,
  junkyardObjectiveIds,
  junkyardRules,
} from './registry.ts';
import {
  junkyardEventTypes,
  type JunkyardDomainEvent,
  type JunkyardInput,
  type JunkyardObjective,
  type JunkyardState,
  type JunkyardStepResult,
} from './types.ts';

const junkInteractionIds = new Set<string>([
  junkyardInteractionIds.junkCrates,
  junkyardInteractionIds.junkTires,
  junkyardInteractionIds.junkWreck,
]);

export function createInitialJunkyardState(): JunkyardState {
  return {
    world: createProximityWorldState(
      junkyardLevel.world,
      junkyardLevel.spawn,
      junkyardInitialStatuses,
    ),
    cash: junkyardRules.initialCash,
    scrap: junkyardRules.initialScrap,
    clearedJunkCount: 0,
    pumpBuilt: false,
    carsFueled: 0,
    pendingRegisterCash: 0,
    paymentsCollected: 0,
    mechanicGreeted: false,
  };
}

export function stepJunkyard(
  state: JunkyardState,
  input: JunkyardInput,
): JunkyardStepResult {
  const worldResult = stepProximityWorld(junkyardLevel.world, state.world, input);
  let next: JunkyardState = { ...state, world: worldResult.state };
  const events: Array<JunkyardDomainEvent> = [];

  for (const event of worldResult.events) {
    if (event.type !== proximityEventTypes.interactionCompleted) {
      continue;
    }
    const handled = handleCompletion(next, event.interactionId);
    next = handled.state;
    events.push(...handled.events);
  }

  next = syncInteractionAvailability(next);
  return { state: next, events };
}

export function getJunkyardObjective(state: JunkyardState): JunkyardObjective {
  if (state.clearedJunkCount < junkyardRules.junkTarget) {
    return {
      id: junkyardObjectiveIds.clearJunk,
      current: state.clearedJunkCount,
      target: junkyardRules.junkTarget,
    };
  }
  if (!state.pumpBuilt) {
    return {
      id: junkyardObjectiveIds.buildPump,
      current: state.scrap,
      target: junkyardRules.pumpScrapCost,
    };
  }
  if (state.carsFueled < junkyardRules.firstPaymentTarget) {
    return {
      id: junkyardObjectiveIds.fuelCar,
      current: state.carsFueled,
      target: junkyardRules.firstPaymentTarget,
    };
  }
  if (state.paymentsCollected < junkyardRules.firstPaymentTarget) {
    return {
      id: junkyardObjectiveIds.collectPayment,
      current: state.paymentsCollected,
      target: junkyardRules.firstPaymentTarget,
    };
  }
  return {
    id: junkyardObjectiveIds.freePlay,
    current: state.carsFueled,
    target: state.carsFueled,
  };
}

function handleCompletion(
  state: JunkyardState,
  interactionId: string,
): JunkyardStepResult {
  if (junkInteractionIds.has(interactionId)) {
    return clearJunk(state, interactionId);
  }
  if (interactionId === junkyardInteractionIds.buildPump) {
    return buildPump(state, interactionId);
  }
  if (interactionId === junkyardInteractionIds.fuelCar) {
    return fuelCar(state, interactionId);
  }
  if (interactionId === junkyardInteractionIds.collectRegister) {
    return collectRegister(state, interactionId);
  }
  if (interactionId === junkyardInteractionIds.talkMechanic) {
    return greetMechanic(state, interactionId);
  }
  return { state, events: [] };
}

function clearJunk(
  state: JunkyardState,
  interactionId: string,
): JunkyardStepResult {
  return {
    state: {
      ...state,
      cash: state.cash + junkyardRules.junkCashAward,
      scrap: state.scrap + junkyardRules.junkScrapAward,
      clearedJunkCount: state.clearedJunkCount + 1,
    },
    events: [{
      type: junkyardEventTypes.junkCleared,
      interactionId,
      scrapAwarded: junkyardRules.junkScrapAward,
      cashAwarded: junkyardRules.junkCashAward,
    }],
  };
}

function buildPump(
  state: JunkyardState,
  interactionId: string,
): JunkyardStepResult {
  if (state.scrap < junkyardRules.pumpScrapCost || state.pumpBuilt) {
    return { state, events: [] };
  }
  return {
    state: {
      ...state,
      scrap: state.scrap - junkyardRules.pumpScrapCost,
      pumpBuilt: true,
    },
    events: [{
      type: junkyardEventTypes.pumpBuilt,
      interactionId,
      scrapSpent: junkyardRules.pumpScrapCost,
    }],
  };
}

function fuelCar(
  state: JunkyardState,
  interactionId: string,
): JunkyardStepResult {
  if (!state.pumpBuilt) {
    return { state, events: [] };
  }
  return {
    state: {
      ...state,
      carsFueled: state.carsFueled + 1,
      pendingRegisterCash:
        state.pendingRegisterCash + junkyardRules.fuelPayment,
    },
    events: [{
      type: junkyardEventTypes.carFueled,
      interactionId,
      paymentQueued: junkyardRules.fuelPayment,
    }],
  };
}

function collectRegister(
  state: JunkyardState,
  interactionId: string,
): JunkyardStepResult {
  if (state.pendingRegisterCash <= 0) {
    return { state, events: [] };
  }
  const cashCollected = state.pendingRegisterCash;
  return {
    state: {
      ...state,
      cash: state.cash + cashCollected,
      pendingRegisterCash: 0,
      paymentsCollected: state.paymentsCollected + 1,
    },
    events: [{
      type: junkyardEventTypes.cashCollected,
      interactionId,
      cashCollected,
    }],
  };
}

function greetMechanic(
  state: JunkyardState,
  interactionId: string,
): JunkyardStepResult {
  return {
    state: { ...state, mechanicGreeted: true },
    events: [{
      type: junkyardEventTypes.mechanicGreeted,
      interactionId,
    }],
  };
}

function syncInteractionAvailability(state: JunkyardState): JunkyardState {
  let world = state.world;
  if (
    state.clearedJunkCount >= junkyardRules.junkTarget
    && !state.pumpBuilt
  ) {
    world = setProximityInteractionStatus(
      world,
      junkyardInteractionIds.buildPump,
      proximityInteractionStatuses.ready,
    );
  }
  if (
    state.pumpBuilt
    && world.interactions[junkyardInteractionIds.fuelCar]?.status
      === proximityInteractionStatuses.locked
  ) {
    world = setProximityInteractionStatus(
      world,
      junkyardInteractionIds.fuelCar,
      proximityInteractionStatuses.ready,
    );
  }
  world = setProximityInteractionStatus(
    world,
    junkyardInteractionIds.collectRegister,
    state.pendingRegisterCash > 0
      ? proximityInteractionStatuses.ready
      : proximityInteractionStatuses.locked,
  );
  return world === state.world ? state : { ...state, world };
}
