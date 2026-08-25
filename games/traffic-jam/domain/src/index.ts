import {
  SlopDomainError,
  type DomainCommand,
  type EventSourcedGameDefinition,
  type PendingDomainEvent,
} from "../../../../packages/contracts/src/index.js";
import {
  applyGridMove,
  findGridPiece,
  validateGridMove,
  type GridBoard,
  type GridPiece,
  type GridPosition,
} from "../../../../packages/grid-slide/src/index.js";
import { trafficConformanceFixture } from "./traffic-fixture.generated.js";
import {
  trafficCommands,
  trafficErrorCodes,
  trafficEvents,
  trafficGame,
  trafficMessages,
  trafficRules,
  type TrafficVehicleColor,
} from "./registry.js";

export * from "./registry.js";
export { trafficConformanceFixture } from "./traffic-fixture.generated.js";

export interface TrafficVehicle extends GridPiece {
  readonly preferredDelta: number;
  readonly color: TrafficVehicleColor;
  readonly isTarget: boolean;
}

export interface TrafficLevel {
  readonly id: string;
  readonly board: GridBoard;
  readonly vehicles: ReadonlyArray<TrafficVehicle>;
}

export interface TrafficState {
  readonly levelId: string;
  readonly board: GridBoard;
  readonly vehicles: ReadonlyArray<TrafficVehicle>;
  readonly moveCount: number;
  readonly completed: boolean;
}

export interface TrafficMovePayload {
  readonly vehicleId: string;
  readonly delta: number;
}

export interface TrafficVehicleMovedPayload {
  readonly vehicleId: string;
  readonly from: GridPosition;
  readonly to: GridPosition;
  readonly delta: number;
}

export interface TrafficLevelCompletedPayload {
  readonly moveCount: number;
}

const trafficLevelsBySeed: Readonly<Record<string, TrafficLevel>> = {
  [trafficGame.introductorySeed]: trafficConformanceFixture.level,
};

export const trafficDefinition: EventSourcedGameDefinition<
  TrafficState,
  TrafficMovePayload
> = {
  gameId: trafficGame.id,

  createInitialState(seed) {
    const level = trafficLevelsBySeed[seed];
    if (level === undefined) {
      throw new SlopDomainError(
        trafficErrorCodes.unknownSeed,
        trafficMessages.unknownSeed,
      );
    }

    return {
      levelId: level.id,
      board: level.board,
      vehicles: level.vehicles.map((vehicle) => ({ ...vehicle })),
      moveCount: trafficRules.initialMoveCount,
      completed: false,
    };
  },

  execute(state, command) {
    assertMoveCommand(command);
    const vehicle = findGridPiece(state.vehicles, command.payload.vehicleId);
    const nextPosition = validateGridMove(state.board, state.vehicles, {
      pieceId: command.payload.vehicleId,
      delta: command.payload.delta,
    });
    const movedPayload: TrafficVehicleMovedPayload = {
      vehicleId: vehicle.id,
      from: vehicle.position,
      to: nextPosition,
      delta: command.payload.delta,
    };
    const movedEvent: PendingDomainEvent = {
      type: trafficEvents.vehicleMoved,
      actorId: command.actorId,
      payload: movedPayload,
    };
    const events: Array<PendingDomainEvent> = [movedEvent];
    const projectedState = reduceTrafficEvent(state, movedEvent);

    if (isTargetAtExit(projectedState)) {
      events.push({
        type: trafficEvents.levelCompleted,
        actorId: command.actorId,
        payload: {
          moveCount: projectedState.moveCount,
        } satisfies TrafficLevelCompletedPayload,
      });
    }

    return events;
  },

  reduce: reduceTrafficEvent,
  isCompleted: (state) => state.completed,
};

function assertMoveCommand(
  command: DomainCommand<TrafficMovePayload>,
): void {
  if (command.type !== trafficCommands.moveVehicle) {
    throw new SlopDomainError(
      trafficErrorCodes.invalidCommand,
      trafficMessages.invalidCommand,
    );
  }
}

function reduceTrafficEvent(
  state: TrafficState,
  event: PendingDomainEvent,
): TrafficState {
  if (event.type === trafficEvents.vehicleMoved) {
    const payload = event.payload as TrafficVehicleMovedPayload;
    return {
      ...state,
      vehicles: applyGridMove(
        state.vehicles,
        { pieceId: payload.vehicleId, delta: payload.delta },
        payload.to,
      ),
      moveCount: state.moveCount + 1,
    };
  }

  if (event.type === trafficEvents.levelCompleted) {
    return { ...state, completed: true };
  }

  throw new SlopDomainError(
    trafficErrorCodes.invalidEvent,
    trafficMessages.invalidEvent,
  );
}

function isTargetAtExit(state: TrafficState): boolean {
  const target = state.vehicles.find((vehicle) => vehicle.isTarget);
  return (
    target !== undefined &&
    target.position.x + target.length === state.board.width
  );
}
