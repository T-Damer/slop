import { createSeededRandom } from './seed.ts';
import { voyageLayout, voyageReserved } from './voyage-layout.ts';
import { voyageRules, type VoyageRegionId } from './voyage-registry.ts';
import type { IslandBlueprint, IslandPlacement, IslandPoint } from './types.ts';

const regionSeeds: Record<VoyageRegionId, number> = { home: 101, shell: 307, pine: 509 };
const coast = { wave: 1.25, ripple: 0.5, inset: 3.1, treeScale: [0.86, 1.34],
  flowerScale: [0.78, 1.18], shrubScale: [0.85, 1.25], rockScale: [0.7, 1.3] } as const;
/** Additive landscape: the stored cottage, planting IDs and old core placements never move. */
export function createVoyageWorld(home: IslandBlueprint, region: VoyageRegionId): IslandBlueprint {
  const layout = voyageLayout(region, home);
  const radius = region === 'home' ? Math.max(voyageRules.homeRadius, ...home.coastline) : voyageRules.awayRadius;
  const random = createSeededRandom((home.seed ^ regionSeeds[region]) >>> 0);
  const phase = random.between(0, Math.PI * 2);
  const coastline = Array.from({ length: voyageRules.coastlineSamples }, (_, index) => {
    const angle = index / voyageRules.coastlineSamples * Math.PI * 2;
    return radius + Math.sin(angle * 3 + phase) * coast.wave + Math.cos(angle * 5 - phase) * coast.ripple;
  });
  const occupied: IslandPlacement[] = [];
  function sample(prefix: string, index: number, count: number): IslandPoint {
    if (region === 'home' && prefix === 'wild' && index < count * 0.62) {
      return { x: random.between(-radius + 5, -8), z: random.between(-17, 20) };
    }
    if (region === 'home' && prefix === 'shrub' && index < count * 0.72) {
      return index < count * 0.42
        ? { x: random.between(-radius + 6, -6), z: random.between(-15, 22) }
        : { x: random.between(-3, 18), z: random.between(6, 18) };
    }
    if (region === 'home' && prefix === 'bloom' && index < count * 0.58) {
      return { x: random.between(-2, 16), z: random.between(7, 18) };
    }
    const angle = random.between(0, Math.PI * 2);
    const distance = random.between(region === 'home' ? voyageRules.coreRadius : 2, radius - coast.inset);
    return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance };
  }
  function scatter(prefix: string, count: number): IslandPlacement[] {
    const result: IslandPlacement[] = [];
    for (let attempt = 0; attempt < voyageRules.placementAttempts && result.length < count; attempt += 1) {
      const point = sample(prefix, result.length, count);
      if (Math.hypot(point.x, point.z) > radius - coast.inset || voyageReserved(point, layout)) continue;
      const clearance = prefix === 'shrub' || prefix === 'bloom' ? voyageRules.shrubClearance : voyageRules.clearance;
      if (occupied.some((entry) => Math.hypot(entry.x - point.x, entry.z - point.z) < clearance)) continue;
      const scales = prefix === 'wild' ? coast.treeScale : prefix === 'shrub' ? coast.shrubScale
        : prefix === 'rock' ? coast.rockScale : coast.flowerScale;
      const placement = { ...point, id: `${prefix}:${region}:${result.length}`, rotation: random.between(-Math.PI, Math.PI),
        scale: random.between(scales[0], scales[1]) };
      result.push(placement); occupied.push(placement);
    }
    return result;
  }
  const treeCount = region === 'shell' ? Math.floor(voyageRules.treeCount * 0.42)
    : region === 'pine' ? voyageRules.treeCount : Math.floor(voyageRules.treeCount * 0.9);
  const trees = scatter('wild', treeCount);
  const flowers = scatter('bloom', region === 'pine' ? Math.floor(voyageRules.flowerCount * 0.55) : voyageRules.flowerCount);
  const shrubs = scatter('shrub', region === 'home' ? voyageRules.shrubCount : Math.floor(voyageRules.shrubCount * 0.45));
  const rocks = scatter('rock', region === 'home' ? voyageRules.rockCount : Math.floor(voyageRules.rockCount * 0.65));
  const palette = region === 'pine' ? { ...home.palette, grass: 0x73a38a, ocean: 0x57999f, sky: 0xc8ded8 }
    : region === 'shell' ? { ...home.palette, grass: 0xb3c77f, sand: 0xf0d5a3, ocean: 0x5cbdb8, sky: 0xc9e9e9 }
      : { ...home.palette, grass: 0x8fc077, ocean: 0x65bcb8, sky: 0xd0e7e4 };
  return { ...home, coastline, palette, exploration: { ...layout, shrubs },
    house: region === 'home' ? home.house : { ...home.house, x: radius * 3, z: radius * 3 },
    trees: region === 'home' ? [...home.trees, ...trees] : trees,
    rocks: region === 'home' ? [...home.rocks, ...rocks] : rocks,
    flowers: region === 'home' ? [...home.flowers, ...flowers] : flowers,
    portals: region === 'home' ? home.portals : [],
    playerSpawn: region === 'home' ? home.playerSpawn : { x: layout.dock.x, z: layout.dock.z - 1.8 },
  };
}
