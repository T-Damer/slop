import { billiardsTablePresets, tablePreset, type BilliardsTablePreset } from './table-presets.ts';
import { billiardsPhysics, billiardsTableIds } from './registry.ts';
import type {
  BilliardsCushionLine,
  BilliardsJawPoint,
  BilliardsPocket,
  Vec2,
  BilliardsTableState,
} from './types.ts';

export interface BilliardsTableModel {
  readonly ballRadius: number;
  readonly pockets: ReadonlyArray<BilliardsPocket>;
  readonly cushions: ReadonlyArray<BilliardsCushionLine>;
  readonly jaws: ReadonlyArray<BilliardsJawPoint>;
}

const halfWidth = billiardsPhysics.tableWidth / 2;
const halfHeight = billiardsPhysics.tableHeight / 2;
const models = {
  american: createTableModel(billiardsTablePresets.american),
  russian: createTableModel(billiardsTablePresets.russian),
};
export const billiardsTableModel = models.american;
export function tableModelFor(table: Pick<BilliardsTableState, 'presetId'>): BilliardsTableModel {
  return models[tablePreset(table).id];
}

function createTableModel(preset: BilliardsTablePreset): BilliardsTableModel {
  return { ballRadius: preset.ballRadius, pockets: createPockets(preset),
    cushions: createCushions(preset), jaws: createJaws(preset) };
}

export const billiardsTableBounds = {
  left: -halfWidth,
  right: halfWidth,
  top: -halfHeight,
  bottom: halfHeight,
} as const;

function createPockets(preset: BilliardsTablePreset): ReadonlyArray<BilliardsPocket> {
  const ids = billiardsTableIds.pockets;
  return [
    pocket(ids.topLeft, -halfWidth, -halfHeight, preset.cornerRadius),
    pocket(ids.topMiddle, 0, -halfHeight, preset.sideRadius),
    pocket(ids.topRight, halfWidth, -halfHeight, preset.cornerRadius),
    pocket(ids.bottomLeft, -halfWidth, halfHeight, preset.cornerRadius),
    pocket(ids.bottomMiddle, 0, halfHeight, preset.sideRadius),
    pocket(ids.bottomRight, halfWidth, halfHeight, preset.cornerRadius),
  ].map((entry) => {
    if (!preset.gatedPockets) return entry;
    const middle = entry.center.x === 0;
    const outwardNormal = middle ? point(0, Math.sign(entry.center.y))
      : point(Math.sign(entry.center.x) / Math.SQRT2, Math.sign(entry.center.y) / Math.SQRT2);
    const distance = middle ? 0 : preset.cornerGap / Math.SQRT2;
    return { ...entry, mouth: { outwardNormal, center: {
      x: entry.center.x - outwardNormal.x * distance,
      y: entry.center.y - outwardNormal.y * distance,
    } } };
  });
}

function createCushions(preset: BilliardsTablePreset): ReadonlyArray<BilliardsCushionLine> {
  const ids = billiardsTableIds.cushions;
  const cornerGap = preset.cornerGap;
  const middleGap = preset.sideGap;
  return [
    cushion(ids.topLeft, point(-halfWidth + cornerGap, -halfHeight), point(-middleGap, -halfHeight), point(0, 1)),
    cushion(ids.topRight, point(middleGap, -halfHeight), point(halfWidth - cornerGap, -halfHeight), point(0, 1)),
    cushion(ids.bottomLeft, point(-middleGap, halfHeight), point(-halfWidth + cornerGap, halfHeight), point(0, -1)),
    cushion(ids.bottomRight, point(halfWidth - cornerGap, halfHeight), point(middleGap, halfHeight), point(0, -1)),
    cushion(ids.left, point(-halfWidth, halfHeight - cornerGap), point(-halfWidth, -halfHeight + cornerGap), point(1, 0)),
    cushion(ids.right, point(halfWidth, -halfHeight + cornerGap), point(halfWidth, halfHeight - cornerGap), point(-1, 0)),
  ];
}

function createJaws(preset: BilliardsTablePreset): ReadonlyArray<BilliardsJawPoint> {
  const unique = new Map<string, Vec2>();
  for (const cushionLine of createCushions(preset)) {
    unique.set(pointKey(cushionLine.start), cushionLine.start);
    unique.set(pointKey(cushionLine.end), cushionLine.end);
  }
  return [...unique.values()].map((jaw, index) => ({
    id: `jaw-${index}`,
    point: jaw,
  }));
}

function pointKey(value: Vec2): string {
  return `${value.x}:${value.y}`;
}

function point(x: number, y: number): Vec2 {
  return { x, y };
}

function pocket(id: string, x: number, y: number, radius: number): BilliardsPocket {
  return { id, center: point(x, y), radius };
}

function cushion(
  id: string,
  start: Vec2,
  end: Vec2,
  inwardNormal: Vec2,
): BilliardsCushionLine {
  return { id, start, end, inwardNormal };
}
