import { voyageRules } from './voyage-registry.ts';
import { createProximityWorldState, stepProximityWorld } from '../../../shared/proximity-world/domain/rules.ts';
import { proximityInteractionStatuses, type ProximityWorldDefinition,
  type ProximityWorldState } from '../../../shared/proximity-world/domain/types.ts';
import { islandRules } from './registry.ts';
import type { IslandBlueprint, IslandDestinationId, IslandPoint } from './types.ts';

export const islandLifeRules = {
  fruitPrefix: 'fruit:', gardenPrefix: 'garden:', guide: 'guide', pet: 'pet',
  gardenBeds: 3, actionDurationMs: 100, actionRadius: 1.25, gardenSpacing: 0.65,
  messages: { fruit: 'Яблоко в кармане! Посади цветы в саду.',
    garden: 'Ещё немного цвета на твоём острове!', empty: 'Сначала собери яблоко с дерева.',
    guide: 'Луми: собери яблоки, посади сад и загляни к соседям!', pet: 'Кажется, вы подружились.' },
} as const;

export interface IslandJournal { readonly completed: ReadonlyArray<string> }
export interface IslandLifeTarget {
  readonly id: string; readonly point: IslandPoint;
  readonly kind: 'fruit' | 'garden' | 'guide' | 'pet' | 'portal' | 'explore';
  readonly label: string; readonly destination?: IslandDestinationId;
}
export interface IslandLifeUpdate {
  readonly target: IslandLifeTarget | null; readonly progress: number;
  readonly message: string | null; readonly changed: boolean;
  readonly destination: IslandDestinationId | null;
}

export function islandLifeTargets(blueprint: IslandBlueprint): ReadonlyArray<IslandLifeTarget> {
  return [
    ...blueprint.trees.filter((tree) => !tree.id.startsWith('wild:')).map((tree): IslandLifeTarget => ({ id: islandLifeRules.fruitPrefix + tree.id,
      point: tree, kind: 'fruit', label: 'Собрать яблоко' })),
    ...Array.from({ length: blueprint.exploration && blueprint.exploration.region !== 'home' ? 0 : islandLifeRules.gardenBeds }, (_, index): IslandLifeTarget => ({
      id: islandLifeRules.gardenPrefix + index,
      point: { x: blueprint.activityZone.x + (index - 1) * islandLifeRules.gardenSpacing,
        z: blueprint.activityZone.z }, kind: 'garden', label: 'Посадить цветы · 1 яблоко',
    })),
    { id: islandLifeRules.guide, point: blueprint.guideSpawn, kind: 'guide', label: 'Поговорить с Луми' },
    { id: islandLifeRules.pet, point: blueprint.animal, kind: 'pet', label: 'Погладить друга' },
    ...blueprint.portals.map((portal): IslandLifeTarget => ({ id: portal.destinationId,
      point: portal, kind: 'portal', label: portal.label, destination: portal.destinationId })),
  ];
}

/** Canonical pure interaction owner. Reuses shared selection, reset and completion rules. */
export class IslandLife {
  public readonly targets: ReadonlyArray<IslandLifeTarget>;
  private readonly definition: ProximityWorldDefinition;
  private world: ProximityWorldState;
  private readonly completed: Set<string>;
  private readonly manualPortals: boolean;

