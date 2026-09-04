export const billiardsQualityModes = {
  high: 'high',
  balanced: 'balanced',
  low: 'low',
} as const;

export type BilliardsQualityMode =
  typeof billiardsQualityModes[keyof typeof billiardsQualityModes];

export interface BilliardsQualitySnapshot {
  readonly mode: BilliardsQualityMode;
  readonly averageFrameMs: number;
  readonly longFrameCount: number;
  readonly downgradeCount: number;
  readonly upgradeCount: number;
}

const qualityTuning = {
  sampleCount: 48,
  highFrameBudgetMs: 20,
  balancedFrameBudgetMs: 29,
  longFrameMs: 90,
  downgradeCooldownMs: 1600,
  upgradeCooldownMs: 9000,
  highRenderIntervalMs: 0,
  balancedRenderIntervalMs: 1000 / 45,
  lowRenderIntervalMs: 1000 / 30,
} as const;

export class BilliardsAdaptiveQuality {
  private modeValue = initialQualityMode();
  private readonly samples: number[] = [];
  private longFrameCount = 0;
  private downgradeCount = 0;
  private upgradeCount = 0;
  private lastChangeMs = 0;
  private lastRenderMs = Number.NEGATIVE_INFINITY;

  public observe(frameMs: number, nowMs: number): void {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return;
    this.samples.push(Math.min(frameMs, 250));
    if (this.samples.length > qualityTuning.sampleCount) this.samples.shift();
    if (frameMs >= qualityTuning.longFrameMs) this.longFrameCount += 1;
    if (nowMs - this.lastChangeMs < qualityTuning.downgradeCooldownMs) return;
    const average = this.averageFrameMs();
    if (
      this.modeValue === billiardsQualityModes.high
      && (average > qualityTuning.highFrameBudgetMs || this.longFrameCount >= 3)
    ) {
      this.setMode(billiardsQualityModes.balanced, nowMs, false);
    } else if (
      this.modeValue === billiardsQualityModes.balanced
      && (average > qualityTuning.balancedFrameBudgetMs || this.longFrameCount >= 6)
    ) {
      this.setMode(billiardsQualityModes.low, nowMs, false);
    } else if (
      nowMs - this.lastChangeMs >= qualityTuning.upgradeCooldownMs
      && this.longFrameCount === 0
    ) {
      if (
        this.modeValue === billiardsQualityModes.low
        && average < qualityTuning.highFrameBudgetMs
      ) {
        this.setMode(billiardsQualityModes.balanced, nowMs, true);
      } else if (
        this.modeValue === billiardsQualityModes.balanced
        && average < 17.5
      ) {
        this.setMode(billiardsQualityModes.high, nowMs, true);
      }
    }
    if (this.samples.length >= qualityTuning.sampleCount) {
      this.longFrameCount = Math.max(0, this.longFrameCount - 1);
    }
  }

  public shouldRender(nowMs: number): boolean {
    const interval = this.modeValue === billiardsQualityModes.high
      ? qualityTuning.highRenderIntervalMs
      : this.modeValue === billiardsQualityModes.balanced
        ? qualityTuning.balancedRenderIntervalMs
        : qualityTuning.lowRenderIntervalMs;
    if (nowMs - this.lastRenderMs < interval) return false;
    this.lastRenderMs = nowMs;
    return true;
  }

  public mode(): BilliardsQualityMode {
    return this.modeValue;
  }

  public snapshot(): BilliardsQualitySnapshot {
    return {
      mode: this.modeValue,
      averageFrameMs: this.averageFrameMs(),
      longFrameCount: this.longFrameCount,
      downgradeCount: this.downgradeCount,
      upgradeCount: this.upgradeCount,
    };
  }

  private averageFrameMs(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
  }

  private setMode(
    mode: BilliardsQualityMode,
    nowMs: number,
    upgrade: boolean,
  ): void {
    if (mode === this.modeValue) return;
    this.modeValue = mode;
    this.lastChangeMs = nowMs;
    this.samples.length = 0;
    this.longFrameCount = 0;
    if (upgrade) this.upgradeCount += 1;
    else this.downgradeCount += 1;
  }
}

function initialQualityMode(): BilliardsQualityMode {
  const device = navigator as Navigator & { readonly deviceMemory?: number };
  const cores = navigator.hardwareConcurrency || 2;
  const memory = device.deviceMemory ?? 4;
  if (cores <= 2 || memory <= 2) return billiardsQualityModes.low;
  if (cores <= 4 || memory <= 4) return billiardsQualityModes.balanced;
  return billiardsQualityModes.high;
}
