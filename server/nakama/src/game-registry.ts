import {
  SlopDomainError,
  type EventSourcedGameDefinition,
} from "../../../packages/contracts/src/index.js";
import {
  trafficDefinition,
  trafficGame,
} from "../../../games/traffic-jam/domain/src/index.js";
import {
  nakamaMessages,
} from "./registry.js";

const gameDefinitions: Readonly<
  Record<string, EventSourcedGameDefinition<unknown, unknown>>
> = {
  [trafficGame.id]: trafficDefinition as EventSourcedGameDefinition<
    unknown,
    unknown
  >,
};

export function getGameDefinition(
  gameId: string,
): EventSourcedGameDefinition<unknown, unknown> {
  const definition = gameDefinitions[gameId];
  if (definition === undefined) {
    throw new SlopDomainError(gameId, nakamaMessages.unsupportedGame);
  }
  return definition;
}
