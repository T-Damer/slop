import {
  billiardsBallIds,
  billiardsMatchPhases,
  billiardsPlayerGroups,
} from '../domain/registry.ts';
import type { BilliardsMatchState } from '../domain/types.ts';
import { billiardsConnectionStates } from '../network/registry.ts';
import type { BilliardsControllerSnapshot } from './controller.ts';
import {
  ballColor,
  billiardsCopy,
  billiardsUiAttributes,
} from './registry.ts';
import type { BilliardsViewElements } from './view-elements.ts';

export function updateBilliardsView(
  view: BilliardsViewElements,
  snapshot: BilliardsControllerSnapshot,
  soundEnabled: boolean,
): void {
  const match = snapshot.match;
  view.root.setAttribute(billiardsUiAttributes.revision, String(match.revision));
  view.root.setAttribute(billiardsUiAttributes.shotActive, String(match.activeShot !== null));
  view.root.setAttribute(billiardsUiAttributes.connection, snapshot.connection.state);
  view.root.setAttribute('data-audio-enabled', String(soundEnabled));
  view.status.textContent = match.status;
  view.hint.textContent = match.ballInHand ? billiardsCopy.ballInHand : billiardsCopy.aim;
  updateConnection(view, snapshot);
  updatePlayers(view, match);
  updateControls(view, snapshot);
  updateSoundButton(view, soundEnabled);
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
    view.players[index].classList.toggle('is-winner', match.winnerIndex === index);
    view.playerNames[index].textContent = player.name;
    view.playerGroups[index].textContent = playerGroupLabel(player.group, match, index);
    updatePocketSlots(view.pocketSlots[index], player.group, match);
  }
}

function updatePocketSlots(
  slots: ReadonlyArray<HTMLElement>,
  group: BilliardsMatchState['players'][number]['group'],
  match: BilliardsMatchState,
): void {
  const ids = group === billiardsPlayerGroups.solids
    ? billiardsBallIds.solids
    : group === billiardsPlayerGroups.stripes
      ? billiardsBallIds.stripes
      : [];
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    const id = ids[index];
    const pocketed = id !== undefined
      && match.table.balls.find((ball) => ball.id === id)?.pocketed === true;
    slot.className = 'billiards-pocket-slot';
    slot.textContent = '';
    slot.removeAttribute('data-ball-id');
    slot.style.removeProperty('--pocket-ball-color');
    if (id === undefined) {
      continue;
    }
    slot.setAttribute('data-ball-id', String(id));
    slot.style.setProperty('--pocket-ball-color', ballColor(id));
    slot.classList.toggle('is-stripe', group === billiardsPlayerGroups.stripes);
    slot.classList.toggle('is-pocketed', pocketed);
    if (pocketed) {
      slot.textContent = String(id);
    }
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
  const powerPercent = Math.round(snapshot.power * 100);
  const angleDegrees = normalizeDegrees(snapshot.angleRadians * 180 / Math.PI);
  const anglePosition = (
    Math.PI - normalizeRadians(snapshot.angleRadians)
  ) / (Math.PI * 2) * 100;
  view.power.value = String(powerPercent);
  view.sideSpin.value = String(Math.round(snapshot.sideSpin * 100));
  view.followSpin.value = String(Math.round(snapshot.followSpin * 100));
  view.powerOutput.value = `${powerPercent}%`;
  view.sideSpinOutput.value = signedPercent(snapshot.sideSpin);
  view.followSpinOutput.value = signedPercent(snapshot.followSpin);
  view.angleOutput.value = `${Math.round(angleDegrees)}°`;
  view.powerFill.style.height = `${powerPercent}%`;
  view.powerCue.style.setProperty('--power-cue-position', `${8 + snapshot.power * 76}%`);
  view.angleIndicator.style.top = `${anglePosition}%`;
  view.spinDot.style.left = `${50 + snapshot.sideSpin * 40}%`;
  view.spinDot.style.top = `${50 - snapshot.followSpin * 40}%`;
  view.powerRail.setAttribute('aria-valuenow', String(powerPercent));
  view.angleRail.setAttribute('aria-valuenow', String(Math.round(angleDegrees)));
  view.spinPad.setAttribute(
    'aria-valuetext',
    `${billiardsCopy.sideSpin} ${signedPercent(snapshot.sideSpin)}, ${billiardsCopy.followSpin} ${signedPercent(snapshot.followSpin)}`,
  );
  for (const element of [view.power, view.sideSpin, view.followSpin, view.shoot]) {
    element.toggleAttribute('disabled', active || finished);
  }
  view.powerRail.setAttribute('aria-disabled', String(active || finished));
  view.angleRail.setAttribute('aria-disabled', String(active || finished));
  view.spinPad.disabled = active || finished;
}

function updateSoundButton(view: BilliardsViewElements, enabled: boolean): void {
  view.sound.setAttribute('aria-pressed', String(enabled));
  view.sound.setAttribute('aria-label', enabled ? billiardsCopy.soundOn : billiardsCopy.soundOff);
  view.sound.classList.toggle('is-muted', !enabled);
  view.sound.firstElementChild?.replaceChildren(document.createTextNode(enabled ? '♪' : '×'));
}

function signedPercent(value: number): string {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeRadians(value: number): number {
  const fullCircle = Math.PI * 2;
  return ((value + Math.PI) % fullCircle + fullCircle) % fullCircle - Math.PI;
}
