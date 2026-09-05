import { homeCatalog, homeRules as rules, type HomeState, type HomeItem, type HomeCommand } from './home-registry.ts';
import { validateHomeLayout } from './home-space.ts';
import type { IslandPoint } from './types.ts';

export function decodeHomeState(raw: unknown): HomeState | null {
  if (typeof raw !== 'object' || raw === null || !('schemaVersion' in raw)
    || raw.schemaVersion !== rules.schemaVersion || !('revision' in raw)
    || !Number.isSafeInteger(raw.revision) || Number(raw.revision) < 0
    || !('items' in raw) || !Array.isArray(raw.items) || raw.items.length > rules.maximumItems) return null;
  const items: HomeItem[] = [];
  for (const item of raw.items) {
    if (!isHomeItem(item) || items.some((entry) => entry.id === item.id)) return null;
    items.push({ id: item.id, kind: item.kind, x: item.x, z: item.z,
      rotation: item.rotation, placed: item.placed, active: item.active });
  }
  const home: HomeState = { schemaVersion: rules.schemaVersion, revision: Number(raw.revision), items };
  return validateHomeLayout(home) === null ? home : null;
}
function isHomeItem(raw: unknown): raw is HomeItem {
  if (typeof raw !== 'object' || raw === null) return false;
  const entry = raw as Partial<HomeItem>;
  return typeof entry.id === 'string' && entry.id.length > 0 && entry.id.length <= rules.maximumIdLength
    && typeof entry.kind === 'string' && Object.hasOwn(homeCatalog, entry.kind)
    && typeof entry.x === 'number' && Number.isFinite(entry.x) && entry.x % rules.grid === 0
    && typeof entry.z === 'number' && Number.isFinite(entry.z) && entry.z % rules.grid === 0
    && Number.isInteger(entry.rotation) && Number(entry.rotation) >= 0 && Number(entry.rotation) < 4
    && typeof entry.placed === 'boolean' && typeof entry.active === 'boolean';
}

/** One item in -> one item out: storing and placing never mint extra furniture. */
export function changeHomeItem(home: HomeState, id: string, command: HomeCommand): { state: HomeState; error: string | null } {
  const item = home.items.find((entry) => entry.id === id);
  if (item === undefined) return { state: home, error: rules.messages.missing };
  let replacement = item;
  if (command.kind === 'move') replacement = { ...item, x: command.x, z: command.z };
  if (command.kind === 'rotate') replacement = { ...item, rotation: (item.rotation + 1) % 4 };
  if (command.kind === 'store') replacement = { ...item, placed: false };
  if (command.kind === 'toggle' && item.kind === 'lamp') replacement = { ...item, active: !item.active };
  if (command.kind === 'place') return placeStoredItem(home, item);
  if (!isHomeItem(replacement)) return { state: home, error: rules.messages.invalid };
  const state = { ...home, revision: home.revision + 1,
    items: home.items.map((entry) => entry.id === id ? replacement : entry) };
  const error = validateHomeLayout(state);
  return { state: error === null ? state : home, error };
}
function placeStoredItem(home: HomeState, item: HomeItem) {
  if (item.placed) return { state: home, error: null };
  const limit = rules.halfSize - rules.grid;
  for (let z = -limit; z <= limit; z += rules.grid) {
    for (let x = -limit; x <= limit; x += rules.grid) {
      const state = { ...home, revision: home.revision + 1,
        items: home.items.map((entry) => entry.id === item.id ? { ...item, placed: true, x, z } : entry) };
      if (validateHomeLayout(state) === null) return { state, error: null };
    }
  }
  return { state: home, error: rules.messages.full };
}
export function nearestHomeItem(home: HomeState, point: IslandPoint): HomeItem | null {
  let nearest: HomeItem | null = null;
  let distance: number = rules.interactionRadius;
  for (const item of home.items) {
    const nextDistance = Math.hypot(point.x - item.x, point.z - item.z);
    if (item.placed && nextDistance < distance) { nearest = item; distance = nextDistance; }
  }
  return nearest;
}
