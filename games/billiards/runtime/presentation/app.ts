import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { render } from 'solid-js/web';

import { BilliardsAudio } from './audio.ts';
import { BilliardsCanvasRenderer } from './canvas-renderer.ts';
import {
  BilliardsGameController,
  type BilliardsControllerSnapshot,
} from './controller.ts';
import { bindBilliardsInput } from './input-bindings.ts';
import {
  billiardsCopy,
  billiardsUiIds,
} from './registry.ts';
import { billiardsStyles } from './styles.ts';
import { updateBilliardsView } from './view-update.ts';
import { createBilliardsViewElements } from './view-elements.ts';

interface BilliardsQaBridge {
  readonly schemaVersion: 1;
  readonly snapshot: () => BilliardsControllerSnapshot;
  readonly shoot: () => boolean;
  readonly setPower: (power: number) => void;
  readonly setAim: (angleRadians: number) => void;
  readonly restart: () => void;
}

declare global {
  interface Window {
    __SLOP_BILLIARDS_QA__?: BilliardsQaBridge;
  }
}

let disposeSolidRoot: (() => void) | null = null;

export function mountBilliards(parent: HTMLElement): void {
  unmountBilliards();
  installStyles();
  disposeSolidRoot = render(() => createBilliardsApp(), parent);
}

export function unmountBilliards(): void {
  disposeSolidRoot?.();
  disposeSolidRoot = null;
  document.getElementById(billiardsUiIds.root)?.remove();
  document.getElementById(billiardsUiIds.style)?.remove();
  delete window.__SLOP_BILLIARDS_QA__;
}

function createBilliardsApp(): HTMLElement {
  const view = createBilliardsViewElements();
  const controller = new BilliardsGameController();
  const audio = new BilliardsAudio();
  const canvasRenderer = new BilliardsCanvasRenderer(view.canvas);
  const [snapshot, setSnapshot] = createSignal(controller.snapshot());
  const unsubscribe = controller.subscribe(setSnapshot);
  const removeEvents = bindBilliardsInput(view, controller, snapshot, audio);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  createEffect(() => {
    const current = snapshot();
    updateBilliardsView(view, current, audio.state());
    canvasRenderer.draw({ ...current, reducedMotion });
    audio.update(current);
  });

  onMount(() => {
    document.title = `${billiardsCopy.title} · SLOP`;
    installQaBridge(controller, snapshot, audio);
    void controller.start(location.href);
    view.canvas.focus({ preventScroll: true });
  });

  onCleanup(() => {
    unsubscribe();
    removeEvents();
    delete window.__SLOP_BILLIARDS_QA__;
    void audio.dispose();
    void controller.dispose();
  });

  return view.root;
}

function installQaBridge(
  controller: BilliardsGameController,
  snapshot: () => BilliardsControllerSnapshot,
  audio: BilliardsAudio,
): void {
  if (new URLSearchParams(location.search).get('qa') !== '1') {
    return;
  }
  window.__SLOP_BILLIARDS_QA__ = {
    schemaVersion: 1,
    snapshot,
    shoot: () => {
      audio.unlock();
      return controller.shoot();
    },
    setPower: (power) => controller.setPower(power),
    setAim: (angleRadians) => controller.setAngleRadians(angleRadians),
    restart: () => controller.restart(),
  };
}

function installStyles(): void {
  if (document.getElementById(billiardsUiIds.style) !== null) {
    return;
  }
  const style = document.createElement('style');
  style.id = billiardsUiIds.style;
  style.textContent = billiardsStyles;
  document.head.append(style);
}
