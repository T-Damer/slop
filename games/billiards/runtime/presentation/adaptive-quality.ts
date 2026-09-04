export const billiardsQualityTiers = {
  balanced: 'balanced',
  high: 'high',
  low: 'low',
} as const;

export type BilliardsQualityTier =
  typeof billiardsQualityTiers[keyof typeof billiardsQualityTiers];

export interface BilliardsQualityProfile {
  readonly tier: BilliardsQualityTier;
  readonly resolutionScale: number;
  readonly maximumDevicePixelRatio: number;
  readonly minimumRenderIntervalMs: number;
  readonly drawAtmosphere: boolean;
  readonly drawImpactEffects: boolean;
  readonly drawDetailedLighting: boolean;
}

export interface BilliardsQualitySnapshot extends BilliardsQualityProfile {
  readonly averageFrameMilliseconds: number;
  readonly stallCount: number;
  readonly downgradeCount: number;
  readonly upgradeCount: number;
}

const qualityProfiles: Readonly<Record<BilliardsQualityTier, BilliardsQualityProfile>> = {
  high: {
    tier: billiardsQualityTiers.high,
    resolutionScale: 1,
    maximumDevicePixelRatio: 1.6,
    minimumRenderIntervalMs: 0,
    drawAtmosphere: true,
    drawImpactEffects: true,
    drawDetailedLighting: true,
  },
  balanced: {
    tier: billiardsQualityTiers.balanced,
    resolutionScale: 0.82,
    maximumDevicePixelRatio: 1.25,
    minimumRenderIntervalMs: 20,
    drawAtmosphere: true,
    drawImpactEffects: true,
    drawDetailedLighting: false,
  },
  low: {
    tier: billiardsQualityTiers.low,
    resolutionScale: 0.66,
    maximumDevicePixelRatio: 1,
    minimumRenderIntervalMs: 32,
    drawAtmosphere: false,
    drawImpactEffects: false,
    drawDetailedLighting: false,
  },
};

const qualityTuning = {
  frameAverageWeight: 0.09,
  initialFrameMilliseconds: 16.7,
  balancedThresholdMs: 22,
  lowThresholdMs: 31,
  recoverThresholdMs: 17.5,
  downgradeSamples: 24,
  upgradeSamples: 360,
  stallThresholdMs: 700,
  hardwareLowCores: 4,
  hardwareBalancedCores: 8,
  memoryLowGigabytes: 4,
  memoryBalancedGigabytes: 8,
} as const;

interface NavigatorWithMemory extends Navigator {
  readonly deviceMemory?: number;
}

export class AdaptiveBilliardsQuality {
  private tier = initialTier();
  private averageFrameMilliseconds = qualityTuning.initialFrameMilliseconds;
  private lastFrameMs = 0;
  private lastRenderMs = 0;
  private slowSamples = 0;
  private stableSamples = 0;
  private stallCount = 0;
  private downgradeCount = 0;
  private upgradeCount = 0;

  public sample(nowMs: number): BilliardsQualitySnapshot {
    if (this.lastFrameMs > 0) {
      const elapsed = Math.max(0, nowMs - this.lastFrameMs);
      if (elapsed >= qualityTuning.stallThresholdMs && document.visibilityState === 'visible') {
        this.stallCount += 1;
        this.downgrade();
      } else if (elapsed < 250) {
        this.averageFrameMilliseconds = mix(
          this.averageFrameMilliseconds,
          elapsed,
          qualityTuning.frameAverageWeight,
        );
        this.updateTierSamples();
      }
    }
    this.lastFrameMs = nowMs;
    return this.snapshot();
  }

  public shouldRender(nowMs: number): boolean {
    const profile = qualityProfiles[this.tier];
    if (nowMs - this.lastRenderMs < profile.minimumRenderIntervalMs) {
      return false;
    }
    this.lastRenderMs = nowMs;
    return true;
  }

  public resetFrameClock(nowMs = performance.now()): void {
    this.lastFrameMs = nowMs;
    this.lastRenderMs = 0;
    this.slowSamples = 0;
  }

  public snapshot(): BilliardsQualitySnapshot {
    return {
      ...qualityProfiles[this.tier],
      averageFrameMilliseconds: this.averageFrameMilliseconds,
      stallCount: this.stallCount,
      downgradeCount: this.downgradeCount,
      upgradeCount: this.upgradeCount,
    };
  }

  private updateTierSamples(): void {
    const slowThreshold = this.tier === billiardsQualityTiers.high
      ? qualityTuning.balancedThresholdMs
      : qualityTuning.lowThresholdMs;
    if (this.averageFrameMilliseconds > slowThreshold) {
      this.slowSamples += 1;
      this.stableSamples = 0;
      if (this.slowSamples >= qualityTuning.downgradeSamples) {
        this.downgrade();
      }
      return;
    }
    this.slowSamples = 0;
    if (this.averageFrameMilliseconds < qualityTuning.recoverThresholdMs) {
      this.stableSamples += 1;
      if (this.stableSamples >= qualityTuning.upgradeSamples) {
        this.upgrade();
      }
    } else {
      this.stableSamples = 0;
    }
  }

  private downgrade(): void {
    const next = this.tier === billiardsQualityTiers.high
      ? billiardsQualityTiers.balanced
      : billiardsQualityTiers.low;
    if (next !== this.tier) {
      this.tier = next;
      this.downgradeCount += 1;
    }
    this.slowSamples = 0;
    this.stableSamples = 0;
  }

  private upgrade(): void {
    const next = this.tier === billiardsQualityTiers.low
      ? billiardsQualityTiers.balanced
      : billiardsQualityTiers.high;
    if (next !== this.tier) {
      this.tier = next;
      this.upgradeCount += 1;
    }
    this.slowSamples = 0;
    this.stableSamples = 0;
  }
}

function initialTier(): BilliardsQualityTier {
  const memory = (navigator as NavigatorWithMemory).deviceMemory;
  const cores = navigator.hardwareConcurrency || qualityTuning.hardwareBalancedCores;
  if (
    cores <= qualityTuning.hardwareLowCores
    || (memory !== undefined && memory <= qualityTuning.memoryLowGigabytes)
  ) {
    return billiardsQualityTiers.low;
  }
  if (
    cores <= qualityTuning.hardwareBalancedCores
    || (memory !== undefined && memory <= qualityTuning.memoryBalancedGigabytes)
  ) {
    return billiardsQualityTiers.balanced;
  }
  return billiardsQualityTiers.high;
}

function mix(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}
