import { createHomeState, type HomeState } from '../domain/home-registry.ts';
import { decodeHomeState } from '../domain/home.ts';

const homeStorage = { prefix: 'slop.home.v1:', backupSuffix: ':unreadable-backup' } as const;

/** Additive sidecar; never rewrite v1 IslandBlueprint or its harvest journal. */
export function loadHome(islandId: string): { state: HomeState; warning: boolean } {
  try {
    const text = localStorage.getItem(homeStorage.prefix + islandId);
    if (text === null) return { state: createHomeState(), warning: false };
    const state = decodeHomeState(JSON.parse(text));
    return { state: state ?? createHomeState(), warning: state === null };
  } catch { return { state: createHomeState(), warning: true }; }
}
export function saveHome(islandId: string, state: HomeState): boolean {
  if (decodeHomeState(state) === null) return false;
  const key = homeStorage.prefix + islandId;
  try {
    const previous = localStorage.getItem(key);
    let valid = previous === null;
    if (previous !== null) {
      try { valid = decodeHomeState(JSON.parse(previous)) !== null; } catch { valid = false; }
      if (!valid) localStorage.setItem(key + homeStorage.backupSuffix, previous);
    }
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch { return false; }
}
export function clearHome(islandId: string): void {
  try { localStorage.removeItem(homeStorage.prefix + islandId); } catch { /* Keep the existing home on storage failure. */ }
}
