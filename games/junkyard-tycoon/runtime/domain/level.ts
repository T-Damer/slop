import {
  proximityInteractionStatuses,
  type ProximityInteractionStatus,
} from '../../../shared/proximity-world/domain/types.ts';
import {
  junkyardInteractionIds,
  junkyardRules,
} from './registry.ts';
import {
  junkyardInteractionKinds,
  type JunkyardLevelDefinition,
} from './types.ts';

export const junkyardLevel: JunkyardLevelDefinition = {
  world: {
    bounds: {
      minimumX: -6.2,
      maximumX: 6.2,
      minimumZ: -5.4,
      maximumZ: 5.8,
    },
    movementSpeed: 4.4,
    interactions: [
      {
        id: junkyardInteractionIds.talkMechanic,
        kind: junkyardInteractionKinds.talk,
        position: { x: -2.6, z: 1.4 },
        radius: 1.1,
        durationMs: junkyardRules.talkDurationMs,
        repeatable: false,
        cooldownMs: 0,
      },
      {
        id: junkyardInteractionIds.junkCrates,
        kind: junkyardInteractionKinds.junk,
        position: { x: 2.1, z: 0.2 },
        radius: 1.05,
        durationMs: junkyardRules.junkDurationMs,
        repeatable: false,
        cooldownMs: 0,
      },
      {
        id: junkyardInteractionIds.junkTires,
        kind: junkyardInteractionKinds.junk,
        position: { x: 3.4, z: 2.1 },
        radius: 1.05,
        durationMs: junkyardRules.junkDurationMs,
        repeatable: false,
        cooldownMs: 0,
      },
      {
        id: junkyardInteractionIds.junkWreck,
        kind: junkyardInteractionKinds.junk,
        position: { x: 0.9, z: 3.2 },
        radius: 1.15,
        durationMs: junkyardRules.junkDurationMs,
        repeatable: false,
        cooldownMs: 0,
      },
      {
        id: junkyardInteractionIds.buildPump,
        kind: junkyardInteractionKinds.build,
        position: { x: 0.7, z: -2.8 },
        radius: 1.1,
        durationMs: junkyardRules.buildDurationMs,
        repeatable: false,
        cooldownMs: 0,
      },
      {
        id: junkyardInteractionIds.fuelCar,
        kind: junkyardInteractionKinds.fuel,
        position: { x: 2.65, z: -2.8 },
        radius: 1.15,
        durationMs: junkyardRules.fuelDurationMs,
        repeatable: true,
        cooldownMs: junkyardRules.fuelCooldownMs,
      },
      {
        id: junkyardInteractionIds.collectRegister,
        kind: junkyardInteractionKinds.cash,
        position: { x: -3.8, z: -2.9 },
        radius: 1,
        durationMs: junkyardRules.registerDurationMs,
        repeatable: true,
        cooldownMs: 0,
      },
    ],
  },
  spawn: { x: 0, z: 0.35 },
};

export const junkyardInitialStatuses: Readonly<Record<string, ProximityInteractionStatus>> = {
  [junkyardInteractionIds.talkMechanic]: proximityInteractionStatuses.ready,
  [junkyardInteractionIds.junkCrates]: proximityInteractionStatuses.ready,
  [junkyardInteractionIds.junkTires]: proximityInteractionStatuses.ready,
  [junkyardInteractionIds.junkWreck]: proximityInteractionStatuses.ready,
  [junkyardInteractionIds.buildPump]: proximityInteractionStatuses.locked,
  [junkyardInteractionIds.fuelCar]: proximityInteractionStatuses.locked,
  [junkyardInteractionIds.collectRegister]: proximityInteractionStatuses.locked,
};
