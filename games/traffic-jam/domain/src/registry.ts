import type { ValueOf } from "../../../../packages/contracts/src/registry.js";

export const trafficGame = {
  id: "traffic-jam",
  introductorySeed: "traffic-intro",
} as const;

export const trafficCommands = {
  moveVehicle: "traffic.move_vehicle",
} as const;

export const trafficEvents = {
  vehicleMoved: "traffic.vehicle_moved",
  levelCompleted: "traffic.level_completed",
} as const;

export const trafficErrorCodes = {
  unknownSeed: "traffic.unknown_seed",
  invalidCommand: "traffic.invalid_command",
  invalidEvent: "traffic.invalid_event",
} as const;

export const trafficMessages = {
  unknownSeed: "The requested level seed is not registered.",
  invalidCommand: "The command is not supported by this game.",
  invalidEvent: "The event is not supported by this game.",
} as const;

export const trafficVehicleColors = {
  coral: "coral",
  blue: "blue",
  green: "green",
  yellow: "yellow",
} as const;

export const trafficRules = {
  initialMoveCount: 0,
} as const;

export type TrafficVehicleColor = ValueOf<typeof trafficVehicleColors>;
