import { createVoyageState, voyageRegions, voyageRules, type VoyageState, type VoyageRegionId } from './voyage-registry.ts';
import { voyageQuests } from './voyage-quests.ts';
import { voyageLayout } from './voyage-layout.ts';
import type { IslandBlueprint } from './types.ts';

function stringList(value: unknown, allowed: ReadonlySet<string>): value is string[] {
  return Array.isArray(value) && value.length <= allowed.size && new Set(value).size === value.length
    && value.every((id) => typeof id === 'string' && allowed.has(id));
}
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object'; }
/** Inventory is reconciled with pickup receipts minus delivered requests, never trusted on its own. */
export function validateVoyage(value: unknown, home: IslandBlueprint): VoyageState | null {
  if (!record(value) || value.version !== voyageRules.version || typeof value.region !== 'string') return null;
  const regions = Object.keys(voyageRegions) as VoyageRegionId[];
  const layouts = regions.map((id) => voyageLayout(id, home));
  const sites = new Set(layouts.flatMap((layout) => layout.sites.map((site) => `${layout.region}:${site.id}`)));
  const pickups = layouts.flatMap((layout) => layout.pickups);
  const quests = new Set(voyageQuests.map((quest) => quest.id));
  if (!stringList(value.visited, new Set(regions)) || !value.visited.includes('home') || !value.visited.includes(value.region)
    || !stringList(value.discovered, sites) || !stringList(value.collected, new Set(pickups.map((entry) => entry.id)))
    || !stringList(value.accepted, quests) || !stringList(value.claimed, quests)
    || !record(value.inventory) || !record(value.conversations)) return null;
  const inventory = { ...createVoyageState().inventory };
  for (const id of value.collected) { const pickup = pickups.find((entry) => entry.id === id)!; inventory[pickup.item] += 1; }
  for (const id of value.claimed) {
    const quest = voyageQuests.find((entry) => entry.id === id)!;
    if (!value.accepted.includes(id) || (quest.prerequisite && !value.claimed.includes(quest.prerequisite))) return null;
    if (quest.needs) inventory[quest.needs.item] -= quest.needs.count;
    if (quest.islands && value.visited.length < quest.islands) return null;
    if (quest.discoveries && value.discovered.filter((key) => key.startsWith('home:')).length < quest.discoveries) return null;
    if (quest.requiredDiscoveries && !quest.requiredDiscoveries.every((key) => value.discovered.includes(key))) return null;
  }
  for (const key of Object.keys(inventory) as (keyof typeof inventory)[]) {
    if (inventory[key] < 0 || inventory[key] > voyageRules.inventoryLimit || value.inventory[key] !== inventory[key]) return null;
  }
  const conversations = { ...createVoyageState().conversations };
  for (const key of Object.keys(conversations) as (keyof typeof conversations)[]) {
    const count = value.conversations[key];
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 || count > voyageRules.dialogueHistoryLimit) return null;
    conversations[key] = count;
  }
  if ([...value.collected, ...value.discovered].some((id) => !(value.visited as string[]).includes(id.split(':')[0]!))) return null;
  return { version: 1, region: value.region as VoyageRegionId, visited: [...value.visited] as VoyageRegionId[],
    accepted: [...value.accepted], claimed: [...value.claimed], discovered: [...value.discovered], collected: [...value.collected], inventory, conversations };
}
