import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { render } from 'solid-js/web';

import { billiardsMatchPhases, billiardsPlayerGroups } from '../domain/registry.ts';
import type { BilliardsMatchState, Vec2 } from '../domain/types.ts';
import { billiardsConnectionStates } from '../network/registry.ts';
import { canvasToWorld, pointerToCanvas } from './coordinates.ts';
import {
  BilliardsGameController,
  type BilliardsControllerSnapshot,
} from './controller.ts';
import { BilliardsCanvasRenderer } from './canvas-renderer.ts';
import {
  billiardsCopy,
  billiardsUiAttributes,
  billiardsUiIds,
} from './registry.ts';
import { billiardsStyles } from './styles.ts';
import {
  createBilliardsViewElements,
  type BilliardsViewElements,
} from './view-elements.ts';

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
  const canvasRenderer = new BilliardsCanvasRenderer(view.canvas);
  const [snapshot, setSnapshot] = createSignal(controller.snapshot());
  const unsubscribe = controller.subscribe(setSnapshot);
  const removeEvents = bindViewEvents(view, controller, snapshot);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  createEffect(() => {
    const current = snapshot();
    updateView(view, current);
    canvasRenderer.draw({ ...current, reducedMotion });
  });

  onMount(() => {
    document.title = `${billiardsCopy.title} · SLOP`;
    installQaBridge(controller, snapshot);
    void controller.start(location.href);
    view.canvas.focus({ preventScroll: true });
  });

  onCleanup(() => {
    unsubscribe();
    removeEvents();
    delete window.__SLOP_BILLIARDS_QA__;
    void controller.dispose();
  });

  return view.root;
}

function bindViewEvents(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  snapshot: () => BilliardsControllerSnapshot,
): () => void {
  const onPointerMove = (event: PointerEvent): void => {
    controller.setAimFromWorld(readPointerWorld(view.canvas, event));
  };
  const onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    view.canvas.setPointerCapture(event.pointerId);
    const point = readPointerWorld(view.canvas, event);
    if (snapshot().match.ballInHand) {
      controller.placeCue(point);
    } else {
      controller.setAimFromWorld(point);
    }
  };
  const onPower = (): void => controller.setPower(Number(view.power.value) / 100);
  const onSideSpin = (): void => controller.setSideSpin(Number(view.sideSpin.value) / 100);
  const onFollowSpin = (): void => controller.setFollowSpin(Number(view.followSpin.value) / 100);
  const onShoot = (): void => { controller.shoot(); };
  const onRestart = (): void => controller.restart();
  const onKeyDown = createKeyboardHandler(controller);

  view.canvas.addEventListener('pointermove', onPointerMove);
  view.canvas.addEventListener('pointerdown', onPointerDown);
  view.power.addEventListener('input', onPower);
  view.sideSpin.addEventListener('input', onSideSpin);
  view.followSpin.addEventListener('input', onFollowSpin);
  view.shoot.addEventListener('click', onShoot);
  view.restart.addEventListener('click', onRestart);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    view.canvas.removeEventListener('pointermove', onPointerMove);
    view.canvas.removeEventListener('pointerdown', onPointerDown);
    view.power.removeEventListener('input', onPower);
    view.sideSpin.removeEventListener('input', onSideSpin);
    view.followSpin.removeEventListener('input', onFollowSpin);
    view.shoot.removeEventListener('click', onShoot);
    view.restart.removeEventListener('click', onRestart);
    window.removeEventListener('keydown', onKeyDown);
  };
}

function createKeyboardHandler(controller: BilliardsGameController) {
  return (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'a' || key === 'arrowleft') {
      controller.adjustAngle(-0.045);
    } else if (key === 'd' || key === 'arrowright') {
      controller.adjustAngle(0.045);
    } else if (key === 'w' || key === 'arrowup') {
      controller.setPower(controller.snapshot().power + 0.04);
    } else if (key === 's' || key === 'arrowdown') {
      controller.setPower(controller.snapshot().power - 0.04);
    } else if (event.code === 'Space') {
      controller.shoot();
    } else {
      return;
    }
    event.preventDefault();
  };
}

