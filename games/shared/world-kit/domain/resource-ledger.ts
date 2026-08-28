import { worldSimulationRules } from './registry.ts';
import type { WorldResourceAmount } from './types.ts';

export function sanitizeWorldResources(
  resources: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const sanitized: Record<string, number> = {};
  for (const [resourceId, amount] of Object.entries(resources)) {
    sanitized[resourceId] = Number.isFinite(amount)
      ? Math.max(worldSimulationRules.zero, amount)
      : worldSimulationRules.zero;
  }
  return sanitized;
}

export function getMissingWorldResources(
  resources: Readonly<Record<string, number>>,
  costs: ReadonlyArray<WorldResourceAmount>,
): Array<WorldResourceAmount> {
  const missing: Array<WorldResourceAmount> = [];
  for (const cost of costs) {
    const available = resources[cost.resourceId] ?? worldSimulationRules.zero;
    if (available < cost.amount) {
      missing.push({
        resourceId: cost.resourceId,
        amount: cost.amount - available,
      });
    }
  }
  return missing;
}

export function applyWorldResourceEffect(
  resources: Readonly<Record<string, number>>,
  costs: ReadonlyArray<WorldResourceAmount>,
  rewards: ReadonlyArray<WorldResourceAmount>,
): Readonly<Record<string, number>> {
  const nextResources: Record<string, number> = { ...resources };
  for (const cost of costs) {
    nextResources[cost.resourceId] = Math.max(
      worldSimulationRules.zero,
      (nextResources[cost.resourceId] ?? worldSimulationRules.zero) - cost.amount,
    );
  }
  for (const reward of rewards) {
    nextResources[reward.resourceId] = Math.max(
      worldSimulationRules.zero,
      (nextResources[reward.resourceId] ?? worldSimulationRules.zero) + reward.amount,
    );
  }
  return nextResources;
}
