export const parkingQualityIds = {
  low: 'low',
  medium: 'medium',
  high: 'high',
} as const;

export type ParkingQualityId = typeof parkingQualityIds[keyof typeof parkingQualityIds];

export interface ParkingQualityProfile {
  readonly id: ParkingQualityId;
  readonly maximumPixelRatio: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  readonly queueVisibleLimit: number;
  readonly decorationDensity: number;
}

export const parkingQualityProfiles: Readonly<Record<ParkingQualityId, ParkingQualityProfile>> = {
  [parkingQualityIds.low]: {
    id: parkingQualityIds.low,
    maximumPixelRatio: 1,
    shadows: false,
    shadowMapSize: 512,
    queueVisibleLimit: 30,
    decorationDensity: 0.45,
  },
  [parkingQualityIds.medium]: {
    id: parkingQualityIds.medium,
    maximumPixelRatio: 1.25,
    shadows: true,
    shadowMapSize: 512,
    queueVisibleLimit: 45,
    decorationDensity: 0.72,
  },
  [parkingQualityIds.high]: {
    id: parkingQualityIds.high,
    maximumPixelRatio: 1.6,
    shadows: true,
    shadowMapSize: 1024,
    queueVisibleLimit: 60,
    decorationDensity: 1,
  },
};

export function resolveParkingQuality(
  search: string = typeof location === 'undefined' ? '' : location.search,
  runtimeNavigator: Navigator | null = typeof navigator === 'undefined' ? null : navigator,
): ParkingQualityProfile {
  const requested = new URLSearchParams(search).get('quality');
  if (isParkingQualityId(requested)) {
    return parkingQualityProfiles[requested];
  }

  const device = runtimeNavigator as (Navigator & { readonly deviceMemory?: number }) | null;
  const memory = device?.deviceMemory ?? 8;
  const cores = device?.hardwareConcurrency ?? 8;
  if (memory <= 4 || cores <= 4) {
    return parkingQualityProfiles[parkingQualityIds.low];
  }
  if (memory >= 12 && cores >= 10) {
    return parkingQualityProfiles[parkingQualityIds.high];
  }
  return parkingQualityProfiles[parkingQualityIds.medium];
}

function isParkingQualityId(value: string | null): value is ParkingQualityId {
  return value !== null && Object.hasOwn(parkingQualityProfiles, value);
}