  public constructor(blueprint: IslandBlueprint, journal: IslandJournal = { completed: [] }, external: ReadonlyArray<IslandLifeTarget> = []) {
    this.manualPortals = external.length > 0;
    this.targets = [...islandLifeTargets(blueprint).filter((target) => (!external.length || target.kind !== 'guide')
      && (!blueprint.exploration || blueprint.exploration.region === 'home' || target.kind !== 'pet')), ...external];
    const extent = Math.max(islandRules.baseRadius, ...blueprint.coastline) * 2;
    this.definition = {
      bounds: { minimumX: -extent, maximumX: extent, minimumZ: -extent, maximumZ: extent },
      movementSpeed: 0,
      interactions: this.targets.map((target) => ({ id: target.id, position: target.point,
        radius: target.kind === 'portal' ? islandRules.portalRadius : target.kind === 'explore' ? voyageRules.interactRadius : islandLifeRules.actionRadius,
        durationMs: target.kind === 'portal' ? (this.manualPortals ? islandLifeRules.actionDurationMs : islandRules.portalHoldSeconds * 1000)
          : islandLifeRules.actionDurationMs, repeatable: false, cooldownMs: 0 })),
    };
    const allowed = new Set(this.targets.filter((target) => target.kind !== 'portal' && target.kind !== 'explore').map((target) => target.id));
    this.completed = new Set(journal.completed.filter((id) => allowed.has(id)));
    // Never restore more paid plantings than the number of legitimately harvested trees.
    const harvested = [...this.completed].filter((id) => id.startsWith(islandLifeRules.fruitPrefix)).length;
    [...this.completed].filter((id) => id.startsWith(islandLifeRules.gardenPrefix))
      .slice(harvested).forEach((id) => this.completed.delete(id));
    this.world = createProximityWorldState(this.definition, blueprint.playerSpawn,
      Object.fromEntries([...this.completed].map((id) => [id, proximityInteractionStatuses.completed])));
  }

  public get journal(): IslandJournal { return { completed: [...this.completed] }; }
  public get planted(): number {
    return [...this.completed].filter((id) => id.startsWith(islandLifeRules.gardenPrefix)).length;
  }
  public get fruit(): number {
    return [...this.completed].filter((id) => id.startsWith(islandLifeRules.fruitPrefix)).length - this.planted;
  }
  public dismissExternal(id: string): void {
    const runtime = this.world.interactions[id];
    if (runtime && this.targets.some((target) => target.id === id && target.kind === 'explore')) {
      this.world = { ...this.world, activeInteractionId: null, interactions: { ...this.world.interactions,
        [id]: { ...runtime, progressMs: 0, status: proximityInteractionStatuses.completed } } };
    }
  }
  public resetProgress(): void {
    this.world = { ...this.world, activeInteractionId: null,
      interactions: Object.fromEntries(Object.entries(this.world.interactions)
        .map(([id, value]) => [id, { ...value, progressMs: 0 }])) };
  }

  public step(position: IslandPoint, seconds: number, interact: boolean): IslandLifeUpdate {
    const sample = { moveX: 0, moveZ: 0, deltaMs: 0 };
    this.world = stepProximityWorld(this.definition, { ...this.world, playerPosition: position }, sample).state;
    const target = this.targets.find((entry) => entry.id === this.world.activeInteractionId) ?? null;
    const duration = target?.kind === 'portal' ? (this.manualPortals ? islandLifeRules.actionDurationMs : islandRules.portalHoldSeconds * 1000)
      : islandLifeRules.actionDurationMs;
    const result = { target, progress: 0, message: null, changed: false, destination: null };
    if (target === null || target.kind === 'explore') return result;
    if (interact && target.kind === 'garden' && this.fruit === 0) {
      return { ...result, message: islandLifeRules.messages.empty };
    }
    if (target.kind === 'portal' && this.manualPortals && !interact) return result;
    const deltaMs = target.kind === 'portal'
      ? this.manualPortals ? duration : Math.min(100, Math.max(0, Number.isFinite(seconds) ? seconds * 1000 : 0))
      : interact ? duration : 0;
    this.world = stepProximityWorld(this.definition, this.world, { ...sample, deltaMs }).state;
    const runtime = this.world.interactions[target.id];
    if (runtime?.status !== proximityInteractionStatuses.completed) {
      return { ...result, progress: (runtime?.progressMs ?? 0) / duration };
    }
    if (target.kind === 'portal') return { ...result, progress: 1, destination: target.destination ?? null };
    this.completed.add(target.id);
    return { ...result, changed: true, message: islandLifeRules.messages[target.kind] };
  }
}
