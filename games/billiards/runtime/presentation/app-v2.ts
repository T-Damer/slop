import { graphicsSettings, prefersReducedMotion } from '../../../shared/game-shell/graphics-settings.ts';
import { BilliardsTableCamera } from './table-camera.ts';
import { BilliardsPocketJourney } from './pocket-journey.ts';
import {
  createEffect,
  createRoot,
  createSignal,
  onCleanup,
} from 'solid-js';

import { BilliardsAdaptiveQuality } from './adaptive-quality-v2.ts';
import { BilliardsAudioEngine } from './audio.ts';
import { BilliardsCanvasRendererV2 } from './canvas-renderer-v2.ts';
import { bindBilliardsControlsV2 } from './control-input-v2.ts';
import { BilliardsGameControllerV2 } from './controller-v2.ts';
import { BilliardsEffectsRenderer } from './effects-renderer.ts';
import { BilliardsFrameLoop } from './frame-loop-v2.ts';
import { billiardsCopy, billiardsUiIds } from './registry.ts';
import './pocket-club.css';
import { createBilliardsViewElements, type BilliardsViewElements } from './view-elements.ts';
import { updateBilliardsViewV2 } from './view-state-v2.ts';

let disposeSolidRoot: (() => void) | null = null;

export function mountBilliards(parent: HTMLElement): void {
  unmountBilliards();
  createRoot((dispose) => {
    disposeSolidRoot = dispose;
    const view = createBilliardsViewElements();
    // Attach before observing size or subscribing to synchronous state owners.
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
  const [snapshot, setSnapshot] = createSignal(controller.snapshot());
  const [soundEnabled, setSoundEnabled] = createSignal(audio.isEnabled());
  const [qualityMode, setQualityMode] = createSignal(quality.mode());
  const [portrait, setPortrait] = createSignal(orientation.matches);
  const camera = new BilliardsTableCamera(view.stage, view.canvas, controller, view.zoom);
  cleanup.push(() => camera.dispose());
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

  cleanup.push(() => frameLoop.stop());
  // Every callback dependency above is initialized before eager subscriptions.
  cleanup.push(controller.subscribe(setSnapshot));
  cleanup.push(controller.subscribeFeedback((batch) => {
    const nowMs = performance.now();
    effects.consume(batch, nowMs);
    pockets.consume(batch, controller.snapshot().match, nowMs, (id) => renderer.ballSprite(id));
    audio.consume(batch);
  }));
  cleanup.push(bindBilliardsControlsV2({ view, controller, snapshot, audio, setSoundEnabled }));
  cleanup.push(bindOrientation(orientation, setPortrait));
  cleanup.push(graphicsSettings.subscribe(() => setQualityMode(quality.mode())));

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

  document.title = `${billiardsCopy.title} · SLOP`;
  if (new URLSearchParams(location.search).get('qa') === '1') {
    void import('./qa-bridge-v2.ts').then(({ installQaBridge }) => {
      if (!disposed) installQaBridge(controller, renderer, frameLoop, quality, snapshot, portrait, camera, pockets);
    });
  }
  frameLoop.start();
  // Public game is local-only; the optional SDK remains behind its adapter.
  void controller.start(location.origin);
  view.canvas.focus({ preventScroll: true });
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

