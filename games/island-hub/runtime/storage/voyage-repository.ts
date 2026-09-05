import { createVoyageState, type VoyageState } from '../domain/voyage-registry.ts';
import { validateVoyage } from '../domain/voyage-validation.ts';
import type { IslandBlueprint } from '../domain/types.ts';

export const voyageStorage = { key: 'slop.voyage.v1:', backup: 'slop.voyage.backup.v1:' } as const;
export function loadVoyage(home: IslandBlueprint): { state: VoyageState; warning: boolean } {
  try {
    const raw = localStorage.getItem(voyageStorage.key + home.islandId);
    if (raw === null) return { state: createVoyageState(), warning: false };
    const state = validateVoyage(JSON.parse(raw), home);
    return { state: state ?? createVoyageState(), warning: state === null };
  } catch { return { state: createVoyageState(), warning: true }; }
}
export function saveVoyage(home: IslandBlueprint, state: VoyageState): boolean {
  if (validateVoyage(state, home) === null) return false;
  try {
    const key = voyageStorage.key + home.islandId;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      let valid = false;
      try { valid = validateVoyage(JSON.parse(raw), home) !== null; } catch { /* Preserve malformed data before replacement. */ }
      if (!valid) localStorage.setItem(voyageStorage.backup + home.islandId, raw);
    }
    localStorage.setItem(key, JSON.stringify(state)); return true;
  } catch { return false; }
}
export function clearVoyage(id: string): void {
  try { localStorage.removeItem(voyageStorage.key + id); } catch { /* Do not remove the backup. */ }
}
