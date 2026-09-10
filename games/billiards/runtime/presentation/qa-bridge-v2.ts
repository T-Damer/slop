import type { BilliardsGameControllerV2, BilliardsControllerSnapshotV2 } from './controller-v2.ts';
import type { BilliardsCanvasRendererV2 } from './canvas-renderer-v2.ts';
import type { BilliardsFrameLoop } from './frame-loop-v2.ts';
import type { BilliardsAdaptiveQuality } from './adaptive-quality-v2.ts';
import type { BilliardsTableCamera } from './table-camera.ts';
import type { BilliardsPocketJourney } from './pocket-journey.ts';

interface BilliardsQaV2 {
  readonly schemaVersion: 3;
  readonly snapshot: () => {
    readonly controller: BilliardsControllerSnapshotV2;
    readonly frameLoop: ReturnType<BilliardsFrameLoop['snapshot']>;
    readonly quality: ReturnType<BilliardsAdaptiveQuality['snapshot']>;
    readonly renderer: ReturnType<BilliardsCanvasRendererV2['debugSnapshot']>;
    readonly portrait: boolean;
    readonly camera: ReturnType<BilliardsTableCamera['snapshot']>;
    readonly pockets: ReturnType<BilliardsPocketJourney['snapshot']>;
  };
  readonly primaryAction: () => boolean;
  readonly setPlacementPreview: (x: number, y: number) => void;
  readonly lockAim: () => boolean;
  readonly unlockAim: () => void;
}

declare global {
  interface Window {
    __SLOP_BILLIARDS_QA_V2__?: BilliardsQaV2;
  }
}

export function installQaBridge(
  controller: BilliardsGameControllerV2,
  renderer: BilliardsCanvasRendererV2,
  frameLoop: BilliardsFrameLoop,
  quality: BilliardsAdaptiveQuality,
  snapshot: () => BilliardsControllerSnapshotV2,
  portrait: () => boolean,
  camera: BilliardsTableCamera,
  pockets: BilliardsPocketJourney,
): void {
  if (new URLSearchParams(location.search).get('qa') !== '1') return;
  window.__SLOP_BILLIARDS_QA_V2__ = {
    schemaVersion: 3,
    snapshot: () => ({
      controller: snapshot(),
      frameLoop: frameLoop.snapshot(),
      quality: quality.snapshot(),
      renderer: renderer.debugSnapshot(performance.now()),
      portrait: portrait(),
      camera: camera.snapshot(),
      pockets: pockets.snapshot(performance.now()),
    }),
    primaryAction: () => controller.primaryAction(),
    setPlacementPreview: (x, y) => controller.setPlacementPreview({ x, y }),
    lockAim: () => controller.lockAim(),
    unlockAim: () => controller.unlockAim(),
  };
}
