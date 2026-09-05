import type { IslandBlueprint, IslandPoint } from './types.ts';
import { homeRules as rules, homeCatalog, type HomeItem, type HomeState } from './home-registry.ts';

export function homeFootprint(item: HomeItem) {
  const definition = homeCatalog[item.kind];
  return item.rotation % 2 === 0 ? { x: definition.width / 2, z: definition.depth / 2 }
    : { x: definition.depth / 2, z: definition.width / 2 };
}
export function canWalkInHome(point: IslandPoint, home: HomeState): boolean {
  const limit = rules.halfSize - rules.playerRadius;
  return Number.isFinite(point.x) && Number.isFinite(point.z)
    && Math.abs(point.x) <= limit && Math.abs(point.z) <= limit
    && home.items.every((item) => {
      if (!item.placed) return true;
      const half = homeFootprint(item);
      return Math.abs(point.x - item.x) >= half.x + rules.playerRadius
        || Math.abs(point.z - item.z) >= half.z + rules.playerRadius;
    });
}
export function validateHomeLayout(home: HomeState): string | null {
  const placed = home.items.filter((item) => item.placed);
  for (const item of placed) {
    const half = homeFootprint(item);
    if (Math.abs(item.x) + half.x > rules.halfSize - rules.wallMargin
      || Math.abs(item.z) + half.z > rules.halfSize - rules.wallMargin) return rules.messages.bounds;
    if (Math.abs(item.x) < half.x + rules.exitClearance.halfWidth
      && item.z + half.z > rules.exitClearance.minimumZ) return rules.messages.exit;
    if (placed.some((other) => {
      if (other.id === item.id) return false;
      const otherHalf = homeFootprint(other);
      return Math.abs(item.x - other.x) < half.x + otherHalf.x
        && Math.abs(item.z - other.z) < half.z + otherHalf.z;
    })) return rules.messages.collision;
  }
  return hasFurnitureAccess(home) ? null : rules.messages.access;
}

/** Check the actual walking footprint, not merely an empty tile at the door. */
function hasFurnitureAccess(home: HomeState): boolean {
  const queue: IslandPoint[] = [rules.door];
  const visited = new Set<string>();
  const reachableItems = new Set<string>();
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index]!;
    const key = `${point.x}:${point.z}`;
    if (visited.has(key) || !canWalkInHome(point, home)) continue;
    visited.add(key);
    for (const item of home.items) {
      if (Math.hypot(item.x - point.x, item.z - point.z) <= rules.interactionRadius) reachableItems.add(item.id);
    }
    const step = rules.navigationGrid;
    queue.push({ x: point.x + step, z: point.z }, { x: point.x - step, z: point.z },
      { x: point.x, z: point.z + step }, { x: point.x, z: point.z - step });
  }
  return home.items.every((item) => !item.placed || reachableItems.has(item.id));
}
export function houseEntrance(blueprint: IslandBlueprint): IslandPoint {
  const { house } = blueprint;
  return { x: house.x + Math.sin(house.rotation) * rules.doorOffset * house.scale,
    z: house.z + Math.cos(house.rotation) * rules.doorOffset * house.scale };
}
export function isAtHouseEntrance(point: IslandPoint, blueprint: IslandBlueprint): boolean {
  const door = houseEntrance(blueprint);
  return Math.hypot(point.x - door.x, point.z - door.z) <= rules.doorRadius;
}
