import { billiardsBallKinds } from '../domain/registry.ts';
import type { BilliardsBallKind } from '../domain/types.ts';

export const billiardsUiIds = {
  root: 'slop-billiards-root',
  style: 'slop-billiards-style',
  canvas: 'slop-billiards-canvas',
} as const;

export const billiardsUiAttributes = {
  root: 'data-billiards-root',
  canvas: 'data-billiards-canvas',
  shoot: 'data-billiards-shoot',
  restart: 'data-billiards-restart',
  revision: 'data-match-revision',
  shotActive: 'data-shot-active',
  connection: 'data-connection-state',
  ballRenderMode: 'data-ball-render-mode',
  audio: 'data-audio-state',
} as const;

export const billiardsView = {
  canvasWidth: 1280,
  canvasHeight: 720,
  table: {
    left: 130,
    top: 105,
    width: 1020,
    height: 510,
    railWidth: 52,
    cornerRadius: 34,
  },
  ballShadowOffset: 4,
  cueLength: 255,
  cueGap: 22,
  aimGuideWidth: 2,
  devicePixelRatioLimit: 2,
} as const;

export const billiardsPalette = {
  pageTop: '#102941',
  pageBottom: '#071522',
  panel: 'rgba(10, 25, 39, 0.88)',
  panelBorder: 'rgba(255, 255, 255, 0.12)',
  text: '#f7f2e8',
  muted: '#aab9c5',
  accent: '#f5c35b',
  accentDark: '#b77a1d',
  felt: '#18735f',
  feltDark: '#0b463b',
  rail: '#694027',
  railDark: '#2f1c14',
  sight: '#ead9ab',
  pocket: '#050505',
  guide: 'rgba(255, 255, 255, 0.76)',
  objectGuide: 'rgba(245, 195, 91, 0.72)',
  foul: '#ff8f7d',
  success: '#8de7b4',
} as const;

export const billiardsBallColors: Readonly<Record<number, string>> = {
  0: '#f4f2e9',
  1: '#e7c32d',
  2: '#245bb8',
  3: '#cf382e',
  4: '#6d3b9f',
  5: '#ee7b22',
  6: '#21835d',
  7: '#7e2427',
  8: '#151515',
  9: '#e7c32d',
  10: '#245bb8',
  11: '#cf382e',
  12: '#6d3b9f',
  13: '#ee7b22',
  14: '#21835d',
  15: '#7e2427',
};

export const billiardsCopy = {
  title: 'Pocket Club',
  subtitle: 'Clean-room 8-ball · local deterministic simulation',
  aim: 'Веди по столу, чтобы прицелиться',
  ballInHand: 'Кликни по свободному месту, чтобы поставить биток',
  shoot: 'Удар',
  restart: 'Новая партия',
  power: 'Сила',
  sideSpin: 'Боковое вращение',
  followSpin: 'Накат / оттяжка',
  angle: 'Направление',
  spin: 'Вращение битка',
  spinHint: 'Перетащи точку по шару',
  soundOn: 'Включить звук',
  soundOff: 'Выключить звук',
  controls: 'Мышь / касание: прицел · Space: удар · A/D: угол · W/S: сила',
  localBadge: 'LOCAL',
  onlineBadge: 'ONLINE',
  connectingBadge: 'CONNECTING',
  unavailableBadge: 'OFFLINE',
} as const;

export function ballColor(id: number): string {
  return billiardsBallColors[id] ?? '#f4f2e9';
}

export function ballDisplayKind(kind: BilliardsBallKind): 'plain' | 'stripe' {
  return kind === billiardsBallKinds.stripe ? 'stripe' : 'plain';
}
