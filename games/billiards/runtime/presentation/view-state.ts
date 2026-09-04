import type { BilliardsBallState } from '../domain/types.ts';
import type { BilliardsControllerSnapshot } from './controller.ts';
import {
  ballColor,
  ballDisplayKind,
  billiardsCopy,
  billiardsUiAttributes,
} from './registry.ts';
import type { BilliardsViewElements } from './view-elements.ts';

const fullCircleDegrees = 360;
const radiansToDegrees = 180 / Math.PI;

export function updateBilliardsView(
  view: BilliardsViewElements,
  snapshot: BilliardsControllerSnapshot,
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
  view.root.setAttribute(billiardsUiAttributes.audio, soundEnabled ? 'ready' : 'muted');

  view.status.textContent = match.status;
  view.connection.textContent = connectionBadge(snapshot.connection.state);
  view.hint.textContent = match.ballInHand ? billiardsCopy.ballInHand : billiardsCopy.aim;

  const winnerIndex = match.winnerIndex;
  for (const playerIndex of [0, 1] as const) {
    const player = match.players[playerIndex];
    const panel = view.players[playerIndex];
    panel.classList.toggle('is-active', match.turnIndex === playerIndex);
    panel.classList.toggle('is-winner', winnerIndex === playerIndex);
    view.playerNames[playerIndex].textContent = player.name;
    view.playerGroups[playerIndex].textContent = groupLabel(player.group);
    updatePocketSlots(
      view.pocketSlots[playerIndex],
      match.table.balls,
      player.group,
    );
  }

  setRangeValue(view.power, snapshot.power);
  setRangeValue(view.sideSpin, snapshot.sideSpin);
  setRangeValue(view.followSpin, snapshot.followSpin);
  view.powerOutput.value = `${Math.round(snapshot.power * 100)}%`;
  view.sideSpinOutput.value = formatSignedPercent(snapshot.sideSpin);
  view.followSpinOutput.value = formatSignedPercent(snapshot.followSpin);
  view.angleOutput.value = `${normalizeDegrees(snapshot.angleRadians * radiansToDegrees)}°`;

  view.powerFill.style.setProperty('--billiards-power', String(snapshot.power));
  view.powerRail.style.setProperty('--billiards-power', String(snapshot.power));
  view.powerCue.style.setProperty('--billiards-power', String(snapshot.power));
  view.angleRail.style.setProperty(
    '--billiards-angle-turn',
    String(normalizeDegrees(snapshot.angleRadians * radiansToDegrees) / fullCircleDegrees),
  );
  view.angleIndicator.style.setProperty(
    '--billiards-angle-turn',
    String(normalizeDegrees(snapshot.angleRadians * radiansToDegrees) / fullCircleDegrees),
  );
  view.spinDot.style.setProperty('--billiards-side-spin', String(snapshot.sideSpin));
  view.spinDot.style.setProperty('--billiards-follow-spin', String(snapshot.followSpin));

  const controlsDisabled = match.activeShot !== null || winnerIndex !== null;
  view.power.disabled = controlsDisabled;
  view.sideSpin.disabled = controlsDisabled;
  view.followSpin.disabled = controlsDisabled;
  view.spinPad.disabled = controlsDisabled;
  view.shoot.disabled = controlsDisabled;
  view.sound.setAttribute('aria-pressed', String(soundEnabled));
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
  group: unknown,
): void {
  const groupValue = typeof group === 'string' ? group : null;
  const pocketed = balls
    .filter((ball) => ball.pocketed && ball.id !== 0 && ball.id !== 8)
    .filter((ball) => groupValue === null || String(ball.kind) === groupValue)
    .sort((left, right) => left.id - right.id);

  slots.forEach((slot, index) => {
    const ball = pocketed[index];
    slot.classList.toggle('is-pocketed', ball !== undefined);
    slot.classList.toggle(
      'is-stripe',
      ball !== undefined && ballDisplayKind(ball.kind) === 'stripe',
    );
    slot.textContent = ball === undefined ? '' : String(ball.id);
    if (ball === undefined) {
      slot.style.removeProperty('--pocket-ball-color');
    } else {
      slot.style.setProperty('--pocket-ball-color', ballColor(ball.id));
    }
  });
}

function groupLabel(group: unknown): string {
  if (group === null || group === undefined) {
    return 'Open';
  }
  const value = String(group);
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function formatSignedPercent(value: number): string {
  const percentage = Math.round(value * 100);
  return `${percentage > 0 ? '+' : ''}${percentage}%`;
}
