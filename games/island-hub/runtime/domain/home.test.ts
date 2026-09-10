import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeState, homeRules, type HomeState } from './home-registry.ts';
import { changeHomeItem, decodeHomeState } from './home.ts';
import { canWalkInHome, validateHomeLayout, houseEntrance, isAtHouseEntrance } from './home-space.ts';
import { walkWithObstacles } from './walking.ts';
import { buildIslandBlueprint } from './generator.ts';

const initial = createHomeState();
test('starter home has six stable identities and reachable furniture', () => {
  assert.equal(initial.items.length, 6);
  assert.equal(validateHomeLayout(initial), null);
  assert.ok(canWalkInHome(homeRules.door, initial));
  assert.deepEqual(decodeHomeState(JSON.parse(JSON.stringify(initial))), initial);
});
test('placing furniture over another object or the only exit is rejected immutably', () => {
  const copy = JSON.stringify(initial);
  const collision = changeHomeItem(initial, 'home-chair', { kind: 'move', x: 0, z: -1.5 });
  assert.equal(collision.error, homeRules.messages.collision);
  assert.equal(collision.state, initial);
  assert.equal(changeHomeItem(initial, 'home-chair', { kind: 'move', x: 0, z: 2.5 }).error, homeRules.messages.exit);
  assert.equal(JSON.stringify(initial), copy);
});
test('rotation respects the entire rectangular footprint and bounds', () => {
  const turned = changeHomeItem(initial, 'home-bed', { kind: 'rotate' });
  assert.equal(turned.state, initial);
  assert.notEqual(turned.error, null);
  assert.notEqual(changeHomeItem(initial, 'home-chair', { kind: 'move', x: 3, z: 0 }).error, null);
  assert.notEqual(changeHomeItem(initial, 'home-chair', { kind: 'move', x: NaN, z: 0 }).error, null);
});
test('storage, restoring and repeated placing conserve items and identities', () => {
  const stored = changeHomeItem(initial, 'home-chair', { kind: 'store' }).state;
  assert.equal(stored.items.find((item) => item.id === 'home-chair')?.placed, false);
  const placed = changeHomeItem(stored, 'home-chair', { kind: 'place' });
  assert.equal(placed.error, null);
  assert.equal(placed.state.items.length, initial.items.length);
  assert.deepEqual(placed.state.items.map((item) => item.id), initial.items.map((item) => item.id));
  assert.equal(changeHomeItem(placed.state, 'home-chair', { kind: 'place' }).state, placed.state);
});
test('lamp toggles without mutating the saved home', () => {
  const changed = changeHomeItem(initial, 'home-lamp', { kind: 'toggle' }).state;
  assert.equal(changed.items.find((item) => item.kind === 'lamp')?.active, false);
  assert.equal(initial.items.find((item) => item.kind === 'lamp')?.active, true);
});
test('untrusted storage rejects version, duplicate IDs, prototype keys and non-grid placement', () => {
  assert.equal(decodeHomeState({ ...initial, schemaVersion: 2 }), null);
  assert.equal(decodeHomeState({ ...initial, items: [initial.items[0], initial.items[0]] }), null);
  assert.equal(decodeHomeState({ ...initial, items: [{ ...initial.items[0], kind: '__proto__' }] }), null);
  assert.equal(decodeHomeState({ ...initial, items: [{ ...initial.items[0], x: 0.1 }] }), null);
  assert.equal(decodeHomeState(null), null);
});
test('movement cannot cross furnishings or leave the room, including a stalled frame', () => {
  let position = { x: 0, z: 1.5 };
  for (let frame = 0; frame < 300; frame += 1) {
    position = walkWithObstacles(position, { x: 0, z: -1 }, 5, true, (point) => canWalkInHome(point, initial));
    assert.ok(canWalkInHome(position, initial));
  }
  assert.ok(position.z > 0.5);
});
test('doorway respects rotated/scaled houses rather than hard-coded world coordinates', () => {
  const island = buildIslandBlueprint('home-test', { color: 'blue', music: 'lofi', activity: 'gardening',
    weather: 'sunny', season: 'spring', livingStyle: 'coastal', animal: 'cat' });
  const door = houseEntrance(island);
  assert.ok(isAtHouseEntrance(door, island));
  assert.equal(isAtHouseEntrance(island.house, island), false);
});
test('navigation rejects an item sealed off by a wall of furniture even when the exit is empty', () => {
  const blocked: HomeState = { ...initial, items: [
    ...Array.from({ length: 11 }, (_, i) => (i - 5) * 0.5).map((x) => ({ id: `barrier-${x}`, kind: 'lamp' as const, x, z: 0,
      rotation: 0, placed: true, active: false })),
    { id: 'hidden', kind: 'lamp', x: 0, z: -2, rotation: 0, placed: true, active: true },
  ] };
  // Side gaps narrower than the player's inflated footprint cannot count as access.
  assert.equal(validateHomeLayout(blocked), homeRules.messages.access);
});
