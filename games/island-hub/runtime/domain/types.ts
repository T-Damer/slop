import type {
  islandCameraModes,
  islandDestinationIds,
  islandGenerationStages,
  islandPreferenceIds,
} from './registry.ts';

type ArrayValue<T extends readonly unknown[]> = T[number];

export type IslandColorId = ArrayValue<typeof islandPreferenceIds.color>;
export type IslandMusicId = ArrayValue<typeof islandPreferenceIds.music>;
export type IslandActivityId = ArrayValue<typeof islandPreferenceIds.activity>;
export type IslandWeatherId = ArrayValue<typeof islandPreferenceIds.weather>;
export type IslandSeasonId = ArrayValue<typeof islandPreferenceIds.season>;
export type IslandLivingStyleId = ArrayValue<typeof islandPreferenceIds.livingStyle>;
export type IslandAnimalId = ArrayValue<typeof islandPreferenceIds.animal>;
export type IslandCameraMode = ArrayValue<typeof islandCameraModes>;
export type IslandGenerationStageId = typeof islandGenerationStages[number]['id'];
export type IslandDestinationId = typeof islandDestinationIds[keyof typeof islandDestinationIds];

export interface IslandPreferences {
  readonly color: IslandColorId;
  readonly music: IslandMusicId;
  readonly activity: IslandActivityId;
  readonly weather: IslandWeatherId;
  readonly season: IslandSeasonId;
  readonly livingStyle: IslandLivingStyleId;
  readonly animal: IslandAnimalId;
}

export interface AvatarAppearance {
  readonly bodyModelId: string;
  readonly skinToneId: string;
  readonly hairStyleId: string;
  readonly hairColorId: string;
  readonly outfitPrimaryColorId: IslandColorId;
  readonly outfitSecondaryColorId: string;
  readonly accessoryId: string | null;
}

export interface PlayerProfile {
  readonly playerId: string;
  readonly displayName: string;
  readonly preferences: IslandPreferences;
  readonly appearance: AvatarAppearance;
}

export interface IslandPoint {
  readonly x: number;
  readonly z: number;
}

export interface IslandPlacement extends IslandPoint {
  readonly id: string;
  readonly scale: number;
  readonly rotation: number;
}

export interface IslandPalette {
  readonly grass: number;
  readonly sand: number;
  readonly ocean: number;
  readonly roof: number;
  readonly flowers: ReadonlyArray<number>;
  readonly sky: number;
}

export interface IslandPortalPlacement extends IslandPoint {
  readonly destinationId: IslandDestinationId;
  readonly label: string;
  readonly color: number;
}

export interface IslandBlueprint {
  readonly schemaVersion: 1;
  readonly islandId: string;
  readonly seed: number;
  readonly season: IslandSeasonId;
  readonly coastline: ReadonlyArray<number>;
  readonly palette: IslandPalette;
  readonly house: IslandPlacement;
  readonly playerSpawn: IslandPoint;
  readonly guideSpawn: IslandPoint;
  readonly trees: ReadonlyArray<IslandPlacement>;
  readonly rocks: ReadonlyArray<IslandPlacement>;
  readonly flowers: ReadonlyArray<IslandPlacement>;
  readonly animal: IslandPlacement & { readonly species: IslandAnimalId };
  readonly activityZone: IslandPlacement & { readonly activity: IslandActivityId };
  readonly portals: ReadonlyArray<IslandPortalPlacement>;
}

export interface IslandSnapshot {
  readonly schemaVersion: 1;
  readonly revision: number;
  readonly profile: PlayerProfile;
  readonly blueprint: IslandBlueprint;
  readonly onboardingCompleted: boolean;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface IslandRepository {
  readonly load: () => Promise<IslandSnapshot | null>;
  readonly save: (snapshot: IslandSnapshot) => Promise<void>;
  readonly clear: () => Promise<void>;
}

export interface IslandPortalProgress {
  readonly destinationId: IslandDestinationId | null;
  readonly progress: number;
}
