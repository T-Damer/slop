import * as THREE from 'three';
import type { IslandBlueprint, IslandDestinationId, IslandPortalProgress } from '../domain/types.ts';
import { IslandLife, type IslandJournal } from '../domain/life.ts';
import { createHomeState, type HomeState } from '../domain/home-registry.ts';
import { soundDefaults, type SoundMix } from '../domain/sound-settings.ts';
import { canWalkInHome } from '../domain/home-space.ts';
import { islandSurface } from '../domain/village-paths.ts';
import { walkOnIsland, walkWithObstacles } from '../domain/walking.ts';
import { createIslandMovementInput, type IslandMovementInput } from './input.ts';
import { createIslandWorld, type IslandWorldHandles } from './world.ts';
import { IslandCamera } from './camera.ts';
import { IslandRendering } from './rendering.ts';
import { islandArt } from './art-direction.ts';
import { HomeController } from './home-controller.ts';
import { IslandSoundscape } from './soundscape.ts';
import { IslandSoundPanel } from './sound-panel.ts';
import { animateResident } from './residents.ts';

export interface IslandSceneCallbacks {
  readonly onPortalProgress: (progress: IslandPortalProgress) => void;
  readonly onLaunchGame: (destinationId: IslandDestinationId) => void;
  readonly onHomeChanged?: (state: HomeState) => boolean;
  readonly onSoundChanged?: (mix: SoundMix) => boolean;
  readonly onJournalChanged?: (journal: IslandJournal) => boolean;
}
export type IslandSceneSnapshot = ReturnType<PersonalIslandScene['snapshot']>;

