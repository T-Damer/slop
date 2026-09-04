import { billiardsPhysics } from '../domain/registry.ts';
import type { Vec2 } from '../domain/types.ts';
import { billiardsView } from './registry.ts';

const tableCenter = {
  x: billiardsView.table.left + billiardsView.table.width / 2,
  y: billiardsView.table.top + billiardsView.table.height / 2,
} as const;
const tableScale = billiardsView.table.width / billiardsPhysics.tableWidth;

export function worldToCanvas(point: Vec2): Vec2 {
  return {
    x: tableCenter.x + point.x * tableScale,
    y: tableCenter.y + point.y * tableScale,
  };
}

export function canvasToWorld(point: Vec2): Vec2 {
  return {
    x: (point.x - tableCenter.x) / tableScale,
    y: (point.y - tableCenter.y) / tableScale,
  };
}

export function worldLengthToCanvas(length: number): number {
  return length * tableScale;
}

export interface BilliardsPointerBounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function clientToCanvas(
  bounds: BilliardsPointerBounds,
  point: Vec2,
  portrait: boolean,
): Vec2 | null {
  if (bounds.width <= 0 || bounds.height <= 0
    || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const x = (point.x - bounds.left) / bounds.width;
  const y = (point.y - bounds.top) / bounds.height;
  // Do not clamp: a captured cue gesture must keep moving outside the table.
  return portrait
    ? { x: y * billiardsView.canvasWidth, y: (1 - x) * billiardsView.canvasHeight }
    : { x: x * billiardsView.canvasWidth, y: y * billiardsView.canvasHeight };
}

export function pointerToCanvas(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  portrait = false,
): Vec2 {
  return clientToCanvas(canvas.getBoundingClientRect(),
    { x: clientX, y: clientY }, portrait) ?? tableCenter;
}
