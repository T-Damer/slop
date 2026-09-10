import {
  junkyardInteractionKinds,
  type JunkyardInteractionKind,
} from '../domain/types.ts';
import type { CharacterModel } from './character-models.ts';

const characterAnimation = {
  walkArmSwing: 0.58,
  walkLegSwing: 0.66,
  walkFrequency: 9,
  hammerFrequency: 12,
  hammerReach: 1.15,
  fuelReach: 0.88,
  talkWave: 0.74,
  idleArmRotation: 0,
} as const;

export function animateCharacter(
  model: CharacterModel,
  elapsedSeconds: number,
  moving: boolean,
  actionKind: JunkyardInteractionKind | null,
): void {
  const walkPhase = Math.sin(
    elapsedSeconds * characterAnimation.walkFrequency,
  );
  model.leftArm.rotation.x = moving
    ? walkPhase * characterAnimation.walkArmSwing
    : characterAnimation.idleArmRotation;
  model.rightArm.rotation.x = moving
    ? -walkPhase * characterAnimation.walkArmSwing
    : characterAnimation.idleArmRotation;
  model.leftLeg.rotation.x = moving
    ? -walkPhase * characterAnimation.walkLegSwing
    : 0;
  model.rightLeg.rotation.x = moving
    ? walkPhase * characterAnimation.walkLegSwing
    : 0;

  if (actionKind === junkyardInteractionKinds.junk
    || actionKind === junkyardInteractionKinds.build) {
    const hammerPhase = Math.max(
      0,
      Math.sin(elapsedSeconds * characterAnimation.hammerFrequency),
    );
    model.rightArm.rotation.x =
      -characterAnimation.hammerReach * hammerPhase;
    model.leftArm.rotation.x = -0.42;
  } else if (actionKind === junkyardInteractionKinds.fuel) {
    model.leftArm.rotation.x = -characterAnimation.fuelReach;
    model.rightArm.rotation.x = -characterAnimation.fuelReach;
  } else if (actionKind === junkyardInteractionKinds.cash) {
    model.rightArm.rotation.x = -0.9;
  } else if (actionKind === junkyardInteractionKinds.talk) {
    model.rightArm.rotation.z =
      Math.sin(elapsedSeconds * 8) * characterAnimation.talkWave;
  }
}
