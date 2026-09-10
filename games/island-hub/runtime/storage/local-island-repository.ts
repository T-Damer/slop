import { islandRules } from '../domain/registry.ts';
import type {
  IslandRepository,
  IslandSnapshot,
} from '../domain/types.ts';

export function createLocalIslandRepository(): IslandRepository {
  return {
    load: async () => readSnapshot(),
    save: async (snapshot) => writeSnapshot(snapshot),
    clear: async () => clearSnapshot(),
  };
}

export function getOrCreateLocalPlayerId(): string {
  const existing = safeStorageRead(islandRules.playerIdKey);
  if (existing !== null && existing.trim() !== '') {
    return existing;
  }
  const playerId = createPlayerId();
  safeStorageWrite(islandRules.playerIdKey, playerId);
  return playerId;
}

function readSnapshot(): IslandSnapshot | null {
  const serialized = safeStorageRead(islandRules.storageKey);
  if (serialized === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(serialized);
    return isIslandSnapshot(value) ? value : null;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: IslandSnapshot): void {
  safeStorageWrite(islandRules.storageKey, JSON.stringify(snapshot));
}

function clearSnapshot(): void {
  try {
    window.localStorage.removeItem(islandRules.storageKey);
  } catch {
    // Private browsing may deny local storage; the current session still works.
  }
}

function safeStorageRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageWrite(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Persistence is optional when storage is unavailable.
  }
}

function createPlayerId(): string {
  const random = new Uint32Array(2);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(random);
  } else {
    random[0] = Math.floor(Math.random() * 0xffffffff);
    random[1] = Math.floor(Math.random() * 0xffffffff);
  }
  return `local-${random[0]?.toString(16)}${random[1]?.toString(16)}`;
}

function isIslandSnapshot(value: unknown): value is IslandSnapshot {
  if (!isRecord(value) || value.schemaVersion !== islandRules.schemaVersion) {
    return false;
  }
  if (!isRecord(value.profile) || !isRecord(value.blueprint)) {
    return false;
  }
  return value.onboardingCompleted === true
    && typeof value.profile.playerId === 'string'
    && typeof value.blueprint.seed === 'number'
    && Array.isArray(value.blueprint.coastline)
    && Array.isArray(value.blueprint.portals);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
