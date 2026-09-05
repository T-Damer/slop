import { billiardsPhysics } from './registry.ts';

export const billiardsPresetIds = { american: 'american', russian: 'russian' } as const;
export type BilliardsPresetId = typeof billiardsPresetIds[keyof typeof billiardsPresetIds];

/** Both tables use the same 2:1 canonical plane. Dimensions in centimetres only
 * define ratios, not a second world coordinate system. These are gameplay
 * presets, NOT certified tournament tables or a second set of rules. */
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
    cornerRadius: 7.6 / 2 * billiardsPhysics.tableWidth / 356.8,
    sideRadius: 8.2 / 2 * billiardsPhysics.tableWidth / 356.8,
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
