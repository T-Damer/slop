import type { Vec2 } from '../domain/types.ts';
import { billiardsView } from './registry.ts';
export interface CameraPose { readonly x: number; readonly y: number; readonly zoom: number }
export const cameraTuning = {
  centre: { x: billiardsView.canvasWidth / 2, y: billiardsView.canvasHeight / 2 },
  bounds: { left: 68, right: 1212, top: 43, bottom: 677 },
  cancelGestureEvent: 'billiards-camera-gesture',
  minZoom: 1, maxZoom: 2.6, aimZoom: 2.25, focusMargin: 64,
  easingPerSecond: 12, settleEpsilon: 0.001, pinchMinimum: 8,
} as const;
export function cameraScale(width: number, height: number, portrait: boolean): number {
  const bounds = cameraTuning.bounds;
  const w = bounds.right - bounds.left, h = bounds.bottom - bounds.top;
  return Math.max(0.001, Math.min(width / (portrait ? h : w), height / (portrait ? w : h)));
}
export function rotateCameraPoint(point: Vec2, portrait: boolean, inverse = false): Vec2 {
  return !portrait ? point : inverse ? { x: point.y, y: -point.x } : { x: -point.y, y: point.x };
}
export function clampCamera(pose: CameraPose, width: number, height: number, portrait: boolean): CameraPose {
  const zoom = Math.min(cameraTuning.maxZoom, Math.max(cameraTuning.minZoom, pose.zoom));
  const scale = cameraScale(width, height, portrait) * zoom;
  const halfX = (portrait ? height : width) / scale / 2;
  const halfY = (portrait ? width : height) / scale / 2;
  const b = cameraTuning.bounds;
  const clamp = (v: number, low: number, high: number) => low > high ? (low + high) / 2 : Math.min(high, Math.max(low, v));
  return { zoom, x: clamp(pose.x, b.left + halfX, b.right - halfX), y: clamp(pose.y, b.top + halfY, b.bottom - halfY) };
}
export function screenToScene(point: Vec2, pose: CameraPose, width: number, height: number, portrait: boolean): Vec2 {
  const scale = cameraScale(width, height, portrait) * pose.zoom;
  const p = rotateCameraPoint({ x: (point.x - width / 2) / scale, y: (point.y - height / 2) / scale }, portrait, true);
  return { x: p.x + pose.x, y: p.y + pose.y };
}
