import * as THREE from 'three';
import type { IslandBlueprint, IslandPoint } from '../domain/types.ts';
import type { VoyageState, VoyageResidentId } from '../domain/voyage-registry.ts';
import { voyageQuests } from '../domain/voyage-quests.ts';
import type { IslandAtelier } from './atelier.ts';
import { islandArt } from './art-direction.ts';
import { voyageArt as v } from './voyage-art.ts';
import { addDistrict, addPier, addPond } from './voyage-props.ts';
import { createVillager } from './villager-models.ts';
import { animateResident } from './residents.ts';

export class VoyageScenery {
  public readonly root = new THREE.Group();
  private readonly pickups = new Map<string, THREE.Group>();
  private readonly residents = new Map<VoyageResidentId, THREE.Group>();
  private readonly gifts = new Map<string, THREE.Group>();
  private readonly marker = new THREE.Mesh(new THREE.TorusGeometry(v.ringRadius, v.ringWidth, 6, v.ringSegments),
    new THREE.MeshBasicMaterial({ color: v.accent, transparent: true, opacity: 0.75, depthWrite: false }));
  public constructor(a: IslandAtelier, world: IslandBlueprint) {
    const layout = world.exploration!;
    const scenery = new THREE.Group();
    addPier(a, scenery, layout.dock); addPond(a, scenery, world);
    for (const site of layout.sites) addDistrict(a, scenery, site.id, site.point);
    a.batch(scenery); this.root.add(scenery);
    for (const resident of layout.residents) {
      const model = createVillager(a, resident.id);
      model.position.set(resident.point.x, islandArt.ground, resident.point.z);
      this.residents.set(resident.id, model); this.root.add(model);
    }
    for (const pickup of layout.pickups) {
      const group = new THREE.Group(); group.position.set(pickup.point.x, islandArt.ground + 0.02, pickup.point.z);
      if (pickup.item === 'shell') {
        for (let i = 0; i < 5; i += 1) {
          const rib = a.part(group, i % 2 ? v.shell : v.cream, [0.13, 0.13, 0.38], [(i - 2) * 0.06, 0.06, 0]);
          rib.rotation.y = (i - 2) * 0.16;
        }
      } else if (pickup.item === 'letter') {
        a.part(group, v.glass, [0.24, 0.38, 0.24], [0, 0.17, 0], 'cylinder');
        a.part(group, v.paper, [0.11, 0.25, 0.11], [0, 0.21, 0.1], 'cylinder');
        a.part(group, v.timber, [0.16, 0.09, 0.16], [0, 0.41, 0], 'cylinder');
      } else {
        const glass = a.part(group, v.glass, [0.35, 0.2, 0.26], [0, 0.12, 0], 'round'); glass.rotation.y = 0.6;
      }
      this.pickups.set(pickup.id, group); this.root.add(group);
    }
    if (layout.region === 'home') this.createGifts(a, world);
    this.marker.rotation.x = Math.PI / 2; this.marker.visible = false; this.root.add(this.marker);
  }
  public apply(state: VoyageState): void {
    for (const [id, mesh] of this.pickups) mesh.visible = !state.collected.includes(id);
    for (const [id, mesh] of this.gifts) mesh.visible = state.claimed.includes(id);
  }
  public select(point: IslandPoint | null): void {
    this.marker.visible = point !== null;
    if (point) this.marker.position.set(point.x, islandArt.ground + 0.04, point.z);
  }
  public animate(time: number, player: IslandPoint, reduced: boolean): void {
    for (const [id, model] of this.residents) {
      animateResident(model, time + id.length, 0, reduced);
      if (Math.hypot(player.x - model.position.x, player.z - model.position.z) < v.faceDistance) {
        model.rotation.y = Math.atan2(player.x - model.position.x, player.z - model.position.z);
      } else if (!reduced) model.rotation.y = Math.sin(time * v.idleTurnSpeed + id.length) * 0.32;
    }
    this.marker.scale.setScalar(reduced ? 1 : 1 + Math.sin(time * 3) * 0.04);
  }
  private createGifts(a: IslandAtelier, world: IslandBlueprint): void {
    for (let i = 0; i < voyageQuests.length; i += 1) {
      const quest = voyageQuests[i]!;
      const gift = new THREE.Group();
      gift.position.set(world.house.x + (i - 1.5) * 0.62, islandArt.ground, world.house.z + 1.95);
      if (i === 0) {
        a.part(gift, v.timber, [0.16, 0.65, 0.16], [0, 0.32, 0], 'round');
        const light = a.part(gift, 0xffdb94, [0.32, 0.36, 0.32], [0, 0.7, 0], 'round');
        light.material = a.material(0xffdb94); (light.material as THREE.MeshStandardMaterial).emissive.setHex(0x725323);
      } else if (i === 1) {
        a.part(gift, v.timber, [0.5, 0.25, 0.4], [0, 0.16, 0], 'round');
        for (const x of [-0.13, 0, 0.13]) a.part(gift, 0xf0afa2, [0.2, 0.17, 0.2], [x, 0.38, 0]);
      } else if (i === 2) {
        a.part(gift, v.timber, [0.1, 0.45, 0.1], [0, 0.22, 0], 'round');
        a.part(gift, v.glass, [0.45, 0.25, 0.33], [0, 0.55, 0], 'round');
      } else {
        for (const x of [-0.23, 0.23]) a.part(gift, v.timber, [0.07, 1.1, 0.07], [x, 0.55, 0], 'cylinder');
        a.part(gift, v.accent, [0.45, 0.23, 0.06], [0, 0.94, 0], 'round');
      }
      gift.visible = false; this.gifts.set(quest.id, gift); this.root.add(gift);
    }
  }
}
