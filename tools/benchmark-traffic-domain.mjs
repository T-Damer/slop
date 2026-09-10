import { performance } from 'node:perf_hooks';

import {
  createTrafficLevel,
  getTrafficLevelCount,
} from '../games/traffic-jam/runtime/domain/levels.ts';
import { analyzeTrafficLevel } from '../games/traffic-jam/runtime/domain/solver.ts';
import { trafficRules } from '../games/traffic-jam/runtime/domain/registry.ts';

const trafficBenchmark = {
  rounds: 12,
  seeds: [17, 2026, 9001],
  medianDivisor: 2,
};

const samples = [];
let aggregateVisitedStates = trafficRules.emptyCollectionSize;
for (
  let round = trafficRules.firstIndex;
  round < trafficBenchmark.rounds;
  round += trafficRules.cellStep
) {
  const startedAt = performance.now();
  aggregateVisitedStates += runAnalysisMatrix();
  samples.push(performance.now() - startedAt);
}
samples.sort((left, right) => left - right);

console.log(JSON.stringify({
  schemaVersion: 1,
  rounds: trafficBenchmark.rounds,
  analysesPerRound: getTrafficLevelCount() * trafficBenchmark.seeds.length,
  medianMs: samples[Math.floor(samples.length / trafficBenchmark.medianDivisor)],
  minimumMs: samples[trafficRules.firstIndex],
  maximumMs: samples[samples.length - trafficRules.cellStep],
  aggregateVisitedStates,
}, null, 2));

function runAnalysisMatrix() {
  let visitedStates = trafficRules.emptyCollectionSize;
  for (
    let levelIndex = trafficRules.firstIndex;
    levelIndex < getTrafficLevelCount();
    levelIndex += trafficRules.cellStep
  ) {
    for (const seed of trafficBenchmark.seeds) {
      const analysis = analyzeTrafficLevel(createTrafficLevel(levelIndex, seed));
      if (!analysis.valid) {
        throw new Error(analysis.errors.join(', '));
      }
      visitedStates += analysis.visitedStates;
    }
  }
  return visitedStates;
}
