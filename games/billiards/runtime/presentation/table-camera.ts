import { graphicsSettings, prefersReducedMotion } from '../../../shared/game-shell/graphics-settings.ts';
import type { Vec2 } from '../domain/types.ts';
import type { BilliardsControllerSnapshotV2, BilliardsGameControllerV2 } from './controller-v2.ts';
import { worldToCanvas } from './coordinates.ts';
import { cameraScale, cameraTuning as tuning, clampCamera, rotateCameraPoint, screenToScene, type CameraPose } from './camera-geometry.ts';
import { billiardsView } from './registry.ts';

/** One camera for drawing and input: pointer code uses the transformed canvas rect.
 * No auto motion while a cue gesture is held; two fingers exclusively own pan/zoom. */
export class BilliardsTableCamera {
  private pose: CameraPose = { ...tuning.centre, zoom: 1 };
  private target = this.pose;
  private width = 1;
  private height = 1;
  private portrait = false;
  private lastMode = '';
  private lastRevision = -1;
  private pointers = new Map<number, Vec2>();
  private multi = false;
  private pinch: { distance: number; anchor: Vec2; zoom: number } | null = null;
  private readonly resize: ResizeObserver;
  private readonly stage: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly controller: BilliardsGameControllerV2;
  private readonly button: HTMLButtonElement;
  private readonly removeSettings: () => void;
  private readonly events = new AbortController();

  public constructor(stage: HTMLElement, canvas: HTMLCanvasElement, controller: BilliardsGameControllerV2, button: HTMLButtonElement) {
    this.stage = stage; this.canvas = canvas; this.controller = controller; this.button = button;
    this.resize = new ResizeObserver(() => this.measure()); this.resize.observe(stage);
    const listeners = { signal: this.events.signal };
    const captured = { ...listeners, capture: true };
    stage.addEventListener('pointerdown', this.down, captured);
    stage.addEventListener('pointermove', this.move, captured);
    stage.addEventListener('pointerup', this.up, captured);
    stage.addEventListener('pointercancel', this.cancel, captured);
    button.addEventListener('click', this.toggle, listeners);
    window.addEventListener('blur', this.cancel, listeners);
    document.addEventListener('visibilitychange', this.cancel, listeners);
    this.removeSettings = graphicsSettings.subscribe(() => {
      if (!graphicsSettings.get().autoZoom || prefersReducedMotion()) this.overview();
    });
    this.measure();
  }

  public synchronize(snapshot: BilliardsControllerSnapshotV2): void {
    const mode = snapshot.interaction.mode;
    if (snapshot.match.revision !== this.lastRevision) {
      if (snapshot.match.activeShot !== null || snapshot.match.table.step === 0) this.overview();
      this.lastRevision = snapshot.match.revision;
    }
    if (mode !== this.lastMode) {
      if (mode === 'aim-locked' && this.lastMode === 'aiming' && this.portrait
        && graphicsSettings.get().autoZoom && !prefersReducedMotion()) this.focusAim(snapshot);
      if (mode === 'aiming' && this.lastMode === 'aim-locked') this.overview();
      this.lastMode = mode;
    }
  }

  public advance(seconds: number): void {
    if (this.pointers.size > 0) return;
    const amount = prefersReducedMotion() ? 1 : 1 - Math.exp(-tuning.easingPerSecond * seconds);
    const next = { x: this.pose.x + (this.target.x - this.pose.x) * amount,
      y: this.pose.y + (this.target.y - this.pose.y) * amount,
      zoom: this.pose.zoom + (this.target.zoom - this.pose.zoom) * amount };
    if (Math.abs(next.zoom - this.pose.zoom) + Math.abs(next.x - this.pose.x) + Math.abs(next.y - this.pose.y) < tuning.settleEpsilon) {
      if (this.pose !== this.target) { this.pose = this.target; this.apply(); }
      return;
    }
    this.pose = next; this.apply();
  }

  public snapshot() { return { ...this.pose, portrait: this.portrait, multiTouch: this.multi, settled: this.pose === this.target, targetZoom: this.target.zoom }; }
  public overview(): void { this.target = { ...tuning.centre, zoom: 1 }; }
  public dispose(): void {
    this.resize.disconnect(); this.removeSettings();
    this.events.abort();
    this.pointers.clear();
  }

