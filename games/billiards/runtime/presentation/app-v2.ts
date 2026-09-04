import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { render } from 'solid-js/web';

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
import { billiardsInteractionStylesV2 } from './interaction-styles-v2.ts';
import { billiardsCopy, billiardsUiIds } from './registry.ts';
import { billiardsStyles } from './styles.ts';
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
  installStyles();
  disposeSolidRoot = render(() => createBilliardsAppV2(), parent);
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
  const renderer = new BilliardsCanvasRendererV2(view.canvas, effects);
  const quality = new BilliardsAdaptiveQuality();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const orientation = matchMedia('(orientation: portrait)');
  const [snapshot, setSnapshot] = createSignal(controller.snapshot());
  const [soundEnabled, setSoundEnabled] = createSignal(audio.isEnabled());
  const [qualityMode, setQualityMode] = createSignal(quality.mode());
  const [portrait, setPortrait] = createSignal(orientation.matches);
  const unsubscribe = controller.subscribe(setSnapshot);
  const unsubscribeFeedback = controller.subscribeFeedback((batch) => {
    const nowMs = performance.now();
    effects.consume(batch, nowMs);
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
  const frameLoop = createFrameLoop(
    controller,
    renderer,
    quality,
    snapshot,
    qualityMode,
    setQualityMode,
    reducedMotion,
  );

  createEffect(() => {
    updateBilliardsViewV2(
      view,
      snapshot(),
      soundEnabled(),
      qualityMode(),
      portrait(),
    );
  });

  onMount(() => {
    document.title = `${billiardsCopy.title} · SLOP`;
    installQaBridge(controller, renderer, frameLoop, quality, snapshot, portrait);
    frameLoop.start();
    void controller.start(location.href);
    view.canvas.focus({ preventScroll: true });
  });

  onCleanup(() => {
    frameLoop.stop();
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

function createFrameLoop(
  controller: BilliardsGameControllerV2,
  renderer: BilliardsCanvasRendererV2,
  quality: BilliardsAdaptiveQuality,
  snapshot: () => BilliardsControllerSnapshotV2,
  qualityMode: () => ReturnType<BilliardsAdaptiveQuality['mode']>,
  setQualityMode: (mode: ReturnType<BilliardsAdaptiveQuality['mode']>) => void,
  reducedMotion: MediaQueryList,
): BilliardsFrameLoop {
  return new BilliardsFrameLoop({
    onFrame: (nowMs, deltaSeconds) => {
      quality.observe(deltaSeconds * 1000, nowMs);
      controller.advance(deltaSeconds);
      const nextMode = quality.mode();
      if (nextMode !== qualityMode()) setQualityMode(nextMode);
      if (!quality.shouldRender(nowMs)) return;
      renderer.draw({
        snapshot: snapshot(),
        quality: nextMode,
        reducedMotion: reducedMotion.matches,
      }, nowMs);
    },
  });
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
    }),
    primaryAction: () => controller.primaryAction(),
    setPlacementPreview: (x, y) => controller.setPlacementPreview({ x, y }),
    lockAim: () => controller.lockAim(),
    unlockAim: () => controller.unlockAim(),
  };
}

function installStyles(): void {
  if (document.getElementById(billiardsUiIds.style) !== null) return;
  const style = document.createElement('style');
  style.id = billiardsUiIds.style;
  style.textContent = `${billiardsStyles}\n${billiardsInteractionStylesV2}`;
  document.head.append(style);
}
