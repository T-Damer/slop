import type { BilliardsBallState } from '../domain/types.ts';
import type { BilliardsControllerSnapshotV2 } from './controller-v2.ts';
import {
  ballColor,
  ballDisplayKind,
  billiardsCopy,
  billiardsUiAttributes,
} from './registry.ts';
import type { BilliardsViewElements } from './view-elements.ts';

const fullCircleDegrees = 360;
const radiansToDegrees = 180 / Math.PI;
const dialStates = new WeakMap<HTMLElement, { angle: number; offset: number }>();

export function updateBilliardsView(
  view: BilliardsViewElements,
  snapshot: BilliardsControllerSnapshotV2,
  soundEnabled: boolean,
): void {
  const { match } = snapshot;
  view.root.setAttribute(billiardsUiAttributes.revision, String(match.revision));
  view.root.setAttribute(
    billiardsUiAttributes.shotActive,
    String(match.activeShot !== null),
  );
  view.root.setAttribute(billiardsUiAttributes.connection, snapshot.connection.state);
  view.root.setAttribute(billiardsUiAttributes.ballRenderMode, 'spherical-roll');

  view.status.textContent = match.status;
  const build = document.querySelector<HTMLMetaElement>('meta[name="slop-build-sha"]')?.content;
  view.connection.textContent = `${connectionBadge(snapshot.connection.state)} · ${build?.slice(0, 7) ?? 'dev'}`;
  view.connection.title = `${snapshot.connection.detail} · ${build ?? 'development build'}`;
  view.hint.textContent = match.ballInHand ? billiardsCopy.ballInHand : billiardsCopy.aim;

  const winnerIndex = match.winnerIndex;
  for (const playerIndex of [0, 1] as const) {
    const player = match.players[playerIndex];
    const panel = view.players[playerIndex];
    panel.classList.toggle('is-active', match.turnIndex === playerIndex);
    panel.classList.toggle('is-winner', winnerIndex === playerIndex);
    view.playerNames[playerIndex].textContent = player.name;
    view.playerGroups[playerIndex].textContent = `${match.table.presetId === 'russian' && player.group !== 'open' ? (player.group === 'solids' ? '1–7' : '9–15') : groupLabel(player.group)} · забито ${match.table.balls.filter((ball) => ball.pocketed && ball.pocketedBy === playerIndex).length}`;
    panel.setAttribute('aria-current', String(match.turnIndex === playerIndex));
    updatePocketSlots(
      view.pocketSlots[playerIndex],
      match.table.balls,
      playerIndex,
      match.table.presetId === 'russian',
    );
  }

  const previous = dialStates.get(view.root) ?? { angle: snapshot.angleRadians, offset: 0 };
  const delta = Math.atan2(Math.sin(snapshot.angleRadians - previous.angle), Math.cos(snapshot.angleRadians - previous.angle));
  const offset = previous.offset + delta * 100;
  dialStates.set(view.root, { angle: snapshot.angleRadians, offset });
  view.root.style.setProperty('--dial-angle', `${offset}px`);
  view.root.style.setProperty('--dial-power', `${snapshot.power * 180}px`);
  setRangeValue(view.power, snapshot.power);
  view.powerOutput.value = `${Math.round(snapshot.power * 100)}%`;
  view.angleOutput.value = `${normalizeDegrees(snapshot.angleRadians * radiansToDegrees)}°`;

  view.root.style.setProperty('--billiards-power-percent', `${snapshot.power * 100}%`);
  view.root.style.setProperty('--billiards-angle-position', `${normalizeDegrees(snapshot.angleRadians * radiansToDegrees) / fullCircleDegrees * 100}%`);
  setRangeValue(view.angle, normalizeDegrees(snapshot.angleRadians * radiansToDegrees));

  const controlsDisabled = match.activeShot !== null || winnerIndex !== null;
  view.power.disabled = controlsDisabled;
  view.shoot.disabled = controlsDisabled;
  view.sound.setAttribute('aria-pressed', String(soundEnabled));
  view.sound.dataset.muted = String(!soundEnabled);
  view.sound.setAttribute(
    'aria-label',
    soundEnabled ? billiardsCopy.soundOff : billiardsCopy.soundOn,
  );
}

export function normalizeDegrees(value: number): number {
  return Math.round(((value % fullCircleDegrees) + fullCircleDegrees) % fullCircleDegrees);
}

function updatePocketSlots(
  slots: ReadonlyArray<HTMLElement>,
  balls: ReadonlyArray<BilliardsBallState>,
  playerIndex: 0 | 1,
  ivory: boolean,
): void {
  const pocketed = balls.filter((ball) => ball.pocketed && ball.pocketedBy === playerIndex)
    .sort((left, right) => left.id - right.id);

  slots.forEach((slot, index) => {
    const ball = pocketed.find((entry) => entry.id === index + 1);
    slot.classList.toggle('is-pocketed', ball !== undefined);
    slot.classList.toggle(
      'is-stripe',
      ball !== undefined && ballDisplayKind(ball.kind) === 'stripe',
    );
    slot.textContent = ball === undefined ? '' : String(ball.id);
    slot.hidden = ball === undefined;
    slot.setAttribute('aria-label', ball === undefined ? '' : `Забил игрок ${playerIndex + 1}: шар ${ball.id}`);
    slot.title = ball === undefined ? '' : `Шар ${ball.id} · забил ${playerIndex + 1}-й игрок`;
    if (ball === undefined) {
      slot.style.removeProperty('--slot-color');
    } else {
      slot.style.setProperty('--slot-color', ivory ? '#eee3c8' : ballColor(ball.id));
    }
  });
}

function groupLabel(group: unknown): string {
  if (group === 'solids') return 'Сплошные';
  if (group === 'stripes') return 'Полосатые';
  return 'Открытый стол';
}

function connectionBadge(state: string): string {
  if (state === 'online') return billiardsCopy.onlineBadge;
  if (state === 'connecting') return billiardsCopy.connectingBadge;
  if (state === 'unavailable') return billiardsCopy.unavailableBadge;
  return billiardsCopy.localBadge;
}

function setRangeValue(control: HTMLInputElement, value: number): void {
  control.value = String(value);
}
