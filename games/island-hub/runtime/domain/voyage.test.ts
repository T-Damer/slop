import { islandSurface } from './village-paths.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIslandBlueprint } from './generator.ts';
import { createVoyageWorld } from './voyage-world.ts';
import { canWalkOnIsland } from './walking.ts';
import { commandVoyage, observeVoyage, voyageTargets } from './voyage.ts';
import { createVoyageState, type VoyageState, type VoyageRegionId } from './voyage-registry.ts';
import { validateVoyage } from './voyage-validation.ts';
import { IslandLife } from './life.ts';
import type { IslandBlueprint, IslandPreferences } from './types.ts';

const preferences: IslandPreferences = { color: 'blue', music: 'lofi', activity: 'gardening',
  weather: 'sunny', season: 'spring', livingStyle: 'coastal', animal: 'cat' };
const home = buildIslandBlueprint('voyage-test', preferences);
const world = createVoyageWorld(home, 'home');
const neighbor = (id: string) => world.exploration!.residents.find((entry) => entry.id === id)!.point;

test('additive envelope is deterministic and keeps every legacy object and receipt ID', () => {
  const snapshot = JSON.stringify(home);
  assert.deepEqual(world, createVoyageWorld(home, 'home'));
  assert.equal(JSON.stringify(home), snapshot);
  assert.deepEqual(world.house, home.house);
  assert.deepEqual(world.trees.slice(0, home.trees.length), home.trees);
  assert.deepEqual(world.flowers.slice(0, home.flowers.length), home.flowers);
  assert.deepEqual(world.portals, home.portals);
  assert.deepEqual(world.playerSpawn, home.playerSpawn);
  assert.equal(world.islandId, home.islandId);
  assert.ok(Math.min(...world.coastline) > Math.max(...home.coastline) * 2);
});

test('200 seeds keep all three destinations and their interaction points on walkable land', () => {
  for (let seed = 0; seed < 200; seed += 1) for (const region of ['home', 'shell', 'pine'] as const) {
    const current = createVoyageWorld(buildIslandBlueprint('voyage-' + seed, preferences), region);
    const layout = current.exploration!;
    assert.ok(canWalkOnIsland(current.playerSpawn, current));
    assert.ok(canWalkOnIsland(layout.dock, current));
    for (const target of [...layout.sites, ...layout.residents, ...layout.pickups]) {
      assert.ok(canWalkOnIsland(target.point, current), `${seed}/${region}/${target.id}`);
    }
  }
});

