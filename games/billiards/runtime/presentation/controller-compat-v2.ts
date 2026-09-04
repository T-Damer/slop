import type { Vec2 } from '../domain/types.ts';
import { BilliardsGameControllerV2 } from './controller-v2.ts';

declare module './controller-v2.ts' {
  interface BilliardsGameControllerV2 {
    placeCue(point: Vec2): boolean;
  }
}

BilliardsGameControllerV2.prototype.placeCue = function placeCue(
  point: Vec2,
): boolean {
  this.setPlacementPreview(point);
  return this.confirmCuePlacement();
};
