import { junkyardLevel } from '../domain/level.ts';
import {
  junkyardInteractionKinds,
  type JunkyardInteractionKind,
  type JunkyardState,
} from '../domain/types.ts';
import { proximityInteractionStatuses } from '../../../shared/proximity-world/domain/types.ts';
import type { JunkyardSceneObjects } from './scene-objects.ts';

export function updateJunkyardSceneObjects(
  objects: JunkyardSceneObjects,
  state: JunkyardState,
  actionKind: JunkyardInteractionKind | null,
  elapsedSeconds: number,
): void {
  updateJunkObjects(objects, state, elapsedSeconds);
  objects.buildPad.visible = !state.pumpBuilt;
  objects.buildPad.rotation.y += 0.008;
  objects.pump.root.visible = state.pumpBuilt;
  objects.customerCar.root.visible = state.pumpBuilt;
  objects.cashStack.visible = state.pendingRegisterCash > 0;
  objects.cashStack.rotation.y += 0.025;

  const fueling = actionKind === junkyardInteractionKinds.fuel;
  objects.hose.visible = fueling;
  objects.customerCar.body.position.y = fueling
    ? 0.42 + Math.sin(elapsedSeconds * 8) * 0.035
    : 0.42;
}

function updateJunkObjects(
  objects: JunkyardSceneObjects,
  state: JunkyardState,
  elapsedSeconds: number,
): void {
  for (const [interactionId, object] of objects.junkObjects) {
    const runtime = state.world.interactions[interactionId];
    const definition = junkyardLevel.world.interactions.find(
      (interaction) => interaction.id === interactionId,
    );
    if (runtime === undefined || definition === undefined) {
      continue;
    }
    object.visible =
      runtime.status !== proximityInteractionStatuses.completed;
    const progress = runtime.progressMs / definition.durationMs;
    object.scale.setScalar(Math.max(0.58, 1 - progress * 0.34));
    object.rotation.y = Math.sin(elapsedSeconds * 18) * progress * 0.16;
  }
}
