import type { IslandBlueprint, IslandPoint } from './types.ts';
import type { IslandLifeTarget } from './life.ts';
import { canWalkOnIsland } from './walking.ts';
import { voyageRegions, voyageResidents, voyageRules, type VoyageRegionId, type VoyageResidentId, type VoyageState } from './voyage-registry.ts';
import { questReady, questStatus, voyageQuests } from './voyage-quests.ts';

export type VoyageCommand = { readonly kind: 'collect'; readonly id: string }
  | { readonly kind: 'talk'; readonly id: VoyageResidentId }
  | { readonly kind: 'accept' | 'claim'; readonly id: string }
  | { readonly kind: 'travel'; readonly region: VoyageRegionId };
export interface VoyageResult { readonly state: VoyageState; readonly error: string | null }
const result = (state: VoyageState, error: string | null = null): VoyageResult => ({ state, error });
const near = (a: IslandPoint, b: IslandPoint): boolean => Math.hypot(a.x - b.x, a.z - b.z) <= voyageRules.interactRadius;

/** Commands validate position, region, recipient and resources before changing the one saved ledger. */
export function commandVoyage(state: VoyageState, world: IslandBlueprint, position: IslandPoint, command: VoyageCommand): VoyageResult {
  const layout = world.exploration;
  if (!layout || layout.region !== state.region || !canWalkOnIsland(position, world)) return result(state, voyageRules.messages.far);
  if (command.kind === 'travel') {
    if (!near(position, layout.dock) || !Object.hasOwn(voyageRegions, command.region) || command.region === state.region) return result(state, voyageRules.messages.far);
    return result({ ...state, region: command.region, visited: [...new Set([...state.visited, command.region])] });
  }
  if (command.kind === 'collect') {
    const pickup = layout.pickups.find((entry) => entry.id === command.id);
    if (!pickup || !near(position, pickup.point)) return result(state, voyageRules.messages.far);
    if (state.collected.includes(pickup.id)) return result(state);
    if (state.inventory[pickup.item] >= voyageRules.inventoryLimit) return result(state, voyageRules.messages.full);
    return result({ ...state, collected: [...state.collected, pickup.id], inventory: { ...state.inventory, [pickup.item]: state.inventory[pickup.item] + 1 } });
  }
  const quest = command.kind === 'talk' ? null : voyageQuests.find((entry) => entry.id === command.id);
  const owner = command.kind === 'talk' ? command.id : quest?.owner;
  const resident = layout.residents.find((entry) => entry.id === owner);
  if (!resident || !near(position, resident.point)) return result(state, voyageRules.messages.far);
  if (command.kind === 'talk') return result({ ...state, conversations: { ...state.conversations,
    [command.id]: Math.min(voyageRules.dialogueHistoryLimit, state.conversations[command.id] + 1) } });
  if (!quest) return result(state, voyageRules.messages.missing);
  const status = questStatus(state, quest);
  if (command.kind === 'accept') return status === 'available'
    ? result({ ...state, accepted: [...state.accepted, quest.id] }) : result(state);
  if (status === 'complete') return result(state);
  if (status !== 'ready' || !questReady(state, quest)) return result(state, voyageRules.messages.missing);
  return result({ ...state, claimed: [...state.claimed, quest.id], inventory: quest.needs
    ? { ...state.inventory, [quest.needs.item]: state.inventory[quest.needs.item] - quest.needs.count } : state.inventory });
}
export function observeVoyage(state: VoyageState, world: IslandBlueprint, position: IslandPoint): VoyageState {
  const layout = world.exploration;
  if (!layout || layout.region !== state.region || !canWalkOnIsland(position, world)) return state;
  const found = layout.sites.filter((site) => !state.discovered.includes(`${state.region}:${site.id}`)
    && Math.hypot(position.x - site.point.x, position.z - site.point.z) <= voyageRules.discoveryRadius);
  return found.length ? { ...state, discovered: [...state.discovered, ...found.map((site) => `${state.region}:${site.id}`)] } : state;
}
export function voyageTargets(world: IslandBlueprint, state: VoyageState): readonly IslandLifeTarget[] {
  const layout = world.exploration;
  if (!layout) return [];
  return [{ id: 'voyage:dock', kind: 'explore', point: layout.dock, label: 'Отправиться на лодке' },
    ...layout.residents.map((resident): IslandLifeTarget => ({ id: `voyage:npc:${resident.id}`, kind: 'explore', point: resident.point,
      label: `Поговорить · ${voyageResidents[resident.id].name}` })),
    ...layout.sites.map((site): IslandLifeTarget => ({ id: `voyage:site:${site.id}`, kind: 'explore', point: site.point, label: `Осмотреть · ${site.name}` })),
    ...layout.pickups.filter((pickup) => !state.collected.includes(pickup.id)).map((pickup): IslandLifeTarget => ({
      id: `voyage:pickup:${pickup.id}`, kind: 'explore', point: pickup.point,
      label: pickup.item === 'letter' ? 'Подобрать письмо' : pickup.item === 'glass' ? 'Подобрать морское стекло' : 'Подобрать ракушку',
    }))];
}
