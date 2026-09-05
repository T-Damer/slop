import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIslandBlueprint } from './generator.ts';
import { createVoyageWorld } from './voyage-world.ts';
import { canWalkOnIsland } from './walking.ts';
import { islandSurface } from './village-paths.ts';
import { createVoyageState, voyageRules } from './voyage-registry.ts';
import { questReady, voyageQuests } from './voyage-quests.ts';
import type { IslandPreferences } from './types.ts';

const preferences: IslandPreferences = { color: 'green', music: 'nature', activity: 'exploring',
  weather: 'rainy', season: 'summer', livingStyle: 'rural', animal: 'rabbit' };
const home = buildIslandBlueprint('expanded-home-test', preferences);
const world = createVoyageWorld(home, 'home');

test('expanded home island has residential, river, forest, cave and beach structure', () => {
  const layout = world.exploration!;
  assert.ok(Math.min(...world.coastline) > 30);
  assert.equal(layout.homes.length, 3);
  assert.equal(layout.bridges.length, 2);
  assert.ok(layout.river && layout.river.points.length >= 8);
  assert.ok((layout.shrubs?.length ?? 0) >= 20);
  for (const id of ['village', 'grove', 'cave', 'pond', 'falls', 'beach']) {
    assert.ok(layout.sites.some((site) => site.id === id), id);
  }
});

test('resident houses are solid but every resident and house-front route stays reachable', () => {
  const layout = world.exploration!;
  for (const house of layout.homes) assert.equal(canWalkOnIsland(house, world), false, house.resident);
  for (const resident of layout.residents) assert.equal(canWalkOnIsland(resident.point, world), true, resident.id);
});

test('river is an obstacle except at authored bridges and those bridges sound wooden', () => {
  const layout = world.exploration!;
  const river = layout.river!;
  const drySegment = river.points.find((point) => layout.bridges.every((bridge) => Math.hypot(point.x - bridge.x, point.z - bridge.z) > 4))!;
  assert.equal(canWalkOnIsland(drySegment, world), false);
  for (const bridge of layout.bridges) {
    assert.equal(canWalkOnIsland(bridge, world), true, bridge.id);
    assert.equal(islandSurface(bridge, world), 'wood', bridge.id);
  }
  assert.equal(canWalkOnIsland(layout.pond, world), true);
  assert.equal(islandSurface(layout.pond, world), 'wood');
});

test('expanded generation is deterministic and never mutates the persisted core', () => {
  const before = JSON.stringify(home);
  const again = createVoyageWorld(home, 'home');
  assert.deepEqual(world, again);
  assert.equal(JSON.stringify(home), before);
  assert.deepEqual(world.trees.slice(0, home.trees.length), home.trees);
  assert.deepEqual(world.rocks.slice(0, home.rocks.length), home.rocks);
  assert.deepEqual(world.flowers.slice(0, home.flowers.length), home.flowers);
});

test('cave and beach discovery points stay walkable across generated home islands', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const generated = createVoyageWorld(buildIslandBlueprint('expanded-' + seed, preferences), 'home');
    for (const id of ['cave', 'beach', 'grove', 'falls']) {
      const point = generated.exploration!.sites.find((site) => site.id === id)!.point;
      assert.equal(canWalkOnIsland(point, generated), true, `${seed}/${id}`);
    }
  }
});

test('forest echo request requires the named forest and cave discoveries', () => {
  const quest = voyageQuests.find((entry) => entry.id === 'forest-echo')!;
  const base = createVoyageState();
  const partial = { ...base, accepted: [quest.id], claimed: ['familiar-paths'], discovered: ['home:grove'] };
  const ready = { ...partial, discovered: ['home:grove', 'home:cave'] };
  assert.equal(questReady(partial, quest), false);
  assert.equal(questReady(ready, quest), true);
  assert.ok(voyageRules.homeRadius >= 32);
});
