import { graphicsSettings, prefersReducedMotion } from '../../../shared/game-shell/graphics-settings.ts';
import { BilliardsTableCamera } from './table-camera.ts';
import { BilliardsPocketJourney } from './pocket-journey.ts';
import { createRoot, onCleanup, type Setter } from 'solid-js';

import { BilliardsAdaptiveQuality, type BilliardsQualityMode } from './adaptive-quality-v2.ts';
import { BilliardsAudioEngine } from './audio.ts';
import { BilliardsCanvasRendererV2 } from './canvas-renderer-v2.ts';
import { bindBilliardsControlsV2 } from './control-input-v2.ts';
import { BilliardsGameControllerV2, type BilliardsControllerSnapshotV2 } from './controller-v2.ts';
import { BilliardsEffectsRenderer } from './effects-renderer.ts';
import { BilliardsFrameLoop } from './frame-loop-v2.ts';
import { billiardsCopy, billiardsUiIds } from './registry.ts';
import './pocket-club.css';
import { createBilliardsViewElements, type BilliardsViewElements } from './view-elements.ts';
import { updateBilliardsViewV2 } from './view-state-v2.ts';

interface BilliardsUiState {
  snapshot: BilliardsControllerSnapshotV2;
  soundEnabled: boolean;
  qualityMode: BilliardsQualityMode;
  portrait: boolean;
}

let disposeSolidRoot: (() => void) | null = null;

export function mountBilliards(parent: HTMLElement): void {
  unmountBilliards();
  createRoot((dispose) => {
    disposeSolidRoot = dispose;
    const view = createBilliardsViewElements();
    parent.append(view.root);
    onCleanup(() => view.root.remove());
    try {
      createBilliardsAppV2(view);
    } catch (error) {
      unmountBilliards();
      throw error;
    }
  });
}

export function unmountBilliards(): void {
  disposeSolidRoot?.();
  disposeSolidRoot = null;
  document.getElementById(billiardsUiIds.root)?.remove();
  document.getElementById(billiardsUiIds.style)?.remove();
  delete window.__SLOP_BILLIARDS_QA_V2__;
}

function createBilliardsAppV2(view: BilliardsViewElements): void {
  const cleanup: Array<() => void> = [];
  let disposed = false;
  onCleanup(() => {
    disposed = true;
    for (const remove of cleanup.reverse()) remove();
    delete window.__SLOP_BILLIARDS_QA_V2__;
  });
  const controller = new BilliardsGameControllerV2();
  cleanup.push(() => { void controller.dispose(); });
  const effects = new BilliardsEffectsRenderer();
  const audio = new BilliardsAudioEngine();
  cleanup.push(() => { void audio.dispose(); });
  const pockets = new BilliardsPocketJourney();
  cleanup.push(() => pockets.clear(view));
  const renderer = new BilliardsCanvasRendererV2(view.canvas, effects, pockets);
  const quality = new BilliardsAdaptiveQuality();
  const orientation = matchMedia('(orientation: portrait)');
  const state: BilliardsUiState = {
    snapshot: controller.snapshot(), soundEnabled: audio.isEnabled(),
    qualityMode: quality.mode(), portrait: orientation.matches,
  };
  const camera = new BilliardsTableCamera(view.stage, view.canvas, controller, view.zoom);
  cleanup.push(() => camera.dispose());
  const renderView = (): void => synchronizeView(view, state, camera, pockets);
  const refreshQuality = (): void => {
    const mode = quality.mode();
    if (mode === state.qualityMode) return;
    state.qualityMode = mode;
    renderView();
  };
  const frameLoop = new BilliardsFrameLoop({ onFrame: (nowMs, deltaSeconds) => {
    if (state.snapshot.match.activeShot !== null) quality.observe(deltaSeconds * 1000, nowMs);
    camera.advance(deltaSeconds);
    controller.advance(deltaSeconds);
    refreshQuality();
    pockets.synchronize(state.snapshot.match, view, nowMs);
    if (quality.shouldRender(nowMs)) renderer.draw({ snapshot: state.snapshot, quality: state.qualityMode,
      reducedMotion: prefersReducedMotion() }, nowMs);
  } });

  cleanup.push(() => frameLoop.stop());
  renderView();
  cleanup.push(controller.subscribe((snapshot) => { state.snapshot = snapshot; renderView(); }));
  cleanup.push(controller.subscribeFeedback((batch) => {
    const nowMs = performance.now();
    effects.consume(batch, nowMs);
    pockets.consume(batch, controller.snapshot().match, nowMs, (id) => renderer.ballSprite(id));
    audio.consume(batch);
  }));
  const setSoundEnabled = ((enabled: boolean): void => {
    state.soundEnabled = enabled;
    renderView();
  }) as Setter<boolean>;
  cleanup.push(bindBilliardsControlsV2({ view, controller, snapshot: () => state.snapshot, audio, setSoundEnabled }));
  cleanup.push(bindOrientation(orientation, (portrait) => { state.portrait = portrait; renderView(); }));
  cleanup.push(graphicsSettings.subscribe(refreshQuality));

  document.title = `${billiardsCopy.title} · SLOP`;
  if (new URLSearchParams(location.search).get('qa') === '1') {
    void import('./qa-bridge-v2.ts').then(({ installQaBridge }) => {
      if (!disposed) installQaBridge(controller, renderer, frameLoop, quality,
        () => state.snapshot, () => state.portrait, camera, pockets);
    });
  }
  frameLoop.start();
  void controller.start(location.origin);
  view.canvas.focus({ preventScroll: true });
}

function synchronizeView(
  view: BilliardsViewElements,
  state: BilliardsUiState,
  camera: BilliardsTableCamera,
  pockets: BilliardsPocketJourney,
): void {
  updateBilliardsViewV2(view, state.snapshot, state.soundEnabled, state.qualityMode, state.portrait);
  camera.synchronize(state.snapshot);
  pockets.synchronize(state.snapshot.match, view, performance.now());
}

function bindOrientation(
  media: MediaQueryList,
  update: (portrait: boolean) => void,
): () => void {
  const listener = (): void => update(media.matches);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
