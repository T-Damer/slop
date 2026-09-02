import { billiardsPhysics, billiardsTableIds } from './registry.ts';
import type {
  BilliardsCushionLine,
  BilliardsJawPoint,
  BilliardsPocket,
  Vec2,
} from './types.ts';

export interface BilliardsTableModel {
  readonly pockets: ReadonlyArray<BilliardsPocket>;
  readonly cushions: ReadonlyArray<BilliardsCushionLine>;
  readonly jaws: ReadonlyArray<BilliardsJawPoint>;
}

const halfWidth = billiardsPhysics.tableWidth / 2;
const halfHeight = billiardsPhysics.tableHeight / 2;
const cornerGap = billiardsPhysics.cornerMouthHalfWidth;
const middleGap = billiardsPhysics.sideMouthHalfWidth;

export const billiardsTableModel: BilliardsTableModel = {
  pockets: createPockets(),
  cushions: createCushions(),
  jaws: createJaws(),
};

export const billiardsTableBounds = {
  left: -halfWidth,
  right: halfWidth,
  top: -halfHeight,
  bottom: halfHeight,
} as const;

function createPockets(): ReadonlyArray<BilliardsPocket> {
  const ids = billiardsTableIds.pockets;
  return [
    pocket(ids.topLeft, -halfWidth, -halfHeight, billiardsPhysics.cornerPocketRadius),
    pocket(ids.topMiddle, 0, -halfHeight, billiardsPhysics.sidePocketRadius),
    pocket(ids.topRight, halfWidth, -halfHeight, billiardsPhysics.cornerPocketRadius),
    pocket(ids.bottomLeft, -halfWidth, halfHeight, billiardsPhysics.cornerPocketRadius),
    pocket(ids.bottomMiddle, 0, halfHeight, billiardsPhysics.sidePocketRadius),
    pocket(ids.bottomRight, halfWidth, halfHeight, billiardsPhysics.cornerPocketRadius),
  ];
}

function createCushions(): ReadonlyArray<BilliardsCushionLine> {
  const ids = billiardsTableIds.cushions;
  return [
    cushion(ids.topLeft, point(-halfWidth + cornerGap, -halfHeight), point(-middleGap, -halfHeight), point(0, 1)),
    cushion(ids.topRight, point(middleGap, -halfHeight), point(halfWidth - cornerGap, -halfHeight), point(0, 1)),
    cushion(ids.bottomLeft, point(-middleGap, halfHeight), point(-halfWidth + cornerGap, halfHeight), point(0, -1)),
    cushion(ids.bottomRight, point(halfWidth - cornerGap, halfHeight), point(middleGap, halfHeight), point(0, -1)),
    cushion(ids.left, point(-halfWidth, halfHeight - cornerGap), point(-halfWidth, -halfHeight + cornerGap), point(1, 0)),
    cushion(ids.right, point(halfWidth, -halfHeight + cornerGap), point(halfWidth, halfHeight - cornerGap), point(-1, 0)),
  ];
}

function createJaws(): ReadonlyArray<BilliardsJawPoint> {
  const unique = new Map<string, Vec2>();
  for (const cushionLine of createCushions()) {
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
