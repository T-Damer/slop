import type { Vec2 } from '../domain/types.ts';
import type { BilliardsQualityMode } from './adaptive-quality-v2.ts';
import { worldToCanvas } from './coordinates.ts';
import type { BilliardsCueStrikeAnimation } from './effects-renderer.ts';
import { billiardsInteractionModes as modes, type BilliardsInteractionState } from './interaction-state-v2.ts';
import { billiardsView } from './registry.ts';
import type { BilliardsTableSkinV2 } from './table-skins-v2.ts';

const cueMaterial = {
  url: new URL('./assets/house-cue.svg', import.meta.url).href,
  length: 360, width: 14, tipWidth: 2.5, tipLength: 3, minLight: 0.4,
  preparedGap: 13, powerGap: 15,
} as const;
let texture: HTMLImageElement | null = null;
let failed = false;

export function isCueTextureReady(): boolean { return failed || (texture?.complete === true && texture.naturalWidth > 0); }
function image(): HTMLImageElement {
  if (texture === null) {
    texture = new Image(); texture.onerror = () => { failed = true; }; texture.src = cueMaterial.url;
  }
  return texture;
}

export interface BilliardsCueRenderOptionsV2 {
  readonly cueBallPosition: Vec2;
  readonly angleRadians: number;
  readonly power: number;
  readonly interaction: BilliardsInteractionState;
  readonly skin: BilliardsTableSkinV2;
  readonly quality: BilliardsQualityMode;
}

export function drawBilliardsCueV2(context: CanvasRenderingContext2D, options: BilliardsCueRenderOptionsV2): void {
  const locked = options.interaction.mode === modes.aimLocked || options.interaction.mode === modes.manualStroke;
  const gap = (locked ? cueMaterial.preparedGap + options.power * cueMaterial.powerGap : 0)
    + (options.interaction.stroke?.cueOffset ?? 0);
  drawCue(context, options.cueBallPosition, options.angleRadians, gap, locked ? 1 : 0.9, options.skin);
}

export function drawBilliardsCueStrikeV2(context: CanvasRenderingContext2D,
  animation: BilliardsCueStrikeAnimation | null, skin: BilliardsTableSkinV2, _quality: BilliardsQualityMode): void {
  if (animation === null) return;
  const contact = Math.min(1, animation.progress / 0.44);
  const recovery = Math.max(0, (animation.progress - 0.44) / 0.56);
  const pullback = (16 + animation.power * 45) * (1 - contact) ** 3 + recovery * 24;
  drawCue(context, animation.position, animation.angleRadians, pullback, 1 - recovery * 0.84, skin);
}

function drawCue(context: CanvasRenderingContext2D, position: Vec2, angle: number,
  pullback: number, alpha: number, skin: BilliardsTableSkinV2): void {
  const center = worldToCanvas(position), source = image();
  const gap = Math.max(cueMaterial.tipLength, billiardsView.cueGap + pullback);
  const light = Math.max(cueMaterial.minLight, 1 - Math.hypot(
    center.x / billiardsView.canvasWidth - skin.light.x,
    center.y / billiardsView.canvasHeight - skin.light.y));
  context.save(); context.translate(center.x, center.y); context.rotate(angle + Math.PI);
  context.globalAlpha *= alpha;
  context.beginPath(); context.moveTo(gap, -cueMaterial.tipWidth / 2);
  context.lineTo(gap + cueMaterial.length, -cueMaterial.width / 2);
  context.lineTo(gap + cueMaterial.length, cueMaterial.width / 2);
  context.lineTo(gap, cueMaterial.tipWidth / 2); context.closePath();
  context.shadowColor = 'rgba(0,0,0,.32)'; context.shadowBlur = 3; context.shadowOffsetY = 3;
  context.fillStyle = '#b58346'; context.fill(); context.shadowBlur = 0; context.shadowOffsetY = 0;
  if (source.complete && source.naturalWidth > 0) {
    context.drawImage(source, gap, -cueMaterial.width / 2, cueMaterial.length, cueMaterial.width);
  }
  context.save(); context.clip(); context.globalAlpha *= 1 - light;
  context.fillStyle = '#080806'; context.fillRect(gap, -cueMaterial.width / 2, cueMaterial.length, cueMaterial.width);
  context.restore();
  context.fillStyle = skin.cue.tip;
  context.fillRect(gap - cueMaterial.tipLength, -cueMaterial.tipWidth / 2, cueMaterial.tipLength, cueMaterial.tipWidth);
  context.restore();
}
