import {
  islandDestinationIds,
  islandRules,
  islandLandmarks,
} from './registry.ts';
import {
  createSeededRandom,
  deriveIslandSeed,
  type SeededRandom,
} from './seed.ts';
import type {
  IslandBlueprint,
  IslandPalette,
  IslandPlacement,
  IslandPoint,
  IslandPreferences,
  IslandPortalPlacement,
} from './types.ts';

const colorPaletteById = {
  blue: { roof: 0x4e8de8, flower: 0x70a7ff },
  green: { roof: 0x4cae72, flower: 0x70d98e },
  pink: { roof: 0xea76a5, flower: 0xff91bd },
  orange: { roof: 0xe98c43, flower: 0xffad63 },
  purple: { roof: 0x8b72d9, flower: 0xad91ff },
  yellow: { roof: 0xd8b33e, flower: 0xffd968 },
} as const;

const seasonPaletteById = {
  spring: { grass: 0x83c96d, sand: 0xe8d49c, sky: 0xbde9ff },
  summer: { grass: 0x65b85e, sand: 0xefd08a, sky: 0x8ed8ff },
  autumn: { grass: 0x9ab05f, sand: 0xe3c28e, sky: 0xc8ddf0 },
  winter: { grass: 0xb9cfbd, sand: 0xd9d7c6, sky: 0xdcecff },
} as const;

export function buildIslandBlueprint(
  playerId: string,
  preferences: IslandPreferences,
): IslandBlueprint {
  const seed = deriveIslandSeed(playerId, preferences);
  const random = createSeededRandom(seed);
  const reserved = createReservedPoints();
  const coastline = createCoastline(random);
  const palette = createPalette(preferences);
  const trees = createPlacements('tree', treeCount(preferences), random, reserved);
  const rocks = createPlacements('rock', islandRules.rockCount, random, [...reserved, ...trees]);
  const flowers = createPlacements(
    'flower',
    flowerCount(preferences),
    random,
    [...reserved, ...trees, ...rocks],
  );
  return {
    schemaVersion: 1,
    islandId: `island-${seed.toString(16).padStart(8, '0')}`,
    seed,
    season: preferences.season,
    coastline,
    palette,
    house: { id: 'house', ...islandLandmarks.house },
    playerSpawn: { x: 0, z: 2.1 },
    guideSpawn: { x: 1.25, z: 1.45 },
    trees,
    rocks,
    flowers,
    animal: {
      ...placement('animal', 2.9, -1.15, 0.78, -0.5),
      species: preferences.animal,
    },
    activityZone: {
      ...placement('activity', -3.1, 1.45, 1, 0.1),
      activity: preferences.activity,
    },
    portals: createPortals(),
  };
}

export function isPointInsideIsland(
  point: IslandPoint,
  blueprint: Pick<IslandBlueprint, 'coastline'>,
  margin = 0,
): boolean {
  const angle = normalizeAngle(Math.atan2(point.z, point.x));
  const position = angle / (Math.PI * 2) * blueprint.coastline.length;
  const leftIndex = Math.floor(position) % blueprint.coastline.length;
  const rightIndex = (leftIndex + 1) % blueprint.coastline.length;
  const fraction = position - Math.floor(position);
  const left = blueprint.coastline[leftIndex] ?? islandRules.baseRadius;
  const right = blueprint.coastline[rightIndex] ?? left;
  const radius = left + (right - left) * fraction;
  return Math.hypot(point.x, point.z) <= radius - margin;
}

function createPalette(preferences: IslandPreferences): IslandPalette {
  const color = colorPaletteById[preferences.color];
  const season = seasonPaletteById[preferences.season];
  const ocean = preferences.weather === 'misty' ? 0x5fa9ba : 0x3eacd1;
  return {
    grass: season.grass,
    sand: season.sand,
    ocean,
    roof: color.roof,
    flowers: [color.flower, 0xffffff, 0xffd45a],
    sky: season.sky,
  };
}

function createCoastline(random: SeededRandom): ReadonlyArray<number> {
  const coastline: number[] = [];
  for (let index = 0; index < islandRules.coastlinePoints; index += 1) {
    const wave = Math.sin(index * 0.83) * 0.28 + Math.cos(index * 1.41) * 0.18;
    coastline.push(
      islandRules.baseRadius
      + wave
      + random.between(-islandRules.radiusVariation, islandRules.radiusVariation),
    );
  }
  return coastline;
}

function createPlacements(
  prefix: string,
  count: number,
  random: SeededRandom,
  occupied: ReadonlyArray<IslandPoint>,
): ReadonlyArray<IslandPlacement> {
  const placements: IslandPlacement[] = [];
  const blocked: IslandPoint[] = [...occupied];
  for (let index = 0; index < count; index += 1) {
    const point = findFreePoint(random, blocked);
    if (point === null) {
      break;
    }
    const item = placement(
      `${prefix}-${index}`,
      point.x,
      point.z,
      random.between(0.78, 1.18),
      random.between(-Math.PI, Math.PI),
    );
    placements.push(item);
    blocked.push(item);
  }
  return placements;
}

function findFreePoint(
  random: SeededRandom,
  occupied: ReadonlyArray<IslandPoint>,
): IslandPoint | null {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const angle = random.between(0, Math.PI * 2);
    const radius = Math.sqrt(random.next()) * (islandRules.baseRadius - 1.25);
    const point = { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
    if (distance(point, islandLandmarks.house) >= islandRules.housePlantingClearance
      && occupied.every((other) => distance(point, other) >= islandRules.minimumPlacementDistance)) {
      return point;
    }
  }
  return null;
}

function createReservedPoints(): ReadonlyArray<IslandPoint> {
  return [
    islandLandmarks.house,
    { x: 0, z: 2.1 },
    { x: 1.25, z: 1.45 },
    { x: 2.9, z: -1.15 },
    { x: -3.1, z: 1.45 },
    { x: -5.25, z: -3.25 },
    { x: 0, z: -6.15 },
    { x: 5.05, z: -3.3 },
  ];
}

function createPortals(): ReadonlyArray<IslandPortalPlacement> {
  return [
    {
      destinationId: islandDestinationIds.billiards,
      label: 'Pocket Club',
      color: 0x40c49a,
      x: 0,
      z: -6.15,
    },
    {
      destinationId: islandDestinationIds.parkingJam,
      label: 'Parking Jam',
      color: 0x5f8df2,
      x: -5.25,
      z: -3.25,
    },
    {
      destinationId: islandDestinationIds.junkyardStation,
      label: 'Junkyard Station',
      color: 0xf29c55,
      x: 5.05,
      z: -3.3,
    },
  ];
}

function treeCount(preferences: IslandPreferences): number {
  if (preferences.livingStyle === 'rural') {
    return islandRules.treeCount + 5;
  }
  if (preferences.livingStyle === 'city') {
    return islandRules.treeCount - 4;
  }
  return islandRules.treeCount;
}

function flowerCount(preferences: IslandPreferences): number {
  return preferences.activity === 'gardening'
    ? islandRules.flowerCount + 10
    : islandRules.flowerCount;
}

function placement(
  id: string,
  x: number,
  z: number,
  scale: number,
  rotation: number,
): IslandPlacement {
  return { id, x, z, scale, rotation };
}

function distance(left: IslandPoint, right: IslandPoint): number {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function normalizeAngle(angle: number): number {
  return angle < 0 ? angle + Math.PI * 2 : angle;
}