function updateView(
  view: BilliardsViewElements,
  snapshot: BilliardsControllerSnapshot,
): void {
  const match = snapshot.match;
  view.root.setAttribute(billiardsUiAttributes.revision, String(match.revision));
  view.root.setAttribute(billiardsUiAttributes.shotActive, String(match.activeShot !== null));
  view.root.setAttribute(billiardsUiAttributes.connection, snapshot.connection.state);
  view.status.textContent = match.status;
  view.hint.textContent = match.ballInHand ? billiardsCopy.ballInHand : billiardsCopy.aim;
  updateConnection(view, snapshot);
  updatePlayers(view, match);
  updateControls(view, snapshot);
}

function updateConnection(
  view: BilliardsViewElements,
  snapshot: BilliardsControllerSnapshot,
): void {
  const state = snapshot.connection.state;
  view.connection.textContent = state === billiardsConnectionStates.online
    ? billiardsCopy.onlineBadge
    : state === billiardsConnectionStates.connecting
      ? billiardsCopy.connectingBadge
      : state === billiardsConnectionStates.unavailable
        ? billiardsCopy.unavailableBadge
        : billiardsCopy.localBadge;
  view.connection.title = snapshot.connection.detail;
}

function updatePlayers(
  view: BilliardsViewElements,
  match: BilliardsMatchState,
): void {
  for (const index of [0, 1] as const) {
    const player = match.players[index];
    view.players[index].classList.toggle('is-active', match.turnIndex === index);
    view.playerNames[index].textContent = player.name;
    view.playerGroups[index].textContent = playerGroupLabel(player.group, match, index);
  }
}

function playerGroupLabel(
  group: BilliardsMatchState['players'][number]['group'],
  match: BilliardsMatchState,
  index: 0 | 1,
): string {
  if (match.winnerIndex === index) return 'Победитель';
  if (group === billiardsPlayerGroups.solids) return 'Сплошные 1–7';
  if (group === billiardsPlayerGroups.stripes) return 'Полосатые 9–15';
  return match.phase === billiardsMatchPhases.break ? 'Разбой' : 'Стол открыт';
}

function updateControls(
  view: BilliardsViewElements,
  snapshot: BilliardsControllerSnapshot,
): void {
  const active = snapshot.match.activeShot !== null;
  const finished = snapshot.match.phase === billiardsMatchPhases.finished;
  view.power.value = String(Math.round(snapshot.power * 100));
  view.sideSpin.value = String(Math.round(snapshot.sideSpin * 100));
  view.followSpin.value = String(Math.round(snapshot.followSpin * 100));
  view.powerOutput.value = `${Math.round(snapshot.power * 100)}%`;
  view.sideSpinOutput.value = signedPercent(snapshot.sideSpin);
  view.followSpinOutput.value = signedPercent(snapshot.followSpin);
  view.power.disabled = active || finished;
  view.sideSpin.disabled = active || finished;
  view.followSpin.disabled = active || finished;
  view.shoot.disabled = active || finished;
}

function readPointerWorld(canvas: HTMLCanvasElement, event: PointerEvent): Vec2 {
  return canvasToWorld(pointerToCanvas(canvas, event.clientX, event.clientY));
}

function signedPercent(value: number): string {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function installQaBridge(
  controller: BilliardsGameController,
  snapshot: () => BilliardsControllerSnapshot,
): void {
  if (new URLSearchParams(location.search).get('qa') !== '1') {
    return;
  }
  window.__SLOP_BILLIARDS_QA__ = {
    schemaVersion: 1,
    snapshot,
    shoot: () => controller.shoot(),
    setPower: (power) => controller.setPower(power),
    setAim: (angleRadians) => {
      const current = controller.snapshot();
      controller.adjustAngle(angleRadians - current.angleRadians);
    },
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
