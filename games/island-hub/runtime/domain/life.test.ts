import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIslandBlueprint, isPointInsideIsland } from './generator.ts';
import { IslandLife, islandLifeRules } from './life.ts';
import { canWalkOnIsland, walkOnIsland, islandWalking } from './walking.ts';
import type { IslandBlueprint, IslandPreferences } from './types.ts';

const preferences: IslandPreferences = { color: 'blue', music: 'lofi', activity: 'gardening',
  weather: 'sunny', season: 'spring', livingStyle: 'coastal', animal: 'cat' };
const blueprint = buildIslandBlueprint('cozy-island-test', preferences);
const clear: IslandBlueprint = { ...blueprint, trees: [], rocks: [], house: { ...blueprint.house, x: -5, z: -5 } };

test('walking preserves analog magnitude and caps diagonal speed', () => {
  const origin = { x: 0, z: 0 };
  const straight = walkOnIsland(origin, { x: 1, z: 0 }, 0.05, false, clear);
  const diagonal = walkOnIsland(origin, { x: 1, z: 1 }, 0.05, false, clear);
  const analog = walkOnIsland(origin, { x: 0.5, z: 0 }, 0.05, false, clear);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - straight.x) < 1e-9);
  assert.ok(Math.abs(analog.x * 2 - straight.x) < 1e-9);
});

test('running is faster, stalled and invalid inputs cannot teleport the player', () => {
  const origin = { x: 0, z: 0 };
  const running = walkOnIsland(origin, { x: 1, z: 0 }, 5, true, clear);
  assert.ok(Math.abs(running.x - islandWalking.runSpeed * islandWalking.maximumDelta) < 1e-9);
  assert.deepEqual(walkOnIsland(origin, { x: NaN, z: 0 }, 0.05, true, clear), origin);
  assert.deepEqual(walkOnIsland(origin, { x: 1, z: 0 }, -1, true, clear), origin);
});

test('shore, rotated house, tree trunks and rocks block movement', () => {
  assert.equal(canWalkOnIsland(blueprint.house, blueprint), false);
  assert.equal(canWalkOnIsland(blueprint.trees[0]!, blueprint), false);
  assert.equal(canWalkOnIsland(blueprint.rocks[0]!, blueprint), false);
  let position = blueprint.playerSpawn;
  for (let index = 0; index < 500; index += 1) {
    position = walkOnIsland(position, { x: 1, z: 0.4 }, 0.05, true, blueprint);
    assert.ok(isPointInsideIsland(position, blueprint, islandWalking.coastMargin));
  }
});

test('a house wall permits tangential sliding instead of tunnelling', () => {
  const wall: IslandBlueprint = { ...clear, house: { ...clear.house, x: 0, z: 0, rotation: 0 } };
  const origin = { x: 1.6, z: 0 };
  const next = walkOnIsland(origin, { x: -1, z: 1 }, 0.05, true, wall);
  assert.ok(next.x >= islandWalking.houseHalfWidth + islandWalking.playerRadius);
  assert.ok(next.z > origin.z);
});

test('harvest requires an explicit action, awards once, and pays for planting', () => {
  const life = new IslandLife(blueprint);
  const tree = life.targets.find((target) => target.kind === 'fruit')!;
  for (let index = 0; index < 20; index += 1) life.step(tree.point, 0.05, false);
  assert.equal(life.fruit, 0);
  assert.equal(life.step(tree.point, 0.05, true).changed, true);
  assert.equal(life.fruit, 1);
  const before = life.journal;
  life.step(tree.point, 0.05, true);
  assert.equal(life.journal.completed.filter((id) => id === tree.id).length, 1);
  const garden = life.targets.find((target) => target.kind === 'garden')!;
  assert.equal(life.step(garden.point, 0.05, true).changed, true);
  assert.equal(life.planted, 1);
  assert.equal(life.fruit, 0);
  assert.equal(before.completed.includes(garden.id), false);
});

test('empty inventory cannot plant and restored journals reject unknown or unpaid entries', () => {
  const life = new IslandLife(blueprint);
  const garden = life.targets.find((target) => target.kind === 'garden')!;
  const result = life.step(garden.point, 0.05, true);
  assert.equal(result.changed, false);
  assert.equal(result.message, islandLifeRules.messages.empty);
  const restored = new IslandLife(blueprint, { completed: [garden.id, 'invented-id'] });
  assert.deepEqual(restored.journal, { completed: [] });
});

test('harvest and planted journal survive restoration without awarding twice', () => {
  const first = new IslandLife(blueprint);
  const tree = first.targets.find((target) => target.kind === 'fruit')!;
  first.step(tree.point, 0.05, true);
  const second = new IslandLife(blueprint, first.journal);
  assert.equal(second.fruit, 1);
  assert.equal(second.journal.completed.includes(tree.id), true);
});

test('portal progress does not carry to a different portal or survive pause', () => {
  const life = new IslandLife(blueprint);
  const portals = life.targets.filter((target) => target.kind === 'portal');
  const first = portals[0]!;
  const second = portals[1]!;
  for (let index = 0; index < 6; index += 1) life.step(first.point, 0.1, false);
  const switched = life.step(second.point, 0.1, false);
  assert.ok(switched.progress <= 0.126);
  life.resetProgress();
  assert.ok(life.step(second.point, 0.1, false).progress <= 0.126);
  let destination = null;
  for (let index = 0; index < 8; index += 1) destination = life.step(second.point, 0.1, false).destination ?? destination;
  assert.equal(destination, second.destination);
});


test('200 generated islands keep scenery clear of the house and the spawn walkable', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const island = buildIslandBlueprint('island-stress-' + seed, preferences);
    // Isolate the house from shoreline checks; decorative flowers may sit on the beach.
    const houseOnly: IslandBlueprint = { ...island, trees: [], rocks: [],
      coastline: island.coastline.map((radius) => radius * 2) };
    assert.equal(canWalkOnIsland(island.playerSpawn, island), true);
    for (const prop of [...island.trees, ...island.rocks, ...island.flowers]) {
      assert.equal(canWalkOnIsland(prop, houseOnly), true, prop.id + ' intersects the house');
    }
  }
});
