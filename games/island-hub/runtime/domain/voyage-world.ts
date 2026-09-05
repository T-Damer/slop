import { createSeededRandom } from './seed.ts';
import { voyageLayout, voyageReserved } from './voyage-layout.ts';
import { voyageRules, type VoyageRegionId } from './voyage-registry.ts';
import type { IslandBlueprint, IslandPlacement } from './types.ts';

const regionSeeds: Record<VoyageRegionId, number> = { home: 101, shell: 307, pine: 509 };
const coast = { wave: 1.1, ripple: 0.42, inset: 3, treeScale: [0.88, 1.3], flowerScale: [0.8, 1.2] } as const;
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
  function scatter(prefix: string, count: number): IslandPlacement[] {
    const result: IslandPlacement[] = [];
    for (let attempt = 0; attempt < voyageRules.placementAttempts && result.length < count; attempt += 1) {
      const angle = random.between(0, Math.PI * 2);
      const distance = random.between(region === 'home' ? voyageRules.coreRadius : 2, radius - coast.inset);
      const point = { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance };
      if (voyageReserved(point, layout) || occupied.some((entry) => Math.hypot(entry.x - point.x, entry.z - point.z) < voyageRules.clearance)) continue;
      const scales = prefix === 'wild' ? coast.treeScale : coast.flowerScale;
      const placement = { ...point, id: `${prefix}:${region}:${result.length}`, rotation: random.between(-Math.PI, Math.PI),
        scale: random.between(scales[0], scales[1]) };
      result.push(placement); occupied.push(placement);
    }
    return result;
  }
  const trees = scatter('wild', region === 'shell' ? voyageRules.treeCount / 2 : voyageRules.treeCount);
  const flowers = scatter('bloom', voyageRules.flowerCount);
  const palette = region === 'pine' ? { ...home.palette, grass: 0x73a38a, ocean: 0x57999f, sky: 0xc8ded8 }
    : region === 'shell' ? { ...home.palette, grass: 0xb3c77f, sand: 0xf0d5a3, ocean: 0x5cbdb8, sky: 0xc9e9e9 }
      : { ...home.palette, grass: 0x8fc077, ocean: 0x65bcb8, sky: 0xd0e7e4 };
  return { ...home, coastline, palette, exploration: layout,
    house: region === 'home' ? home.house : { ...home.house, x: radius * 3, z: radius * 3 },
    trees: region === 'home' ? [...home.trees, ...trees] : trees,
    rocks: region === 'home' ? home.rocks : [], flowers: region === 'home' ? [...home.flowers, ...flowers] : flowers,
    portals: region === 'home' ? home.portals : [],
    playerSpawn: region === 'home' ? home.playerSpawn : { x: layout.dock.x, z: layout.dock.z - 1.8 },
  };
}
