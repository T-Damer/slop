import { billiardsPhysics } from '../domain/registry.ts';
import { tablePreset } from '../domain/table-presets.ts';
import type { BilliardsBallState, BilliardsTableState, Vec2 } from '../domain/types.ts';
import type { BilliardsQualityMode } from './adaptive-quality-v2.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import { ballColor, billiardsView } from './registry.ts';
import { rollBall, sphereSurface as material, surfaceMatrix, sphereTexel, type BallOrientation } from './sphere-surface.ts';
import type { BilliardsTableSkinV2 } from './table-skins-v2.ts';

interface RollingState { position: Vec2; orientation: BallOrientation; step: number }
interface BallSprite { readonly key: string; readonly canvas: HTMLCanvasElement }

/** Bounded caches: one sprite and one number texture per ball, not per angle. */
export class BilliardsBallRendererV2 {
  private readonly rolling = new Map<number, RollingState>();
  private readonly sprites = new Map<number, BallSprite>();
  private readonly numbers = new Map<number, Uint8ClampedArray>();
  private readonly shadow = createShadow();
  private spriteBuildCount = 0;
  private rollingBallCount = 0;
  private litBallCount = 0;

  public draw(context: CanvasRenderingContext2D, table: BilliardsTableState,
    skin: BilliardsTableSkinV2, quality: BilliardsQualityMode, hideCue = false): void {
    const radius = tablePreset(table).ballRadius;
    this.rollingBallCount = 0; this.litBallCount = 0;
    for (const ball of table.balls) {
      if (ball.pocketed) { this.rolling.delete(ball.id); continue; }
      const old = this.rolling.get(ball.id);
      const dx = ball.position.x - (old?.position.x ?? ball.position.x);
      const dy = ball.position.y - (old?.position.y ?? ball.position.y);
      const reset = old === undefined || table.step <= old.step || Math.hypot(dx, dy) > radius * 8;
      const orientation = reset
        ? (old?.step === table.step && dx === 0 && dy === 0 ? old.orientation : material.identity)
        : rollBall(old.orientation, dx, dy, radius);
      this.rolling.set(ball.id, { position: ball.position, orientation, step: table.step });
      if (hideCue && ball.id === 0) continue;
      this.drawBall(context, ball.id, ball.position, orientation, radius, skin, quality);
      this.litBallCount += 1;
      if (Math.hypot(ball.velocity.x, ball.velocity.y) > billiardsPhysics.stopSpeed) this.rollingBallCount += 1;
    }
  }

  public drawPlacementPreview(context: CanvasRenderingContext2D, position: Vec2,
    valid: boolean, skin: BilliardsTableSkinV2, radius: number = billiardsPhysics.ballRadius): void {
    context.save(); context.globalAlpha = valid ? 0.58 : 0.34;
    this.drawBall(context, 0, position, material.identity, radius, skin, 'balanced');
    const center = worldToCanvas(position);
    context.globalAlpha = 0.9; context.strokeStyle = valid ? '#91e4af' : '#ff8f7d';
    context.lineWidth = 2; context.setLineDash([5, 4]); context.beginPath();
    context.arc(center.x, center.y, worldLengthToCanvas(radius) + 6, 0, Math.PI * 2);
    context.stroke(); context.restore();
  }

  public reset(): void { this.rolling.clear(); this.sprites.clear(); }
  public debugSnapshot() {
    return { rollingBallCount: this.rollingBallCount, litBallCount: this.litBallCount,
      spriteBuildCount: this.spriteBuildCount, cachedSprites: this.sprites.size };
  }

