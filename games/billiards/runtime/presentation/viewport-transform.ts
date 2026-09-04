import type { Vec2 } from '../domain/types.ts';
import { billiardsView } from './registry.ts';

export const billiardsOrientations = {
  landscape: 'landscape',
  portrait: 'portrait',
} as const;

export type BilliardsOrientation =
  typeof billiardsOrientations[keyof typeof billiardsOrientations];

const billiardsCoordinateSpace = {
  worldWidth: 254,
  worldHeight: 127,
} as const;

export function currentBilliardsOrientation(): BilliardsOrientation {
  return window.innerHeight > window.innerWidth
    ? billiardsOrientations.portrait
    : billiardsOrientations.landscape;
}

export function clientPointToCanonicalCanvas(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  orientation = currentBilliardsOrientation(),
): Vec2 {
  const rect = canvas.getBoundingClientRect();
  const normalizedX = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
  const normalizedY = rect.height <= 0 ? 0 : (clientY - rect.top) / rect.height;
  if (orientation === billiardsOrientations.portrait) {
    return {
      x: normalizedY * billiardsView.canvasWidth,
      y: (1 - normalizedX) * billiardsView.canvasHeight,
    };
  }
  return {
    x: normalizedX * billiardsView.canvasWidth,
    y: normalizedY * billiardsView.canvasHeight,
  };
}

export function canonicalCanvasPointToWorld(point: Vec2): Vec2 {
  return {
    x: (point.x - billiardsView.table.left)
      / billiardsView.table.width
      * billiardsCoordinateSpace.worldWidth,
    y: (point.y - billiardsView.table.top)
      / billiardsView.table.height
      * billiardsCoordinateSpace.worldHeight,
  };
}

export function configureBilliardsCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  resolutionScale: number,
  maximumDevicePixelRatio: number,
  orientation = currentBilliardsOrientation(),
): number {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width);
  const deviceScale = Math.min(
    maximumDevicePixelRatio,
    Math.max(1, window.devicePixelRatio || 1),
  );
  const canonicalWidth = orientation === billiardsOrientations.portrait
    ? billiardsView.canvasHeight
    : billiardsView.canvasWidth;
  const canonicalHeight = orientation === billiardsOrientations.portrait
    ? billiardsView.canvasWidth
    : billiardsView.canvasHeight;
  const backingWidth = Math.max(
    1,
    Math.round(cssWidth * deviceScale * resolutionScale),
  );
  const backingHeight = Math.max(
    1,
    Math.round(backingWidth * canonicalHeight / canonicalWidth),
  );
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }
  const scale = backingWidth / canonicalWidth;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, backingWidth, backingHeight);
  if (orientation === billiardsOrientations.portrait) {
    context.setTransform(0, scale, -scale, 0, billiardsView.canvasHeight * scale, 0);
  } else {
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }
  canvas.style.aspectRatio = orientation === billiardsOrientations.portrait
    ? `${billiardsView.canvasHeight} / ${billiardsView.canvasWidth}`
    : `${billiardsView.canvasWidth} / ${billiardsView.canvasHeight}`;
  canvas.dataset.billiardsOrientation = orientation;
  return scale;
}
