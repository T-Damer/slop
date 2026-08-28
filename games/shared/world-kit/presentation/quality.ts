export const worldQualityIds = {
  low: 'low',
  medium: 'medium',
  high: 'high',
} as const;

export type WorldQualityId = typeof worldQualityIds[keyof typeof worldQualityIds];

export interface WorldQualityProfile {
  readonly id: WorldQualityId;
  readonly maximumPixelRatio: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  readonly decorationDensity: number;
}

export const worldQualityProfiles: Readonly<Record<WorldQualityId, WorldQualityProfile>> = {
  [worldQualityIds.low]: {
    id: worldQualityIds.low,
    maximumPixelRatio: 1,
    shadows: false,
    shadowMapSize: 512,
    decorationDensity: 0.5,
  },
  [worldQualityIds.medium]: {
    id: worldQualityIds.medium,
    maximumPixelRatio: 1.25,
    shadows: true,
    shadowMapSize: 512,
    decorationDensity: 0.75,
  },
  [worldQualityIds.high]: {
    id: worldQualityIds.high,
    maximumPixelRatio: 1.6,
    shadows: true,
    shadowMapSize: 1024,
    decorationDensity: 1,
  },
};

export function resolveWorldQuality(
  search: string = typeof location === 'undefined' ? '' : location.search,
  runtimeNavigator: Navigator | null = typeof navigator === 'undefined' ? null : navigator,
): WorldQualityProfile {
  const requested = new URLSearchParams(search).get('quality');
  if (isWorldQualityId(requested)) {
    return worldQualityProfiles[requested];
  }
  const device = runtimeNavigator as (Navigator & { readonly deviceMemory?: number }) | null;
  const memory = device?.deviceMemory ?? 8;
  const cores = device?.hardwareConcurrency ?? 8;
  if (memory <= 4 || cores <= 4) {
    return worldQualityProfiles[worldQualityIds.low];
  }
  if (memory >= 12 && cores >= 10) {
    return worldQualityProfiles[worldQualityIds.high];
  }
  return worldQualityProfiles[worldQualityIds.medium];
}

function isWorldQualityId(value: string | null): value is WorldQualityId {
  return value !== null && Object.hasOwn(worldQualityProfiles, value);
}
