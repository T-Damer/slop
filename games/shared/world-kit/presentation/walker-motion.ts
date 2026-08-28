import * as THREE from 'three';

import type { WorldPoint } from '../domain/types.ts';
import type { WalkerVisual } from './models.ts';

const walkerMotionTuning = {
  visualLerp: 0.26,
  turnLerp: 0.22,
  phaseSpeed: 10,
  limbSwing: 0.58,
  verticalBob: 0.045,
  movementEpsilon: 0.00002,
  cameraFollow: 0.12,
} as const;

export class WalkerMotionController {
  private readonly previousPlayer = new THREE.Vector3();
  private readonly visualPlayer = new THREE.Vector3();
  private readonly followTarget = new THREE.Vector3();
  private walkingPhase = 0;

  public constructor(spawn: WorldPoint) {
    this.previousPlayer.set(spawn.x, 0, spawn.z);
    this.visualPlayer.copy(this.previousPlayer);
    this.followTarget.copy(this.previousPlayer);
  }

  public update(
    walker: WalkerVisual,
    player: WorldPoint,
    deltaSeconds: number,
  ): void {
    const target = new THREE.Vector3(player.x, 0, player.z);
    this.visualPlayer.lerp(target, walkerMotionTuning.visualLerp);
    walker.root.position.copy(this.visualPlayer);

    const deltaX = target.x - this.previousPlayer.x;
    const deltaZ = target.z - this.previousPlayer.z;
    const moving = deltaX * deltaX + deltaZ * deltaZ
      > walkerMotionTuning.movementEpsilon;
    if (moving) {
      walker.root.rotation.y = dampAngle(
        walker.root.rotation.y,
        Math.atan2(deltaX, deltaZ),
        walkerMotionTuning.turnLerp,
      );
      this.walkingPhase += deltaSeconds * walkerMotionTuning.phaseSpeed;
    }
    const swing = moving
      ? Math.sin(this.walkingPhase) * walkerMotionTuning.limbSwing
      : 0;
    walker.leftArm.rotation.x = swing;
    walker.rightArm.rotation.x = -swing;
    walker.leftLeg.rotation.x = -swing;
    walker.rightLeg.rotation.x = swing;
    walker.root.position.y = moving
      ? Math.abs(Math.sin(this.walkingPhase * 2)) * walkerMotionTuning.verticalBob
      : 0;
    this.previousPlayer.copy(target);
  }

  public followCamera(
    camera: THREE.OrthographicCamera,
    offset: THREE.Vector3,
  ): void {
    this.followTarget.lerp(this.visualPlayer, walkerMotionTuning.cameraFollow);
    camera.position.copy(this.followTarget).add(offset);
    camera.lookAt(this.followTarget);
    camera.updateMatrixWorld();
  }

  public copyVisualPosition(target: THREE.Vector3): THREE.Vector3 {
    return target.copy(this.visualPlayer);
  }
}

function dampAngle(current: number, target: number, amount: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * amount;
}
