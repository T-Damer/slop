import * as THREE from 'three';
import { homeRules, homeCatalog, type HomeState } from '../domain/home-registry.ts';
import { changeHomeItem, nearestHomeItem } from '../domain/home.ts';
import { canWalkInHome, isAtHouseEntrance, houseEntrance } from '../domain/home-space.ts';
import type { IslandBlueprint, IslandPoint } from '../domain/types.ts';
import { canWalkOnIsland } from '../domain/walking.ts';
import { HomeInterior } from './home-interior.ts';
import { HomePanel } from './home-panel.ts';
import { homeLook } from './home-models.ts';
import { islandArt } from './art-direction.ts';
import type { IslandSoundEvent } from './audio-score.ts';

interface HomeActions {
  context(inside: boolean): void;
  inputChanged(): void;
  message(text: string): void;
  sound(kind: IslandSoundEvent): void;
  save(state: HomeState): boolean;
}
/** Interior lifecycle only: validation and item mutations stay in the pure home domain. */
export class HomeController {
  public inside = false;
  public state: HomeState;
  private interior: HomeInterior | null = null;
  private panel: HomePanel | null = null;
  private outside: IslandPoint;
  private standing: IslandPoint | null = null;
  private transition = 0;
  private readonly button = document.createElement('button');
  private readonly location = document.createElement('div');
  private readonly raycaster = new THREE.Raycaster();
  public constructor(private readonly root: HTMLElement, private readonly scene: THREE.Scene,
    private readonly player: THREE.Group, private readonly blueprint: IslandBlueprint,
    state: HomeState, private readonly actions: HomeActions) {
    this.state = state;
    this.outside = blueprint.playerSpawn;
    this.button.type = 'button'; this.button.textContent = 'Обустроить';
    this.button.dataset.islandFurnish = ''; this.button.hidden = true;
    root.querySelector('.island-play-actions')?.prepend(this.button);
    this.button.addEventListener('click', this.edit);
    this.location.className = 'island-location'; this.location.hidden = true;
    this.location.textContent = 'Мой дом'; root.append(this.location);
  }
  public get blocked(): boolean { return this.panel !== null || this.transition > 0; }
  public get resting(): boolean { return this.standing !== null; }
  public snapshot() {
    return { inside: this.inside, editing: this.panel !== null, resting: this.resting,
      transition: this.transition, state: this.state, draft: this.panel?.editor.state ?? null,
      entrance: houseEntrance(this.blueprint), exit: homeRules.door };
  }
  public tick(delta: number): void {
    if (this.transition <= 0) return;
    this.transition = Math.max(0, this.transition - delta);
    if (this.transition === 0) {
      this.root.classList.remove('island-transitioning'); this.actions.inputChanged();
    }
  }
  public label(): string | null {
    if (this.blocked) return 'Обустройство дома';
    if (!this.inside) return isAtHouseEntrance(this.player.position, this.blueprint) ? 'Войти домой' : null;
    if (this.resting) return 'Встать';
    if (this.atExit()) return 'Выйти на остров';
    const item = nearestHomeItem(this.state, this.player.position);
    return item === null ? null : homeCatalog[item.kind].action;
  }
  public activate(): boolean {
    if (this.blocked) return true;
    if (!this.inside) {
      if (!isAtHouseEntrance(this.player.position, this.blueprint)) return false;
      try {
        if (this.interior === null) { this.interior = new HomeInterior(this.state); this.scene.add(this.interior.root); }
      } catch { this.actions.message('Не удалось открыть дом. Можно продолжить прогулку.'); return true; }
      this.outside = { x: this.player.position.x, z: this.player.position.z };
      this.switchContext(true, homeRules.door); return true;
    }
    if (this.resting) { this.stand(); return true; }
    if (this.atExit()) {
      const exit = canWalkOnIsland(this.outside, this.blueprint) ? this.outside : this.blueprint.playerSpawn;
      this.switchContext(false, exit); return true;
    }
    const item = nearestHomeItem(this.state, this.player.position);
    if (item === null) return true;
    if (item.kind === 'lamp') {
      const next = changeHomeItem(this.state, item.id, { kind: 'toggle' });
      if (next.error === null && this.actions.save(next.state)) {
        this.state = next.state; this.interior?.apply(this.state); this.actions.sound('lamp');
      } else this.actions.message('Свет не изменён: сохранить состояние не удалось.');
    } else if (item.kind === 'chair' || item.kind === 'bed') this.rest(item);
    else if (item.kind === 'cabinet') this.edit();
    else this.actions.message(homeLook.notes[item.kind]);
    return true;
  }
  public stand(): void {
    if (this.standing === null) return;
    const position = canWalkInHome(this.standing, this.state) ? this.standing : homeRules.door;
    this.player.position.set(position.x, islandArt.ground, position.z);
    this.player.rotation.x = 0; this.player.rotation.z = 0;
    this.standing = null;
  }
  public pick(x: number, y: number, canvas: HTMLCanvasElement, camera: THREE.Camera): void {
    if (this.panel === null || this.interior === null) return;
    const rect = canvas.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1,
      1 - (y - rect.top) / rect.height * 2), camera);
    const id = this.interior.pick(this.raycaster);
    if (id !== null) this.panel.selectItem(id);
  }
  public destroy(): void {
    this.panel?.destroy(); this.panel = null;
    this.button.removeEventListener('click', this.edit); this.button.remove(); this.location.remove();
    this.interior?.dispose(); this.interior?.root.removeFromParent();
    this.root.classList.remove('island-transitioning');
  }
  private atExit(): boolean {
    return Math.hypot(this.player.position.x - homeRules.door.x, this.player.position.z - homeRules.door.z) < homeRules.doorRadius;
  }
  private switchContext(inside: boolean, position: IslandPoint): void {
    this.inside = inside;
    if (this.interior !== null) this.interior.root.visible = inside;
    this.player.position.set(position.x, islandArt.ground, position.z);
    this.player.rotation.set(0, inside ? Math.PI : this.blueprint.house.rotation, 0);
    this.button.hidden = !inside; this.location.hidden = !inside;
    this.root.querySelector('.personal-island')?.classList.toggle('is-indoors', inside);
    this.transition = homeLook.transitionSeconds;
    this.root.classList.add('island-transitioning');
    this.actions.sound('door'); this.actions.context(inside); this.actions.inputChanged();
  }
  private rest(item: HomeState['items'][number]): void {
    this.standing = { x: this.player.position.x, z: this.player.position.z };
    this.player.position.set(item.x, islandArt.ground + 0.1, item.z);
    this.player.rotation.set(0, item.rotation * Math.PI / 2, 0);
    for (const name of [islandArt.names.leftLeg, islandArt.names.rightLeg]) {
      const limb = this.player.getObjectByName(name);
      if (limb !== undefined) limb.rotation.x = item.kind === 'bed' ? 0 : -Math.PI / 2;
    }
    if (item.kind === 'bed') {
      this.player.position.y = 0.72;
      this.player.position.x += Math.sin(this.player.rotation.y) * 0.65;
      this.player.position.z += Math.cos(this.player.rotation.y) * 0.65;
      this.player.rotation.x = -Math.PI / 2;
    }
    this.actions.sound('furniture');
  }
  private readonly edit = (): void => {
    if (!this.inside || this.blocked) return;
    this.stand();
    this.panel = new HomePanel(this.root, this.state, {
      preview: (state, selected) => this.interior?.apply(state, selected),
      save: (state) => {
        if (!this.actions.save(state)) return false;
        this.state = state; this.actions.sound('furniture'); this.actions.message(homeRules.messages.saved); return true;
      },
      close: () => {
        this.panel?.destroy(); this.panel = null; this.interior?.apply(this.state);
        if (!canWalkInHome(this.player.position, this.state)) this.player.position.set(homeRules.door.x, islandArt.ground, homeRules.door.z);
        this.actions.inputChanged();
      },
      sound: () => this.actions.sound('ui'),
    });
    this.actions.inputChanged();
  };
}
