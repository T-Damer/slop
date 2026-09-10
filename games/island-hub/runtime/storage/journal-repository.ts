import type { IslandJournal } from '../domain/life.ts';

const journalStorage = { key: 'slop.island-journal.v1:', maximumEntries: 128, maximumIdLength: 160 } as const;

/** Separate sidecar: existing v1 island/onboarding snapshots remain byte-compatible. */
export function loadIslandJournal(islandId: string): IslandJournal {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(journalStorage.key + islandId) ?? 'null');
    if (typeof raw !== 'object' || raw === null || !('completed' in raw)
      || !Array.isArray(raw.completed)) return { completed: [] };
    return { completed: raw.completed.slice(0, journalStorage.maximumEntries)
      .filter((id): id is string => typeof id === 'string' && id.length <= journalStorage.maximumIdLength) };
  } catch { return { completed: [] }; }
}
export function saveIslandJournal(islandId: string, journal: IslandJournal): boolean {
  try {
    localStorage.setItem(journalStorage.key + islandId, JSON.stringify(journal));
    return true;
  } catch { return false; }
}
export function clearIslandJournal(islandId: string): void {
  try { localStorage.removeItem(journalStorage.key + islandId); } catch { /* Storage may be disabled. */ }
}
