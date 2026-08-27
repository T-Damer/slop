import {
  trafficColors,
  trafficDirections,
  trafficIdPrefixes,
  trafficLevelPatterns,
  trafficRules,
  type TrafficColor,
} from './registry.ts';
import type {
  TrafficCarDefinition,
  TrafficLevelDefinition,
} from './types.ts';

const trafficColorCycle: ReadonlyArray<TrafficColor> = Object.values(trafficColors);

type TrafficLevelPattern = typeof trafficLevelPatterns[keyof typeof trafficLevelPatterns];

export const trafficLevels: ReadonlyArray<TrafficLevelDefinition> = Object.values(
  trafficLevelPatterns,
).map(buildTrafficLevel);

function buildTrafficLevel(pattern: TrafficLevelPattern): TrafficLevelDefinition {
  const structuralCars: Array<Omit<TrafficCarDefinition, 'color'>> = [];
  const expectedSolution: Array<string> = [];

  for (
    let row = trafficRules.firstCoordinate;
    row < pattern.horizontalRows;
    row += trafficRules.cellStep
  ) {
    const outerId = `${trafficIdPrefixes.horizontalOuter}-${row}`;
    const innerId = `${trafficIdPrefixes.horizontalInner}-${row}`;
    structuralCars.push(
      {
        id: outerId,
        x: trafficRules.firstCoordinate,
        y: row,
        length: trafficRules.carLength,
        direction: trafficDirections.left,
        capacity: trafficRules.carCapacity,
      },
      {
        id: innerId,
        x: trafficRules.carLength,
        y: row,
        length: trafficRules.carLength,
        direction: trafficDirections.left,
        capacity: trafficRules.carCapacity,
      },
    );
    expectedSolution.push(outerId, innerId);
  }

  for (
    let columnOffset = trafficRules.firstCoordinate;
    columnOffset < pattern.verticalColumns;
    columnOffset += trafficRules.cellStep
  ) {
    const column = trafficRules.verticalZoneStartColumn + columnOffset;
    const columnCarIds: Array<string> = [];

    for (
      let slot = trafficRules.firstCoordinate;
      slot < trafficRules.verticalCarsPerColumn;
      slot += trafficRules.cellStep
    ) {
      const id = `${trafficIdPrefixes.vertical}-${column}-${slot}`;
      const direction = slot < trafficRules.verticalTopChainLength
        ? trafficDirections.up
        : trafficDirections.down;
      structuralCars.push({
        id,
        x: column,
        y: slot * trafficRules.carLength,
        length: trafficRules.carLength,
        direction,
        capacity: trafficRules.carCapacity,
      });
      columnCarIds.push(id);
    }

    expectedSolution.push(
      ...columnCarIds.slice(
        trafficRules.firstIndex,
        trafficRules.verticalTopChainLength,
      ),
      ...columnCarIds.slice(trafficRules.verticalTopChainLength).reverse(),
    );
  }

  const solutionIndexByCar = new Map(
    expectedSolution.map((carId, solutionIndex) => [carId, solutionIndex]),
  );
  const cars: Array<TrafficCarDefinition> = structuralCars.map((car) => {
    const solutionIndex = solutionIndexByCar.get(car.id) ?? trafficRules.firstIndex;
    return {
      ...car,
      color: trafficColorCycle[
        (solutionIndex + pattern.colorOffset) % trafficColorCycle.length
      ]!,
    };
  });
  const carById = new Map(cars.map((car) => [car.id, car]));
  const passengers = expectedSolution.flatMap((carId) => {
    const car = carById.get(carId);
    if (car === undefined) {
      return [];
    }
    return Array.from({ length: car.capacity }, () => car.color);
  });

  return {
    id: pattern.id,
    name: pattern.name,
    objective: pattern.objective,
    bayCount: pattern.bayCount,
    cars,
    passengers,
    expectedSolution,
  };
}
