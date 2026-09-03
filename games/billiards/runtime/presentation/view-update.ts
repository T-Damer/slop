import {
  billiardsBallIds,
  billiardsMatchPhases,
  billiardsPlayerGroups,
} from '../domain/registry.ts';
import type { BilliardsMatchState } from '../domain/types.ts';
import { billiardsConnectionStates } from '../network/registry.ts';
import type { BilliardsAudioState } from './audio.ts';
import type { BilliardsControllerSnapshot } from './controller.ts';
import {
  ballColor,
  billiardsCopy,
  billiardsUiAttributes,
} from './registry.ts';
import type { BilliardsViewElements } from './view-elements.ts';

const radiansToDegrees = 180 / Math.PI;

export function updateBilliardsView(
  view: BilliardsViewElements,
  snapshot: BilliardsControllerSnapshot,
  audioState: BilliardsAudioState,
): void {
  const match = snapshot.match;
  view.root.setAttribute(billiardsUiAttributes.revision, String(match.revision));
  view.root.setAttribute(
    billiardsUiAttributes.shotActive,
    String(match.activeShot !== null),
  );
  view.root.setAttribute(billiardsUiAttributes.connection, snapshot.connection.state);
  view.root.setAttribute(billiardsUiAttributes.ballRenderMode, 'spherical-roll');
  view.root.setAttribute(billiardsUiAttributes.audio, audioState);
  view.status.textContent = match.status;
  view.hint.textContent = match.ballInHand ? billiardsCopy.ballInHand : billiardsCopy.aim;
  updateConnection(view, snapshot);
  updatePlayers(view, match);
  updateControls(view, snapshot);
  updateSoundButton(view, audioState);
}

export function updateSoundButton(
  view: BilliardsViewElements,
  state: BilliardsAudioState,
): void {
  const muted = state === 'muted';
  const locked = state === 'locked';
  view.sound.textContent = muted ? '🔇' : locked ? '🔈' : '🔊';
  view.sound.setAttribute('aria-pressed', String(muted));
  const label = muted || locked ? billiardsCopy.soundOn : billiardsCopy.soundOff;
  view.sound.setAttribute('aria-label', label);
  view.sound.title = label;
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
    updatePocketedBallSlots(view.playerBallSlots[index], match, player.group);
  }
}

function updatePocketedBallSlots(
  container: HTMLElement,
  match: BilliardsMatchState,
  group: BilliardsMatchState['players'][number]['group'],
): void {
  const ids = group === billiardsPlayerGroups.solids
    ? billiardsBallIds.solids
    : group === billiardsPlayerGroups.stripes
      ? billiardsBallIds.stripes
      : [];
  const slots = container.querySelectorAll<HTMLElement>('.billiards-ball-slot');
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots.item(index);
    const id = ids[index];
    const pocketed = id !== undefined
      && match.table.balls.find((ball) => ball.id === id)?.pocketed === true;
    slot.classList.toggle('is-assigned', id !== undefined);
    slot.classList.toggle('is-pocketed', pocketed);
    slot.textContent = pocketed && id !== undefined ? String(id) : '';
    if (id === undefined) {
      slot.removeAttribute('data-ball-id');
      slot.style.removeProperty('--slot-color');
    } else {
      slot.dataset.ballId = String(id);
      slot.style.setProperty('--slot-color', ballColor(id));
    }
  }
}

function playerGroupLabel(
  group: BilliardsMatchState['players'][number]['group'],
  match: BilliardsMatchState,
  index: 0 | 1,
): string {
  if (match.winnerIndex === index) return 'Победитель';
  if (group === billiardsPlayerGroups.solids) return 'Сплошные';
  if (group === billiardsPlayerGroups.stripes) return 'Полосатые';
  return match.phase === billiardsMatchPhases.break ? 'Разбой' : 'Стол открыт';
}

function updateControls(
  view: BilliardsViewElements,
  snapshot: BilliardsControllerSnapshot,
): void {
  const active = snapshot.match.activeShot !== null;
  const finished = snapshot.match.phase === billiardsMatchPhases.finished;
  const angleDegrees = normalizeDegrees(snapshot.angleRadians * radiansToDegrees);
  view.power.value = String(Math.round(snapshot.power * 100));
  view.angle.value = String(Math.round(angleDegrees));
  view.sideSpin.value = String(Math.round(snapshot.sideSpin * 100));
  view.followSpin.value = String(Math.round(snapshot.followSpin * 100));
  view.powerOutput.value = `${Math.round(snapshot.power * 100)}%`;
  view.angleOutput.value = `${Math.round(angleDegrees)}°`;
  view.sideSpinOutput.value = signedPercent(snapshot.sideSpin);
  view.followSpinOutput.value = signedPercent(snapshot.followSpin);
  view.root.style.setProperty(
    '--billiards-power-percent',
    `${snapshot.power * 100}%`,
  );
  view.root.style.setProperty(
    '--billiards-angle-position',
    `${100 - angleDegrees / 359 * 100}%`,
  );
  view.root.style.setProperty(
    '--billiards-spin-left',
    `${50 + snapshot.sideSpin * 38}%`,
  );
  view.root.style.setProperty(
    '--billiards-spin-top',
    `${50 - snapshot.followSpin * 38}%`,
  );
  view.spinPad.setAttribute(
    'aria-valuetext',
    `Боковое ${signedPercent(snapshot.sideSpin)}, накат ${signedPercent(snapshot.followSpin)}`,
  );
  view.power.disabled = active || finished;
  view.angle.disabled = active || finished;
  view.sideSpin.disabled = active || finished;
  view.followSpin.disabled = active || finished;
  view.spinPad.setAttribute('aria-disabled', String(active || finished));
  view.shoot.disabled = active || finished;
}

function signedPercent(value: number): string {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}