export class PersonalIslandScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new IslandCamera();
  private readonly rendering: IslandRendering;
  private readonly world: IslandWorldHandles;
  private readonly input: IslandMovementInput;
  private readonly home: HomeController;
  private readonly sound: IslandSoundscape;
  private readonly soundPanel: IslandSoundPanel;
  private readonly life: IslandLife;
  private readonly canvas: HTMLCanvasElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly actionButton: HTMLButtonElement | null;
  private readonly journalLabel: HTMLElement | null;
  private readonly toast: HTMLElement | null;
  private animationFrame = 0;
  private lastFrameAt = 0;
  private time = 0;
  private toastUntil = 0;
  private effectUntil = 0;
  private menuPaused = false;
  private blurred = false;
  private contextLost = false;
  private disposed = false;
  private portal: IslandPortalProgress = { destinationId: null, progress: 0 };

  public constructor(private readonly host: HTMLElement, inputRoot: HTMLElement,
    private readonly blueprint: IslandBlueprint, private readonly callbacks: IslandSceneCallbacks,
    journal: IslandJournal = { completed: [] }, homeState: HomeState = createHomeState(),
    soundMix: SoundMix = { ...soundDefaults }) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'island-canvas';
    this.canvas.setAttribute('aria-label', 'Остров: WASD или стрелки — ходьба, Shift — бег, E — действие');
    host.append(this.canvas);
    this.scene.background = new THREE.Color(blueprint.palette.sky);
    this.scene.fog = new THREE.Fog(blueprint.palette.sky, islandArt.render.fogNear, islandArt.render.fogFar);
    this.rendering = new IslandRendering(this.canvas, this.scene, this.camera.camera);
    this.world = createIslandWorld(blueprint);
    this.scene.add(this.world.root);
    this.scene.add(this.world.player);
    this.life = new IslandLife(blueprint, journal);
    this.world.applyJournal(this.life.journal);
    this.input = createIslandMovementInput(inputRoot);
    this.sound = new IslandSoundscape(inputRoot, soundMix);
    this.soundPanel = new IslandSoundPanel(inputRoot, this.sound, soundMix,
      (mix) => this.callbacks.onSoundChanged?.(mix) ?? false);
    this.home = new HomeController(inputRoot, this.scene, this.world.player, blueprint, homeState, {
      context: (inside) => this.changeContext(inside), inputChanged: () => this.syncInput(),
      message: (text) => this.showToast(text), sound: (kind) => this.sound.event(kind),
      save: (state) => this.callbacks.onHomeChanged?.(state) ?? false,
    });
    this.canvas.addEventListener('click', this.pickFurniture);
    this.actionButton = inputRoot.querySelector('[data-island-interact]');
    this.journalLabel = inputRoot.querySelector('[data-island-journal]');
    this.toast = inputRoot.querySelector('[data-island-toast]');
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(host);
    this.resize();
    this.camera.update(this.world.player.position, 0, true);
    document.addEventListener('visibilitychange', this.syncPause);
    window.addEventListener('blur', this.blur);
    window.addEventListener('focus', this.focus);
    this.canvas.addEventListener('webglcontextlost', this.loseContext);
    this.canvas.addEventListener('webglcontextrestored', this.restoreContext);
    this.syncPause();
  }

  public notify(message: string): void { this.showToast(message); }
  public cycleCamera() { return this.camera.cycle(); }
  public setPaused(paused: boolean): void { this.menuPaused = paused; this.syncPause(); }
  public snapshot() {
    return { player: { x: this.world.player.position.x, z: this.world.player.position.z },
      cameraMode: this.camera.mode, portal: this.portal, renderer: this.rendering.snapshot(),
      paused: this.paused, simulationTime: this.time, fruit: this.life.fruit, planted: this.life.planted,
      home: this.home.snapshot(), audio: this.sound.snapshot(),
      journal: this.life.journal, targets: this.life.targets };
  }
  public destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.syncPause);
    window.removeEventListener('blur', this.blur);
    window.removeEventListener('focus', this.focus);
    this.canvas.removeEventListener('webglcontextlost', this.loseContext);
    this.canvas.removeEventListener('webglcontextrestored', this.restoreContext);
    this.canvas.removeEventListener('click', this.pickFurniture);
    this.soundPanel.destroy(); this.sound.dispose(); this.home.destroy();
    this.world.root.add(this.world.player);
    this.input.destroy();
    this.world.dispose();
    this.rendering.dispose();
    this.canvas.remove();
  }
  private get paused(): boolean {
    return this.menuPaused || this.blurred || this.contextLost || document.hidden;
  }
  private readonly blur = (): void => { this.blurred = true; this.syncPause(); };
  private readonly focus = (): void => { this.blurred = false; this.syncPause(); };
  private readonly loseContext = (event: Event): void => {
    event.preventDefault(); this.contextLost = true; this.syncPause();
    this.showToast('Графический контекст потерян. Ожидаем восстановления браузером.');
  };
  private readonly restoreContext = (): void => { this.contextLost = false; this.syncPause(); };
  private readonly syncPause = (): void => {
    if (this.disposed) return;
    cancelAnimationFrame(this.animationFrame);
    this.lastFrameAt = 0;
    this.life.resetProgress();
    this.portal = { destinationId: null, progress: 0 };
    this.callbacks.onPortalProgress(this.portal);
    this.syncInput();
    this.sound.setPaused(this.paused);
    if (!this.paused) this.animationFrame = requestAnimationFrame(this.renderFrame);
  };
  private readonly resize = (): void => {
    if (this.disposed) return;
    this.camera.resize(this.host.clientWidth, this.host.clientHeight);
    this.rendering.resize(this.host.clientWidth, this.host.clientHeight);
  };
  private readonly renderFrame = (timestamp: number): void => {
    if (this.disposed || this.paused) return;
    const elapsed = this.lastFrameAt === 0 ? 0 : (timestamp - this.lastFrameAt) / 1000;
    this.lastFrameAt = timestamp;
    const delta = Math.max(0, Math.min(0.05, elapsed));
    this.time += delta;
    this.home.tick(delta);
    this.movePlayer(delta);
    this.updateLife(delta);
    if (this.disposed || this.paused) return;
    this.animateWorld();
    this.sound.update(new Date().getHours(), this.home.inside ? 0 : 8 - Math.hypot(this.world.player.position.x, this.world.player.position.z));
    this.camera.update(this.world.player.position, delta);
    this.rendering.draw(elapsed);
    this.animationFrame = requestAnimationFrame(this.renderFrame);
  };
  private movePlayer(delta: number): void {
    if (this.home.blocked) return;
    const input = this.input.read();
    if (this.home.resting) {
      if (Math.hypot(input.x, input.z) > 0) this.home.stand();
      else return;
    }
    const player = this.world.player;
    const next = this.home.inside
      ? walkWithObstacles(player.position, input, delta, this.input.running(), (point) => canWalkInHome(point, this.home.state))
      : walkOnIsland(player.position, input, delta, this.input.running(), this.blueprint);
    const distance = Math.hypot(next.x - player.position.x, next.z - player.position.z);
    if (distance > 0) {
      const facing = Math.atan2(next.x - player.position.x, next.z - player.position.z);
      const difference = Math.atan2(Math.sin(facing - player.rotation.y), Math.cos(facing - player.rotation.y));
      player.rotation.y += difference * (1 - Math.exp(-islandArt.motion.turn * delta));
    }
    this.sound.step(distance, this.home.inside ? 'wood' : islandSurface(next, this.blueprint));
    player.position.x = next.x;
    player.position.z = next.z;
    animateResident(player, this.time, delta > 0 ? distance / delta : 0, this.reduced.matches);
  }
  private updateLife(delta: number): void {
    const action = this.input.consumeAction();
    const homeLabel = this.home.label();
    if (this.home.inside || homeLabel !== null) {
      if (action) this.home.activate();
      if (this.actionButton !== null) {
        this.actionButton.textContent = this.home.label() ?? 'Подойди к мебели или двери';
        this.actionButton.disabled = this.home.label() === null || this.home.blocked;
      }
      return;
    }
    const update = this.life.step(this.world.player.position, delta, action);
    this.portal = { destinationId: update.target?.destination ?? null,
      progress: update.target?.kind === 'portal' ? update.progress : 0 };
    this.callbacks.onPortalProgress(this.portal);
    if (this.actionButton !== null) {
      const label = update.target?.kind === 'portal' ? 'Останься у таблички…'
        : update.target?.label ?? 'Подойди к дереву или жителю';
      if (this.actionButton.textContent !== label) this.actionButton.textContent = label;
      this.actionButton.disabled = update.target === null || update.target.kind === 'portal';
    }
    if (this.journalLabel !== null) {
      const text = `Яблоки ${this.life.fruit} · Сад ${this.life.planted}/3`;
      if (this.journalLabel.textContent !== text) this.journalLabel.textContent = text;
    }
    if (update.changed) {
      this.world.applyJournal(this.life.journal);
      this.sound.event(update.target?.kind === 'fruit' ? 'harvest' : update.target?.kind === 'garden' ? 'planting' : 'voice');
      this.effectUntil = this.time + islandArt.motion.effectSeconds;
      const saved = this.callbacks.onJournalChanged?.(this.life.journal) ?? true;
      this.showToast(saved ? update.message ?? '' : 'Изменение сохранено только в этой сессии: хранилище недоступно.');
    } else if (update.message !== null) this.showToast(update.message);
    if (update.destination !== null) {
      this.setPaused(true);
      this.callbacks.onLaunchGame(update.destination);
    }
  }
  private animateWorld(): void {
    if (this.toast !== null && this.time > this.toastUntil) this.toast.hidden = true;
    if (this.home.inside) return;
    const time = this.reduced.matches ? 0 : this.time;
    animateResident(this.world.guide, time + 1.7, 0, this.reduced.matches);
    this.world.landscape.time.value = time * islandArt.motion.oceanWave;
    this.world.landscape.foam.opacity = 0.45 + Math.sin(time * 1.3) * 0.12;
    const shore = this.world.root.getObjectByName(islandArt.names.shore);
    if (shore !== undefined) shore.scale.setScalar(1 + Math.sin(time * 1.1) * islandArt.motion.shorePulse);
    const remaining = Math.max(0, this.effectUntil - this.time) / islandArt.motion.effectSeconds;
    this.world.player.scale.setScalar(1 + (this.reduced.matches ? 0 : Math.sin(remaining * Math.PI) * 0.09));

  }
  private syncInput(): void { this.input.setEnabled(!this.paused && !this.home.blocked); }
  private changeContext(inside: boolean): void {
    this.world.root.visible = !inside;
    this.scene.background = new THREE.Color(inside ? 0xe1d9c6 : this.blueprint.palette.sky);
    this.scene.fog = inside ? null : new THREE.Fog(this.blueprint.palette.sky, islandArt.render.fogNear, islandArt.render.fogFar);
    this.camera.setIndoors(inside); this.rendering.setIndoors(inside); this.sound.setIndoors(inside);
    this.camera.update(this.world.player.position, 0, true);
    this.life.resetProgress(); this.portal = { destinationId: null, progress: 0 };
    this.callbacks.onPortalProgress(this.portal);
  }
  private readonly pickFurniture = (event: MouseEvent): void => {
    this.home.pick(event.clientX, event.clientY, this.canvas, this.camera.camera);
  };
  private showToast(message: string): void {
    if (this.toast === null) return;
    this.toast.textContent = message;
    this.toast.hidden = false;
    this.toastUntil = this.time + 4;
  }
}
