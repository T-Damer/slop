import { graphicsSettings, prefersReducedMotion } from '../../../shared/game-shell/graphics-settings.ts';
import { BilliardsTableCamera } from './table-camera.ts';
import { BilliardsPocketJourney } from './pocket-journey.ts';
import {
  createEffect,
  createRoot,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';

import { BilliardsAdaptiveQuality } from './adaptive-quality-v2.ts';
import { BilliardsAudioEngine } from './audio.ts';
import { BilliardsCanvasRendererV2 } from './canvas-renderer-v2.ts';
import { bindBilliardsControlsV2 } from './control-input-v2.ts';
import {
  BilliardsGameControllerV2,
  type BilliardsControllerSnapshotV2,
} from './controller-v2.ts';
import { BilliardsEffectsRenderer } from './effects-renderer.ts';
import { BilliardsFrameLoop } from './frame-loop-v2.ts';
import { billiardsCopy, billiardsUiIds } from './registry.ts';
import './pocket-club.css';
import { createBilliardsViewElements } from './view-elements.ts';
import { updateBilliardsViewV2 } from './view-state-v2.ts';

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

let disposeSolidRoot: (() => void) | null = null;

export function mountBilliards(parent: HTMLElement): void {
  unmountBilliards();
  // The view owns one stable DOM element, not a reconciled JSX collection.
  // Keep Solid signals/lifecycle without shipping the unused DOM reconciler.
  createRoot((dispose) => {
    disposeSolidRoot = dispose;
    parent.append(createBilliardsAppV2());
  });
}

export function unmountBilliards(): void {
  disposeSolidRoot?.();
  disposeSolidRoot = null;
  document.getElementById(billiardsUiIds.root)?.remove();
  document.getElementById(billiardsUiIds.style)?.remove();
  delete window.__SLOP_BILLIARDS_QA_V2__;
}

function createBilliardsAppV2(): HTMLElement {
  const view = createBilliardsViewElements();
  const controller = new BilliardsGameControllerV2();
  const effects = new BilliardsEffectsRenderer();
  const audio = new BilliardsAudioEngine();
  const pockets = new BilliardsPocketJourney();
  const renderer = new BilliardsCanvasRendererV2(view.canvas, effects, pockets);
  const camera = new BilliardsTableCamera(view.stage, view.canvas, controller, view.zoom);
  const quality = new BilliardsAdaptiveQuality();
  const orientation = matchMedia('(orientation: portrait)');
  const [snapshot, setSnapshot] = createSignal(controller.snapshot());
  const [soundEnabled, setSoundEnabled] = createSignal(audio.isEnabled());
  const [qualityMode, setQualityMode] = createSignal(quality.mode());
  const [portrait, setPortrait] = createSignal(orientation.matches);
  const unsubscribe = controller.subscribe(setSnapshot);
  const unsubscribeFeedback = controller.subscribeFeedback((batch) => {
    const nowMs = performance.now();
    effects.consume(batch, nowMs);
    pockets.consume(batch, controller.snapshot().match, nowMs, (id) => renderer.ballSprite(id));
    audio.consume(batch);
  });
  const removeControls = bindBilliardsControlsV2({
    view,
    controller,
    snapshot,
    audio,
    setSoundEnabled,
  });
  const removeOrientation = bindOrientation(orientation, setPortrait);
  const removeGraphics = graphicsSettings.subscribe(() => setQualityMode(quality.mode()));
  const frameLoop = new BilliardsFrameLoop({ onFrame: (nowMs, deltaSeconds) => {
    if (snapshot().match.activeShot !== null) quality.observe(deltaSeconds * 1000, nowMs);
    camera.advance(deltaSeconds);
    controller.advance(deltaSeconds);
    const mode = quality.mode();
    if (mode !== qualityMode()) setQualityMode(mode);
    pockets.synchronize(snapshot().match, view, nowMs);
    if (quality.shouldRender(nowMs)) renderer.draw({ snapshot: snapshot(), quality: mode,
      reducedMotion: prefersReducedMotion() }, nowMs);
  } });

  createEffect(() => {
    updateBilliardsViewV2(
      view,
      snapshot(),
      soundEnabled(),
      qualityMode(),
      portrait(),
    );
    camera.synchronize(snapshot());
    pockets.synchronize(snapshot().match, view, performance.now());
  });

  onMount(() => {
    document.title = `${billiardsCopy.title} · SLOP`;
    installQaBridge(controller, renderer, frameLoop, quality, snapshot, portrait, camera, pockets);
    frameLoop.start();
    // Public game is local-only for now; retain the optional SDK behind its adapter.
    void controller.start(location.origin);
    view.canvas.focus({ preventScroll: true });
  });

  onCleanup(() => {
    frameLoop.stop();
    camera.dispose(); pockets.clear(view); removeGraphics();
    unsubscribe();
    unsubscribeFeedback();
    removeControls();
    removeOrientation();
    delete window.__SLOP_BILLIARDS_QA_V2__;
    void audio.dispose();
    void controller.dispose();
  });

  return view.root;
}

function bindOrientation(
  media: MediaQueryList,
  update: (portrait: boolean) => void,
): () => void {
  const listener = (): void => update(media.matches);
  media.addEventListener('change', listener);
  window.addEventListener('orientationchange', listener);
  return () => {
    media.removeEventListener('change', listener);
    window.removeEventListener('orientationchange', listener);
  };
}

function installQaBridge(
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
