import { outsidePond } from './voyage-layout.ts';
import { isPointInsideIsland } from './generator.ts';
import type { IslandBlueprint, IslandPoint } from './types.ts';

export const islandWalking = {
  walkSpeed: 2.7, runSpeed: 4.4, maximumDelta: 0.05, stepLength: 0.08,
  playerRadius: 0.24, coastMargin: 0.65, trunkRadius: 0.2, rockRadius: 0.38,
  houseHalfWidth: 1.3, houseHalfDepth: 1.12,
} as const;

export function canWalkOnIsland(point: IslandPoint, blueprint: IslandBlueprint): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)
    || !isPointInsideIsland(point, blueprint, islandWalking.coastMargin)) return false;
  if (blueprint.exploration && !outsidePond(point, blueprint.exploration, islandWalking.playerRadius)) return false;
  const house = blueprint.house;
  const dx = point.x - house.x;
  const dz = point.z - house.z;
  const cos = Math.cos(house.rotation);
  const sin = Math.sin(house.rotation);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  if (Math.abs(localX) < islandWalking.houseHalfWidth * house.scale + islandWalking.playerRadius
    && Math.abs(localZ) < islandWalking.houseHalfDepth * house.scale + islandWalking.playerRadius) return false;
  return !blueprint.trees.some((tree) => Math.hypot(point.x - tree.x, point.z - tree.z)
    < islandWalking.trunkRadius * tree.scale + islandWalking.playerRadius)
    && !blueprint.rocks.some((rock) => Math.hypot(point.x - rock.x, point.z - rock.z)
      < islandWalking.rockRadius * rock.scale + islandWalking.playerRadius);
}

/** Swept small steps prevent tunnelling; independent axes allow sliding around props. */
export function walkOnIsland(
  position: IslandPoint, input: IslandPoint, delta: number, running: boolean,
  blueprint: IslandBlueprint,
): IslandPoint {
  return walkWithObstacles(position, input, delta, running, (point) => canWalkOnIsland(point, blueprint));
}

export function walkWithObstacles(position: IslandPoint, input: IslandPoint, delta: number,
  running: boolean, allowed: (point: IslandPoint) => boolean): IslandPoint {
  if (![input.x, input.z, delta].every(Number.isFinite)) return position;
  const magnitude = Math.max(1, Math.hypot(input.x, input.z));
  const distance = Math.min(islandWalking.maximumDelta, Math.max(0, delta))
    * (running ? islandWalking.runSpeed : islandWalking.walkSpeed);
  const x = input.x / magnitude * distance;
  const z = input.z / magnitude * distance;
  const steps = Math.max(1, Math.ceil(Math.hypot(x, z) / islandWalking.stepLength));
  let next = position;
  for (let index = 0; index < steps; index += 1) {
    const horizontal = { x: next.x + x / steps, z: next.z };
    if (allowed(horizontal)) next = horizontal;
    const vertical = { x: next.x, z: next.z + z / steps };
    if (allowed(vertical)) next = vertical;
  }
  return next;
}