  private focusAim(snapshot: BilliardsControllerSnapshotV2): void {
    const cue = snapshot.match.table.balls.find((ball) => ball.id === 0 && !ball.pocketed);
    if (!cue) return;
    const from = worldToCanvas(cue.position), to = worldToCanvas(snapshot.preview.cuePath.at(-1) ?? cue.position);
    const dx = Math.abs(to.x - from.x) + tuning.focusMargin * 2, dy = Math.abs(to.y - from.y) + tuning.focusMargin * 2;
    const fit = Math.min(this.width / (this.portrait ? dy : dx), this.height / (this.portrait ? dx : dy));
    const zoom = Math.max(1, Math.min(tuning.aimZoom, fit / cameraScale(this.width, this.height, this.portrait)));
    this.target = clampCamera({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, zoom }, this.width, this.height, this.portrait);
  }

  private readonly toggle = (): void => {
    if (this.target.zoom > 1.05) this.overview();
    else {
      this.focusAim(this.controller.snapshot());
      if (this.target.zoom < 1.1) {
        const cue = this.controller.snapshot().match.table.balls.find((ball) => ball.id === 0);
        const centre = cue ? worldToCanvas(cue.position) : tuning.centre;
        this.target = clampCamera({ ...centre, zoom: tuning.aimZoom }, this.width, this.height, this.portrait);
      }
    }
  };
  private measure(): void {
    const rect = this.stage.getBoundingClientRect();
    this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
    this.portrait = matchMedia('(orientation: portrait)').matches;
    this.controller.cancelManualStroke(); this.cancel(); this.overview(); this.pose = this.target; this.apply();
  }
  private apply(): void {
    const scale = cameraScale(this.width, this.height, this.portrait) * this.pose.zoom;
    const offset = rotateCameraPoint({ x: tuning.centre.x - this.pose.x, y: tuning.centre.y - this.pose.y }, this.portrait);
    Object.assign(this.canvas.style, { width: `${billiardsView.canvasWidth * scale}px`, height: `${billiardsView.canvasHeight * scale}px`,
      left: `${this.width / 2 + offset.x * scale}px`, top: `${this.height / 2 + offset.y * scale}px`,
      transform: `translate(-50%, -50%) rotate(${this.portrait ? 90 : 0}deg)` });
    this.stage.dataset.cameraZoom = this.pose.zoom.toFixed(2);
    this.button.textContent = this.pose.zoom > 1.05 ? 'Обзор' : 'Приблизить';
    this.button.setAttribute('aria-label', this.pose.zoom > 1.05 ? 'Показать весь стол' : 'Приблизить шары');
  }
  private point(event: PointerEvent): Vec2 {
    const rect = this.stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  private pair() {
    const [a, b] = [...this.pointers.values()];
    return { midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.max(tuning.pinchMinimum, Math.hypot(b.x - a.x, b.y - a.y)) };
  }
  private readonly down = (event: PointerEvent): void => {
    if (event.target !== this.canvas || event.button !== 0) return;
    this.pointers.set(event.pointerId, this.point(event)); this.target = this.pose;
    if (this.pointers.size < 2) return;
    this.multi = true; this.controller.cancelManualStroke();
    this.canvas.dispatchEvent(new Event(tuning.cancelGestureEvent));
    const pair = this.pair();
    this.pinch = { distance: pair.distance, zoom: this.pose.zoom,
      anchor: screenToScene(pair.midpoint, this.pose, this.width, this.height, this.portrait) };
    for (const id of this.pointers.keys()) this.canvas.setPointerCapture(id);
    event.preventDefault(); event.stopImmediatePropagation();
  };
  private readonly move = (event: PointerEvent): void => {
    if (this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, this.point(event));
    if (!this.multi) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (this.pointers.size < 2 || this.pinch === null) return;
    const pair = this.pair(), zoom = Math.min(tuning.maxZoom, Math.max(1, this.pinch.zoom * pair.distance / this.pinch.distance));
    const relative = screenToScene(pair.midpoint, { x: 0, y: 0, zoom }, this.width, this.height, this.portrait);
    this.pose = this.target = clampCamera({ zoom, x: this.pinch.anchor.x - relative.x, y: this.pinch.anchor.y - relative.y }, this.width, this.height, this.portrait);
    this.apply();
  };
  private readonly up = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    if (this.multi) { event.preventDefault(); event.stopImmediatePropagation(); }
    if (this.pointers.size === 0) { this.multi = false; this.pinch = null; }
  };
  private readonly cancel = (): void => { this.pointers.clear(); this.multi = false; this.pinch = null; };
}
