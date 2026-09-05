import assert from 'node:assert/strict';
import test from 'node:test';
import { loadVoyage, saveVoyage, voyageStorage } from './voyage-repository.ts';
import { createVoyageState } from '../domain/voyage-registry.ts';
import { buildIslandBlueprint } from '../domain/generator.ts';
const home = buildIslandBlueprint('voyage-storage', { color: 'green', music: 'nature', activity: 'gardening',
  weather: 'sunny', season: 'spring', livingStyle: 'rural', animal: 'rabbit' });
const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); } };
test('voyage sidecar is additive and backs up invalid data before writing', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    values.set('slop.personal-island.v1', 'original-island'); values.set('slop.home.v1:' + home.islandId, 'my-room');
    assert.ok(saveVoyage(home, createVoyageState()));
    assert.deepEqual(loadVoyage(home), { state: createVoyageState(), warning: false });
    assert.equal(values.get('slop.personal-island.v1'), 'original-island');
    assert.equal(values.get('slop.home.v1:' + home.islandId), 'my-room');
    values.set(voyageStorage.key + home.islandId, '{broken');
    assert.equal(loadVoyage(home).warning, true);
    assert.equal(values.get(voyageStorage.key + home.islandId), '{broken');
    assert.ok(saveVoyage(home, createVoyageState()));
    assert.equal(values.get(voyageStorage.backup + home.islandId), '{broken');
  } finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});
test('storage denial and forged inventory fail explicitly', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
  try {
    assert.equal(saveVoyage(home, createVoyageState()), false);
    assert.equal(loadVoyage(home).warning, true);
    assert.equal(saveVoyage(home, { ...createVoyageState(), inventory: { shell: 100, glass: 0, letter: 0 } }), false);
  } finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});
