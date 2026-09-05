import * as THREE from 'three';
import { homeRules, type HomeState } from '../domain/home-registry.ts';
import { homeFootprint } from '../domain/home-space.ts';
import { IslandAtelier } from './atelier.ts';
import { createHomeFurniture, homeLook as look } from './home-models.ts';
import { disposeIslandObject } from './models.ts';

export class HomeInterior {
  public readonly root = new THREE.Group();
  private readonly furniture = new Map<string, THREE.Group>();
  private readonly atelier = new IslandAtelier();
  private readonly marker = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1),
    new THREE.MeshBasicMaterial({ color: 0xe7bc59, wireframe: true, depthTest: false }));
  public constructor(state: HomeState) {
    this.createRoom();
    for (const item of state.items) {
      const object = createHomeFurniture(this.atelier, item.kind);
      object.userData.homeItemId = item.id;
      this.furniture.set(item.id, object);
      this.root.add(object);
    }
    this.marker.renderOrder = 2;
    this.root.add(this.marker);
    this.root.visible = false;
    this.apply(state);
  }
  public apply(state: HomeState, selected: string | null = null): void {
    for (const item of state.items) {
      const object = this.furniture.get(item.id);
      if (object === undefined) continue;
      object.position.set(item.x, look.floorY, item.z);
      object.rotation.y = item.rotation * Math.PI / 2;
      object.visible = item.placed;
      if (item.kind === 'lamp') {
        const light = object.getObjectByName('home-lamplight');
        const shade = object.getObjectByName('home-lampshade');
        if (light !== undefined) light.visible = item.active;
        if (shade instanceof THREE.Mesh && shade.material instanceof THREE.MeshStandardMaterial) {
          shade.material.emissive.setHex(0xffdb95);
          shade.material.emissiveIntensity = item.active ? 0.65 : 0;
        }
      }
    }
    const item = state.items.find((entry) => entry.id === selected && entry.placed);
    this.marker.visible = item !== undefined;
    if (item !== undefined) {
      const half = homeFootprint(item);
      this.marker.position.set(item.x, look.floorY + 0.02, item.z);
      this.marker.scale.set(half.x * 2 + 0.1, 1, half.z * 2 + 0.1);
    }
  }
  public pick(raycaster: THREE.Raycaster): string | null {
    const hit = raycaster.intersectObjects([...this.furniture.values()].filter((object) => object.visible), true)[0];
    let object: THREE.Object3D | undefined = hit?.object;
    while (object !== undefined && object !== this.root) {
      if (typeof object.userData.homeItemId === 'string') return object.userData.homeItemId;
      object = object.parent ?? undefined;
    }
    return null;
  }
  public dispose(): void { disposeIslandObject(this.root); }
  private createRoom(): void {
    const a = this.atelier;
    const room = new THREE.Group();
    const size = homeRules.halfSize * 2;
    a.part(room, look.darkWood, [size + 0.15, 0.24, size + 0.15], [0, -0.12, 0], 'round');
    for (let index = 0; index < size / homeRules.grid; index += 1) {
      a.part(room, look.floor[index % look.floor.length]!, [size, 0.07, homeRules.grid - 0.016],
        [0, 0.025, -homeRules.halfSize + homeRules.grid / 2 + index * homeRules.grid], 'box');
    }
    a.part(room, look.wall, [size, look.roomHeight, look.wallThickness], [0, look.roomHeight / 2, -3], 'box');
    for (const x of [-3, 3]) {
      a.part(room, look.wall, [look.wallThickness, 0.9, size], [x, 0.45, 0], 'box');
      a.part(room, look.darkWood, [0.18, 0.12, size], [x, 0.91, 0], 'round');
      a.part(room, look.wood, [0.09, 0.16, size], [x * 0.975, 0.13, 0], 'box');
    }
    a.part(room, look.wood, [size, 0.16, 0.12], [0, 0.13, -2.9], 'box');
    a.part(room, look.wood, [1.6, 1.35, 0.14], [0, 1.4, -2.88], 'round');
    a.part(room, look.window, [1.4, 1.15, 0.06], [0, 1.4, -2.78], 'box');
    a.part(room, look.cream, [0.045, 1.2, 0.04], [0, 1.4, -2.73], 'box');
    a.part(room, look.cream, [1.45, 0.045, 0.04], [0, 1.4, -2.73], 'box');
    for (const x of [-0.94, 0.94]) a.part(room, look.cushion, [0.37, 1.4, 0.15], [x, 1.43, -2.73], 'round');
    a.part(room, look.cream, [2.1, 0.02, 1.8], [0, 0.069, 0], 'round');
    a.part(room, look.cushion, [1.93, 0.025, 1.6], [0, 0.078, 0], 'round');
    a.part(room, look.wood, [1.35, 0.025, 0.45], [0, 0.07, 2.7], 'round');
    a.batch(room);
    this.root.add(room);
  }
}
