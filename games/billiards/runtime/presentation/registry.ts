import { billiardsBallKinds, billiardsPhysics } from '../domain/registry.ts';
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
  cueGap: 22,
  aimGuideWidth: 2,
} as const;

export const billiardsPalette = {
  sight: '#ead9ab',
  pocket: '#050505',
  guide: 'rgba(255, 255, 255, 0.76)',
  objectGuide: 'rgba(245, 195, 91, 0.72)',
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
  ballInHand: 'Выберите место и подтвердите кнопкой «Поставить биток»',
  shoot: 'Удар',
  restart: 'Новая партия',
  power: 'Сила',
  angle: 'Направление',
  soundOn: 'Включить звук',
  soundOff: 'Выключить звук',
  controls: 'Клик: фиксация · Стрелки: угол · Колесо: сила · Space: удар · Esc: смена прицела',
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

export const billiardsFeedbackKinds = {
  cue: 'cue-strike', ball: 'ball-contact', cushion: 'cushion-contact',
  jaw: 'jaw-contact', pocket: 'pocket-drop',
} as const;

export const billiardsFeedbackTuning = {
  cueAnimationDurationMs: 220,
  impactDurationMs: 260,
  maximumImpactEffects: 24,
  fullIntensitySpeed: billiardsPhysics.maximumShotSpeed * 0.62,
  maximumSoundsPerBatch: 7,
  soundSpacingSeconds: 0.005,
  maximumStereoPan: 0.85,
} as const;

export const billiardsInputTuning = {
  angleStep: 0.009, fineAngleStep: 0.0025, angleRadiansPerPixel: 0.012,
  maximumWheelStep: 0.12, wheelPixelsPerPower: 700, wheelLinePixels: 16,
  degreesToRadians: Math.PI / 180,
} as const;
