import { buildIslandBlueprint } from '../domain/generator.ts';
import { islandRules } from '../domain/registry.ts';
import type {
  IslandPreferences,
  IslandRepository,
  IslandSnapshot,
  PlayerProfile,
} from '../domain/types.ts';

export async function loadIslandSnapshot(
  repository: IslandRepository,
  forceOnboarding: boolean,
): Promise<IslandSnapshot | null> {
  if (forceOnboarding) {
    await repository.clear();
    return null;
  }
  return repository.load();
}

export async function createAndSaveIslandSnapshot(
  repository: IslandRepository,
  playerId: string,
  preferences: IslandPreferences,
): Promise<IslandSnapshot> {
  const now = new Date().toISOString();
  const profile = createProfile(playerId, preferences);
  const snapshot: IslandSnapshot = {
    schemaVersion: islandRules.schemaVersion,
    revision: 1,
    profile,
    blueprint: buildIslandBlueprint(playerId, preferences),
    onboardingCompleted: true,
    createdAtIso: now,
    updatedAtIso: now,
  };
  await repository.save(snapshot);
  return snapshot;
}

function createProfile(
  playerId: string,
  preferences: IslandPreferences,
): PlayerProfile {
  return {
    playerId,
    displayName: 'Исследователь',
    preferences,
    appearance: {
      bodyModelId: 'friendly-local-v1',
      skinToneId: 'warm-medium',
      hairStyleId: 'soft-short',
      hairColorId: 'chestnut',
      outfitPrimaryColorId: preferences.color,
      outfitSecondaryColorId: 'cream',
      accessoryId: null,
    },
  };
}