  private drawBall(context: CanvasRenderingContext2D, id: number, position: Vec2,
    orientation: BallOrientation, radius: number, skin: BilliardsTableSkinV2, quality: BilliardsQualityMode): void {
    const center = worldToCanvas(position), size = worldLengthToCanvas(radius);
    const lightX = Math.round(center.x / material.lightCellPixels) * material.lightCellPixels;
    const lightY = Math.round(center.y / material.lightCellPixels) * material.lightCellPixels;
    const key = `${quality}:${skin.id}:${lightX}:${lightY}:${orientation.map((v) => Math.round(v * material.rotationQuantization)).join(':')}`;
    let sprite = this.sprites.get(id);
    if (sprite?.key !== key) {
      let texture = this.numbers.get(id);
      if (texture === undefined) { texture = createNumberTexture(id); this.numbers.set(id, texture); }
      sprite = { key, canvas: shadeSphere(id, orientation, lightX, lightY, skin, quality, texture) };
      this.sprites.set(id, sprite); this.spriteBuildCount += 1;
    }
    const awayX = (center.x / billiardsView.canvasWidth - skin.light.x) * size;
    const awayY = (center.y / billiardsView.canvasHeight - skin.light.y) * size;
    context.drawImage(this.shadow, center.x - size * 1.4 + awayX,
      center.y - size * 0.65 + size * 0.4 + awayY, size * 2.8, size * 1.3);
    context.drawImage(sprite.canvas, center.x - size, center.y - size, size * 2, size * 2);
  }
}

function shadeSphere(id: number, orientation: BallOrientation, centerX: number, centerY: number,
  skin: BilliardsTableSkinV2, quality: BilliardsQualityMode, number: Uint8ClampedArray): HTMLCanvasElement {
  const size = material.spriteSizes[quality], canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d')!;
  const pixels = context.createImageData(size, size), matrix = surfaceMatrix(orientation);
  const base = hexRgb(ballColor(id)), white = [242, 237, 221];
  const light = [skin.light.x - centerX / billiardsView.canvasWidth,
    skin.light.y - centerY / billiardsView.canvasHeight, skin.light.height];
  const norm = Math.hypot(...light); light.forEach((v, i) => { light[i] = v / norm; });
  const half = [light[0], light[1], light[2] + 1], halfNorm = Math.hypot(...half);
  half.forEach((v, i) => { half[i] = v / halfNorm; });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size * 2 - 1, ny = (y + 0.5) / size * 2 - 1;
      const surface = sphereTexel(nx, ny, matrix);
      if (surface === null) continue;
      const nz = Math.sqrt(1 - nx * nx - ny * ny), [u, v, z] = surface;
      const cap = id !== 0 && u * u + v * v < material.capRadius ** 2;
      const albedo = id > 8 && Math.abs(v) > material.stripeHalfWidth ? white : base;
      const tx = Math.min(material.textureSize - 1, Math.max(0,
        Math.floor((u * Math.sign(z) / material.capRadius + 1) / 2 * material.textureSize)));
      const ty = Math.min(material.textureSize - 1, Math.max(0,
        Math.floor((v / material.capRadius + 1) / 2 * material.textureSize)));
      const textureIndex = (ty * material.textureSize + tx) * 4;
      const diffuse = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
      const halfDot = Math.max(0, nx * half[0] + ny * half[1] + nz * half[2]);
      const specular = Math.pow(halfDot, material.specularPower) * (quality === 'low' ? 0.65 : 0.95);
      const sheen = quality === 'low' ? 0 : Math.pow(halfDot, 16) * 0.08;
      const shade = material.ambient + material.diffuse * diffuse;
      const index = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const pigment = cap ? number[textureIndex + channel] : albedo[channel];
        pixels.data[index + channel] = Math.min(255, pigment * shade + (specular + sheen) * (255 - channel * 9));
      }
      pixels.data[index + 3] = Math.min(255, (1 - Math.hypot(nx, ny)) * size * 255);
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function createNumberTexture(id: number): Uint8ClampedArray {
  const canvas = document.createElement('canvas'), size = material.textureSize;
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.fillStyle = '#f2eddd'; context.fillRect(0, 0, size, size);
  context.fillStyle = '#16181b'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = `bold ${size * 0.66}px sans-serif`; context.fillText(String(id), size / 2, size * 0.54);
  return context.getImageData(0, 0, size, size).data;
}

function createShadow(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = material.textureSize;
  const context = canvas.getContext('2d')!, center = material.textureSize / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(0,10,7,.74)'); gradient.addColorStop(0.5, 'rgba(0,10,7,.42)');
  gradient.addColorStop(1, 'rgba(0,10,7,0)'); context.fillStyle = gradient;
  context.fillRect(0, 0, material.textureSize, material.textureSize); return canvas;
}

function hexRgb(value: string): readonly number[] {
  return [Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16)];
}
