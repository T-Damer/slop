import type { Vec2 } from '../domain/types.ts';
import { worldToCanvas } from './coordinates.ts';
import { billiardsView } from './registry.ts';

export interface BilliardsCueSkin {
  readonly id: string;
  readonly shaftLight: string;
  readonly shaftMid: string;
  readonly shaftDark: string;
  readonly buttLight: string;
  readonly buttDark: string;
  readonly wrap: string;
  readonly ferrule: string;
  readonly tip: string;
  readonly gloss: number;
}

export interface BilliardsCueRenderOptions {
  readonly cuePosition: Vec2;
  readonly angleRadians: number;
  readonly pullbackPixels: number;
  readonly alpha: number;
  readonly prepared: boolean;
}

export const defaultBilliardsCueSkin: BilliardsCueSkin = {
  id: 'club-walnut',
  shaftLight: '#f1d3a2',
  shaftMid: '#c49155',
  shaftDark: '#75431f',
  buttLight: '#874624',
  buttDark: '#241008',
  wrap: '#1d1916',
  ferrule: '#eee5d5',
  tip: '#3a8395',
  gloss: 0.58,
};

export function drawBilliardsCue(
  context: CanvasRenderingContext2D,
  options: BilliardsCueRenderOptions,
  skin = defaultBilliardsCueSkin,
): void {
  const cuePoint = worldToCanvas(options.cuePosition);
  const direction = {
    x: Math.cos(options.angleRadians),
    y: Math.sin(options.angleRadians),
  };
  const preparedOffset = options.prepared ? 10 : 0;
  const near = billiardsView.cueGap + options.pullbackPixels + preparedOffset;
  const far = near + billiardsView.cueLength;
  const start = {
    x: cuePoint.x - direction.x * near,
    y: cuePoint.y - direction.y * near,
  };
  const end = {
    x: cuePoint.x - direction.x * far,
    y: cuePoint.y - direction.y * far,
  };
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const roomLight = cueRoomLight(midpoint);

  context.save();
  context.globalAlpha = options.alpha;
  context.lineCap = 'round';

  context.strokeStyle = `rgba(0, 0, 0, ${0.35 + roomLight * 0.18})`;
  context.lineWidth = 13;
  context.beginPath();
  context.moveTo(start.x + 4, start.y + 6);
  context.lineTo(end.x + 5, end.y + 7);
  context.stroke();

  const bodyGradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
  bodyGradient.addColorStop(0, mixColor(skin.shaftLight, roomLight * 0.24));
  bodyGradient.addColorStop(0.18, mixColor(skin.shaftMid, roomLight * 0.18));
  bodyGradient.addColorStop(0.58, skin.shaftDark);
  bodyGradient.addColorStop(0.72, skin.buttLight);
  bodyGradient.addColorStop(1, skin.buttDark);
  context.strokeStyle = bodyGradient;
  context.lineWidth = 8.5;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  drawCueGrain(context, start, end, direction, roomLight, skin);
  drawCueWrap(context, start, end, direction, skin);

  context.strokeStyle = `rgba(255, 237, 202, ${skin.gloss * (0.16 + roomLight * 0.38)})`;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(start.x - direction.y * 2.1, start.y + direction.x * 2.1);
  context.lineTo(end.x - direction.y * 2.1, end.y + direction.x * 2.1);
  context.stroke();

  context.strokeStyle = skin.ferrule;
  context.lineWidth = 9;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(start.x - direction.x * 7, start.y - direction.y * 7);
  context.stroke();

  context.strokeStyle = skin.tip;
  context.lineWidth = 9.5;
  context.beginPath();
  context.moveTo(start.x + direction.x * 1.5, start.y + direction.y * 1.5);
  context.lineTo(start.x + direction.x * 5.5, start.y + direction.y * 5.5);
  context.stroke();

  context.restore();
}

function drawCueGrain(
  context: CanvasRenderingContext2D,
  start: Vec2,
  end: Vec2,
  direction: Vec2,
  roomLight: number,
  skin: BilliardsCueSkin,
): void {
  const normal = { x: -direction.y, y: direction.x };
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const grainCount = 15;
  context.save();
  context.lineWidth = 0.75;
  for (let index = 1; index < grainCount; index += 1) {
    const progress = index / grainCount;
    const center = {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    };
    const wave = Math.sin(index * 1.71) * 1.7;
    const span = 5 + Math.sin(index * 0.83) * 2;
    context.strokeStyle = index % 2 === 0
      ? `rgba(255, 224, 178, ${0.035 + roomLight * 0.045})`
      : colorWithAlpha(skin.buttDark, 0.08);
    context.beginPath();
    context.moveTo(
      center.x - direction.x * span + normal.x * wave,
      center.y - direction.y * span + normal.y * wave,
    );
    context.lineTo(
      center.x + direction.x * span - normal.x * wave,
      center.y + direction.y * span - normal.y * wave,
    );
    context.stroke();
  }
  context.restore();
}

function drawCueWrap(
  context: CanvasRenderingContext2D,
  start: Vec2,
  end: Vec2,
  direction: Vec2,
  skin: BilliardsCueSkin,
): void {
  const wrapStart = 0.76;
  const wrapEnd = 0.93;
  const left = {
    x: start.x + (end.x - start.x) * wrapStart,
    y: start.y + (end.y - start.y) * wrapStart,
  };
  const right = {
    x: start.x + (end.x - start.x) * wrapEnd,
    y: start.y + (end.y - start.y) * wrapEnd,
  };
  context.strokeStyle = skin.wrap;
  context.lineWidth = 9;
  context.beginPath();
  context.moveTo(left.x, left.y);
  context.lineTo(right.x, right.y);
  context.stroke();
  context.strokeStyle = 'rgba(211, 180, 137, 0.17)';
  context.lineWidth = 1;
  for (let index = 1; index < 8; index += 1) {
    const progress = index / 8;
    const center = {
      x: left.x + (right.x - left.x) * progress,
      y: left.y + (right.y - left.y) * progress,
    };
    context.beginPath();
    context.moveTo(center.x - direction.y * 4, center.y + direction.x * 4);
    context.lineTo(center.x + direction.y * 4, center.y - direction.x * 4);
    context.stroke();
  }
}

function cueRoomLight(point: Vec2): number {
  const center = {
    x: billiardsView.table.left + billiardsView.table.width / 2,
    y: billiardsView.table.top + billiardsView.table.height / 2,
  };
  const normalizedDistance = Math.hypot(
    (point.x - center.x) / (billiardsView.table.width * 0.58),
    (point.y - center.y) / (billiardsView.table.height * 0.72),
  );
  return Math.max(0.18, 1 - normalizedDistance * 0.68);
}

function mixColor(color: string, amount: number): string {
  const value = color.replace('#', '');
  if (value.length !== 6) {
    return color;
  }
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  if (channels.some((channel) => !Number.isFinite(channel))) {
    return color;
  }
  const mixed = channels.map((channel) => Math.round(channel + (255 - channel) * amount));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function colorWithAlpha(color: string, alpha: number): string {
  const value = color.replace('#', '');
  if (value.length !== 6) {
    return `rgba(35, 16, 8, ${alpha})`;
  }
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