function connectedPoints(current: IslandBlueprint): Set<string> {
  const grid = 0.5;
  const start = { x: Math.round(current.playerSpawn.x / grid), z: Math.round(current.playerSpawn.z / grid) };
  const seen = new Set([`${start.x}:${start.z}`]); const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const here = queue[index]!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { x: here.x + dx, z: here.z + dz }; const key = `${next.x}:${next.z}`;
      if (seen.has(key) || !canWalkOnIsland({ x: next.x * grid, z: next.z * grid }, current)
        || !canWalkOnIsland({ x: (here.x + next.x) * grid / 2, z: (here.z + next.z) * grid / 2 }, current)) continue;
      seen.add(key); queue.push(next);
    }
  }
  return seen;
}
test('generated routes connect docks, residents and every discovery across 12 seed sweeps', () => {
  for (let seed = 0; seed < 12; seed += 1) for (const region of ['home', 'shell', 'pine'] as const) {
    const current = createVoyageWorld(buildIslandBlueprint('route-' + seed, preferences), region);
    const reachable = connectedPoints(current); const layout = current.exploration!;
    for (const point of [layout.dock, ...layout.sites.map((entry) => entry.point), ...layout.residents.map((entry) => entry.point), ...layout.pickups.map((entry) => entry.point)]) {
      const x = Math.round(point.x * 2); const z = Math.round(point.z * 2);
      assert.ok(reachable.has(`${x}:${z}`), `${seed}/${region} cannot reach ${x},${z}`);
    }
  }
});
test('pond blocks walking except the shared rendered bridge corridor', () => {
  const pond = world.exploration!.pond;
  assert.equal(canWalkOnIsland({ x: pond.x, z: pond.z + 1 }, world), false);
  assert.equal(canWalkOnIsland({ x: pond.x, z: pond.z }, world), true);
});
test('discoveries are region-scoped, repeat-safe and cannot be awarded from invalid coordinates', () => {
  const state = createVoyageState(); const point = world.exploration!.sites[0]!.point;
  const next = observeVoyage(state, world, point);
  assert.equal(next.discovered.length, 1); assert.equal(state.discovered.length, 0);
  assert.strictEqual(observeVoyage(next, world, point), next);
  assert.strictEqual(observeVoyage(state, world, { x: NaN, z: 0 }), state);
});
test('requests require accepting and returning to the correct neighbor, with exactly one reward', () => {
  let state = createVoyageState();
  for (const site of world.exploration!.sites.slice(0, 3)) state = observeVoyage(state, world, site.point);
  const claim = { kind: 'claim', id: 'familiar-paths' } as const;
  assert.notEqual(commandVoyage(state, world, neighbor('lumi'), claim).error, null);
  state = commandVoyage(state, world, neighbor('lumi'), { kind: 'accept', id: claim.id }).state;
  assert.notEqual(commandVoyage(state, world, neighbor('mira'), claim).error, null);
  const paid = commandVoyage(state, world, neighbor('lumi'), claim);
  assert.equal(paid.error, null); assert.deepEqual(paid.state.claimed, ['familiar-paths']);
  assert.strictEqual(commandVoyage(paid.state, world, neighbor('lumi'), claim).state, paid.state);
  assert.deepEqual(validateVoyage(paid.state, home), paid.state);
});
test('shell delivery is atomic, consumes three receipts and cannot be replayed', () => {
  let state = commandVoyage(createVoyageState(), world, neighbor('mira'), { kind: 'accept', id: 'garden-shells' }).state;
  const claim = { kind: 'claim', id: 'garden-shells' } as const;
  assert.notEqual(commandVoyage(state, world, neighbor('mira'), claim).error, null);
  for (const pickup of world.exploration!.pickups.slice(0, 3)) {
    state = commandVoyage(state, world, pickup.point, { kind: 'collect', id: pickup.id }).state;
    assert.strictEqual(commandVoyage(state, world, pickup.point, { kind: 'collect', id: pickup.id }).state, state);
  }
  assert.equal(state.inventory.shell, 3);
  const delivered = commandVoyage(state, world, neighbor('mira'), claim).state;
  assert.equal(delivered.inventory.shell, 0);
  assert.strictEqual(commandVoyage(delivered, world, neighbor('mira'), claim).state, delivered);
  assert.deepEqual(validateVoyage(delivered, home), delivered);
});
test('boat requires the dock; returning from both islands is free and preserves discoveries and pockets', () => {
  let state: VoyageState = createVoyageState(); let current = world;
  assert.notEqual(commandVoyage(state, current, current.playerSpawn, { kind: 'travel', region: 'pine' }).error, null);
  for (const region of ['pine', 'shell', 'home'] as VoyageRegionId[]) {
    const result = commandVoyage(state, current, current.exploration!.dock, { kind: 'travel', region });
    assert.equal(result.error, null); state = result.state; current = createVoyageWorld(home, region);
    const pickup = current.exploration!.pickups[0]!;
    state = commandVoyage(state, current, pickup.point, { kind: 'collect', id: pickup.id }).state;
    state = observeVoyage(state, current, current.exploration!.sites[0]!.point);
    assert.deepEqual(validateVoyage(state, home), state);
  }
  assert.equal(state.region, 'home'); assert.equal(state.visited.length, 3); assert.equal(state.inventory.letter, 1);
});
test('invalid inventory, forged rewards, duplicate receipts and unknown regions are rejected', () => {
  const state = createVoyageState();
  for (const bad of [{ ...state, inventory: { ...state.inventory, shell: 999 } }, { ...state, claimed: ['garden-shells'] },
    { ...state, collected: ['home:shell:0', 'home:shell:0'] }, { ...state, region: 'missing' }, { ...state, visited: ['home', '__proto__'] }]) {
    assert.equal(validateVoyage(bad, home), null);
  }
});
test('external targets reuse proximity selection and do not write to the legacy journal', () => {
  const state = createVoyageState();
  const life = new IslandLife(world, { completed: [] }, voyageTargets(world, state));
  const dock = world.exploration!.dock;
  assert.equal(life.step(dock, 0.05, true).target?.id, 'voyage:dock');
  const pickup = world.exploration!.pickups[0]!; const id = `voyage:pickup:${pickup.id}`;
  assert.equal(life.step(pickup.point, 0.05, true).target?.id, id);
  life.dismissExternal(id);
  assert.notEqual(life.step(pickup.point, 0.05, false).target?.id, id);
  assert.deepEqual(life.journal, { completed: [] });
});
test('expanded-island game entrances require explicit intent rather than accidental proximity', () => {
  const life = new IslandLife(world, { completed: [] }, voyageTargets(world, createVoyageState()));
  const portal = world.portals[0]!;
  for (let i = 0; i < 30; i += 1) assert.equal(life.step(portal, 0.1, false).destination, null);
  assert.equal(life.step(portal, 0.1, true).destination, portal.destinationId);
});

test('the archipelago finale requires its predecessor, both journeys and conserved sea glass', () => {
  let state = createVoyageState();
  const finale = 'little-archipelago';
  assert.strictEqual(commandVoyage(state, world, neighbor('lumi'), { kind: 'accept', id: finale }).state, state);
  state = commandVoyage(state, world, neighbor('lumi'), { kind: 'accept', id: 'familiar-paths' }).state;
  for (const site of world.exploration!.sites.slice(0, 3)) state = observeVoyage(state, world, site.point);
  state = commandVoyage(state, world, neighbor('lumi'), { kind: 'claim', id: 'familiar-paths' }).state;
  state = commandVoyage(state, world, neighbor('lumi'), { kind: 'accept', id: finale }).state;
  let current = world;
  for (const region of ['shell', 'pine', 'home'] as const) {
    state = commandVoyage(state, current, current.exploration!.dock, { kind: 'travel', region }).state;
    current = createVoyageWorld(home, region);
    if (region === 'shell') {
      const glass = current.exploration!.pickups.find((entry) => entry.item === 'glass')!;
      state = commandVoyage(state, current, glass.point, { kind: 'collect', id: glass.id }).state;
    }
  }
  assert.equal(state.inventory.glass, 1);
  const next = commandVoyage(state, current, neighbor('lumi'), { kind: 'claim', id: finale });
  assert.equal(next.error, null); assert.equal(next.state.inventory.glass, 0);
  assert.ok(next.state.claimed.includes(finale));
  assert.strictEqual(commandVoyage(next.state, current, neighbor('lumi'), { kind: 'claim', id: finale }).state, next.state);
  assert.deepEqual(validateVoyage(next.state, home), next.state);
});

test('pier and bridge use wooden footsteps from the same region geometry', () => {
  for (const region of ['home', 'shell', 'pine'] as const) {
    const current = createVoyageWorld(home, region); const layout = current.exploration!;
    assert.equal(islandSurface(layout.dock, current), 'wood');
    assert.equal(islandSurface(layout.pond, current), 'wood');
    assert.notEqual(islandSurface({ x: layout.dock.x + 1.1, z: layout.dock.z }, current), 'wood');
  }
});
