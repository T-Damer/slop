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

export function pointerToCanvas(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Vec2 {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (clientX - bounds.left) * billiardsView.canvasWidth / Math.max(1, bounds.width),
    y: (clientY - bounds.top) * billiardsView.canvasHeight / Math.max(1, bounds.height),
  };
}
