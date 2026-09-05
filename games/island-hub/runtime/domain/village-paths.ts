import { voyageRules } from './voyage-registry.ts';
import type { IslandBlueprint, IslandPoint } from './types.ts';
import { isPointInsideIsland } from './generator.ts';
export const villagePaths = { crossroads: { x: 1.2, z: 0.8 }, houseBypass: 2.6,
  doorOffset: 1.65, step: 0.32, width: 0.83, thickness: 0.008, elevation: 0.007, grassScale: 0.91 } as const;
export function villageRoutes(blueprint: IslandBlueprint): ReadonlyArray<ReadonlyArray<IslandPoint>> {
  const crossroads = villagePaths.crossroads;
  const routes = [[crossroads, blueprint.playerSpawn],
    [crossroads, { x: blueprint.house.x + Math.sin(blueprint.house.rotation) * villagePaths.doorOffset,
      z: blueprint.house.z + Math.cos(blueprint.house.rotation) * villagePaths.doorOffset }],
    [crossroads, blueprint.activityZone],
    ...blueprint.portals.map((portal) => portal.x < blueprint.house.x
      ? [crossroads, { x: blueprint.house.x - villagePaths.houseBypass, z: crossroads.z },
        { x: blueprint.house.x - villagePaths.houseBypass, z: portal.z }, portal]
      : [crossroads, portal])];
  return blueprint.exploration?.region !== undefined && blueprint.exploration.region !== 'home'
    ? blueprint.exploration.routes : [...routes, ...(blueprint.exploration?.routes ?? [])];
}
export type IslandSurface = 'grass' | 'sand' | 'path' | 'wood';
export function islandSurface(point: IslandPoint, blueprint: IslandBlueprint): IslandSurface {
  const layout = blueprint.exploration;
  if (layout) {
    const { dock, pond } = layout;
    const onDock = Math.abs(point.x - dock.x) <= voyageRules.dockWidth / 2
      && point.z >= dock.z && point.z <= dock.z + voyageRules.dockLength;
    const onBridge = Math.abs(point.z - pond.z) <= pond.bridgeHalfWidth
      && Math.abs(point.x - pond.x) <= pond.rx + voyageRules.bridgeApron;
    if (onDock || onBridge) return 'wood';
  }
  for (const route of villageRoutes(blueprint)) for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1]!;
    const b = route[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
      ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSquared));
    if (Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz) <= villagePaths.width / 2) return 'path';
  }
  return isPointInsideIsland({ x: point.x / villagePaths.grassScale, z: point.z / villagePaths.grassScale }, blueprint)
    ? 'grass' : 'sand';
}
