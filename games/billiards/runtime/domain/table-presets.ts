import { billiardsPhysics } from './registry.ts';

export const billiardsPresetIds = { american: 'american', russian: 'russian' } as const;
export type BilliardsPresetId = typeof billiardsPresetIds[keyof typeof billiardsPresetIds];

/** Both tables use the same 2:1 canonical plane. Dimensions in centimetres only
 * define ratios, not a second world coordinate system. These are gameplay
 * presets, NOT certified tournament tables. Rule resolution is domain-owned. */
export const billiardsTablePresets = {
  american: {
    id: billiardsPresetIds.american,
    ballRadius: billiardsPhysics.ballRadius,
    cornerGap: billiardsPhysics.cornerMouthHalfWidth,
    sideGap: billiardsPhysics.sideMouthHalfWidth,
    cornerRadius: billiardsPhysics.cornerPocketRadius,
    sideRadius: billiardsPhysics.sidePocketRadius,
    gatedPockets: false,
  },
  russian: {
    id: billiardsPresetIds.russian,
    ballRadius: 3.4 * billiardsPhysics.tableWidth / 356.8,
    cornerGap: 7.6 / Math.SQRT2 * billiardsPhysics.tableWidth / 356.8,
    sideGap: 8.2 / 2 * billiardsPhysics.tableWidth / 356.8,
    // A roomy bowl behind a tight mouth: the jaws, not a tiny sink circle,
    // reject oblique shots. Capture remains gated by the mouth plane.
    cornerRadius: 5.8 * billiardsPhysics.tableWidth / 356.8,
    sideRadius: 6.0 * billiardsPhysics.tableWidth / 356.8,
    gatedPockets: true,
  },
} as const;
export type BilliardsTablePreset = typeof billiardsTablePresets[BilliardsPresetId];

export function isBilliardsPresetId(value: unknown): value is BilliardsPresetId {
  return value === billiardsPresetIds.american || value === billiardsPresetIds.russian;
}

export function tablePreset(table: { readonly presetId?: BilliardsPresetId }): BilliardsTablePreset {
  return billiardsTablePresets[table.presetId ?? billiardsPresetIds.american];
}

export function cueBallId(table: { readonly presetId?: BilliardsPresetId; readonly cueBallId?: number }): number {
  return table.presetId === 'russian' ? table.cueBallId ?? 0 : 0;
}
