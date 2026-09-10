import * as THREE from 'three';

import { junkyardLevel } from '../domain/level.ts';
import { junkyardInteractionIds } from '../domain/registry.ts';
import {
  createMechanicModel,
  createPlayerModel,
  type CharacterModel,
} from './character-models.ts';
import {
  createBuildPad,
  createCashStack,
  createCustomerCar,
  createFuelPump,
  createInteractionAnchor,
  createJunkCrates,
  createJunkTires,
  createJunkWreck,
  createRegisterBuilding,
  type CustomerCarModel,
  type FuelPumpModel,
} from './station-models.ts';
import {
  junkyardSceneColors,
  junkyardSceneLayout,
} from './registry.ts';

export interface JunkyardSceneObjects {
  readonly player: CharacterModel;
  readonly mechanic: CharacterModel;
  readonly interactionAnchors: ReadonlyMap<string, THREE.Object3D>;
  readonly junkObjects: ReadonlyMap<string, THREE.Object3D>;
  readonly pump: FuelPumpModel;
  readonly customerCar: CustomerCarModel;
  readonly buildPad: THREE.Group;
  readonly cashStack: THREE.Group;
  readonly hose: THREE.Line;
}

export function createJunkyardSceneObjects(
  scene: THREE.Scene,
): JunkyardSceneObjects {
  const player = createPlayerModel();
  const mechanic = createMechanicModel();
  const pump = createFuelPump();
  const customerCar = createCustomerCar();
  const buildPad = createBuildPad();
  const cashStack = createCashStack();
  const interactionAnchors = new Map<string, THREE.Object3D>();
  const junkObjects = new Map<string, THREE.Object3D>();

  scene.add(player.root);
  installMechanic(scene, mechanic, interactionAnchors);
  installJunk(scene, junkObjects, interactionAnchors);
  installStation(
    scene,
    pump,
    customerCar,
    buildPad,
    cashStack,
    interactionAnchors,
  );
  const hose = createHose();
  scene.add(hose);
  return {
    player,
    mechanic,
    interactionAnchors,
    junkObjects,
    pump,
    customerCar,
    buildPad,
    cashStack,
    hose,
  };
}

function installMechanic(
  scene: THREE.Scene,
  mechanic: CharacterModel,
  anchors: Map<string, THREE.Object3D>,
): void {
  mechanic.root.position.set(
    junkyardSceneLayout.mechanicX,
    0,
    junkyardSceneLayout.mechanicZ,
  );
  mechanic.root.rotation.y = 0.55;
  scene.add(mechanic.root);
  registerAnchor(scene, anchors, junkyardInteractionIds.talkMechanic);
}

function installJunk(
  scene: THREE.Scene,
  junkObjects: Map<string, THREE.Object3D>,
  anchors: Map<string, THREE.Object3D>,
): void {
  const entries: ReadonlyArray<readonly [string, THREE.Object3D]> = [
    [junkyardInteractionIds.junkCrates, createJunkCrates()],
    [junkyardInteractionIds.junkTires, createJunkTires()],
    [junkyardInteractionIds.junkWreck, createJunkWreck()],
  ];
  for (const [interactionId, object] of entries) {
    const definition = findInteraction(interactionId);
    if (definition === undefined) {
      continue;
    }
    object.position.set(definition.position.x, 0, definition.position.z);
    junkObjects.set(interactionId, object);
    scene.add(object);
    registerAnchor(scene, anchors, interactionId);
  }
}

function installStation(
  scene: THREE.Scene,
  pump: FuelPumpModel,
  customerCar: CustomerCarModel,
  buildPad: THREE.Group,
  cashStack: THREE.Group,
  anchors: Map<string, THREE.Object3D>,
): void {
  buildPad.position.set(
    junkyardSceneLayout.pumpX,
    0,
    junkyardSceneLayout.pumpZ,
  );
  pump.root.position.copy(buildPad.position);
  customerCar.root.position.set(
    junkyardSceneLayout.customerCarX,
    0,
    junkyardSceneLayout.customerCarZ,
  );
  customerCar.root.rotation.y = Math.PI / 2;

  const building = createRegisterBuilding();
  building.position.set(
    junkyardSceneLayout.buildingX,
    0,
    junkyardSceneLayout.buildingZ,
  );
  cashStack.position.set(
    junkyardSceneLayout.registerX,
    0.78,
    junkyardSceneLayout.registerZ,
  );
  scene.add(buildPad, pump.root, customerCar.root, building, cashStack);
  registerAnchor(scene, anchors, junkyardInteractionIds.buildPump);
  registerAnchor(scene, anchors, junkyardInteractionIds.fuelCar);
  registerAnchor(scene, anchors, junkyardInteractionIds.collectRegister);
}

function registerAnchor(
  scene: THREE.Scene,
  anchors: Map<string, THREE.Object3D>,
  interactionId: string,
): void {
  const definition = findInteraction(interactionId);
  if (definition === undefined) {
    return;
  }
  const anchor = createInteractionAnchor();
  anchor.position.set(
    definition.position.x,
    junkyardSceneLayout.interactionAnchorY,
    definition.position.z,
  );
  scene.add(anchor);
  anchors.set(interactionId, anchor);
}

function createHose(): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(
      junkyardSceneLayout.pumpX + 0.35,
      0.9,
      junkyardSceneLayout.pumpZ,
    ),
    new THREE.Vector3(1.7, 0.48, junkyardSceneLayout.pumpZ),
    new THREE.Vector3(
      junkyardSceneLayout.customerCarX - 0.52,
      0.52,
      junkyardSceneLayout.customerCarZ,
    ),
  ]);
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: junkyardSceneColors.shadow,
      linewidth: 2,
    }),
  );
}

function findInteraction(interactionId: string) {
  return junkyardLevel.world.interactions.find(
    (interaction) => interaction.id === interactionId,
  );
}
