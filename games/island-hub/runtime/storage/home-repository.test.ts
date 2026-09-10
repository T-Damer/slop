import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeState } from '../domain/home-registry.ts';
import { loadHome, saveHome } from './home-repository.ts';
import { loadSoundMix, saveSoundMix } from './sound-preferences.ts';

function fakeStorage() {
  const values = new Map<string, string>();
  const storage = { get length() { return values.size; }, clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }, key: (index: number) => [...values.keys()][index] ?? null };
  return { storage, values };
}
test('home sidecar round-trips without overwriting the old island or journal', () => {
  const { storage, values } = fakeStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  values.set('slop.personal-island.v1', 'existing-island');
  values.set('slop.island-journal.v1:test', 'existing-journal');
  assert.ok(saveHome('test', createHomeState()));
  assert.deepEqual(loadHome('test'), { state: createHomeState(), warning: false });
  assert.equal(values.get('slop.personal-island.v1'), 'existing-island');
  assert.equal(values.get('slop.island-journal.v1:test'), 'existing-journal');
  Reflect.deleteProperty(globalThis, 'localStorage');
});
test('invalid old data is retained and backed up before a replacement save', () => {
  const { storage, values } = fakeStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  values.set('slop.home.v1:test', '{broken');
  assert.equal(loadHome('test').warning, true);
  assert.equal(values.get('slop.home.v1:test'), '{broken');
  assert.ok(saveHome('test', createHomeState()));
  assert.equal(values.get('slop.home.v1:test:unreadable-backup'), '{broken');
  Reflect.deleteProperty(globalThis, 'localStorage');
});
test('storage denial fails explicitly rather than claiming a successful home save', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true,
    get: () => { throw new Error('Storage denied'); } });
  assert.equal(loadHome('test').warning, true);
  assert.equal(saveHome('test', createHomeState()), false);
  assert.equal(saveSoundMix(loadSoundMix()), false);
  Reflect.deleteProperty(globalThis, 'localStorage');
});
test('sound settings are independently clamped and persisted, including silence', () => {
  const { storage } = fakeStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  assert.ok(saveSoundMix({ master: 0, music: 1.5, ambience: -2, effects: 0.4 }));
  assert.deepEqual(loadSoundMix(), { master: 0, music: 1, ambience: 0, effects: 0.4 });
  Reflect.deleteProperty(globalThis, 'localStorage');
});
