import { cueBallId } from './table-presets.ts';
import { tableModelFor } from './table-model.ts';
import {
  addVec2,
  clampNumber,
  normalizeVec2,
  scaleVec2,
} from './geometry.ts';
import { findFirstCollision } from './collision.ts';
import {
  billiardsCollisionKinds,
  billiardsPhysics,
  billiardsRules,
} from './registry.ts';
import type {
  BilliardsBallState,
  BilliardsShotCommand,
  BilliardsShotPreview,
  BilliardsTableState,
  Vec2,
} from './types.ts';

export function applyShot(
  table: BilliardsTableState,
  command: BilliardsShotCommand,
): BilliardsTableState {
  const direction = shotDirection(command.angleRadians);
  const power = clampNumber(command.power, 0, billiardsRules.maximumPower);
  const speed = billiardsPhysics.minimumShotSpeed
    + (billiardsPhysics.maximumShotSpeed - billiardsPhysics.minimumShotSpeed) * power;
  return {
    ...table,
    balls: table.balls.map((ball) => ball.id === cueBallId(table) ? {
      ...ball,
      velocity: scaleVec2(direction, speed),
      sideSpin: clampNumber(
        command.sideSpin,
        -billiardsRules.maximumSpin,
        billiardsRules.maximumSpin,
      ),
      followSpin: clampNumber(
        command.followSpin,
        -billiardsRules.maximumSpin,
        billiardsRules.maximumSpin,
      ) * speed,
    } : ball),
  };
}

export function previewShot(
  table: BilliardsTableState,
  command: BilliardsShotCommand,
): BilliardsShotPreview {
  const movingTable = applyShot(table, {
    ...command,
    power: Math.max(command.power, billiardsRules.minimumPower),
  });
  const cue = findCueBall(movingTable);
  if (cue === null) {
    return { cuePath: [], objectPath: [], firstCollision: null };
  }
  const speed = vectorSpeed(cue.velocity);
  // Free-roll estimate, not a full rebound simulation. Use the actual strike
  // speed, cloth deceleration and stop threshold; never predict unreachable hits.
  const distance = Math.min(billiardsPhysics.maximumGuideDistance, Math.max(0,
    (speed ** 2 - billiardsPhysics.stopSpeed ** 2) / (2 * billiardsPhysics.rollingDeceleration)));
  const maximumTime = distance / speed;
  const collision = findFirstCollision(movingTable.balls, maximumTime, tableModelFor(table));
  const end = collision === null
    ? addVec2(
      cue.position,
      scaleVec2(normalizeVec2(cue.velocity), distance),
    )
    : addVec2(cue.position, scaleVec2(cue.velocity, Math.max(0, collision.time)));
  return {
    cuePath: [cue.position, end],
    objectPath: createObjectPath(movingTable, collision, end),
    firstCollision: collision,
  };
}

export function isValidShotCommand(command: BilliardsShotCommand): boolean {
  return command.schemaVersion === 1
    && Number.isFinite(command.angleRadians)
    && Number.isFinite(command.power)
    && command.power >= billiardsRules.minimumPower
    && command.power <= billiardsRules.maximumPower
    && Number.isFinite(command.sideSpin)
    && Math.abs(command.sideSpin) <= billiardsRules.maximumSpin
    && Number.isFinite(command.followSpin)
    && Math.abs(command.followSpin) <= billiardsRules.maximumSpin
    && Number.isSafeInteger(command.clientSequence)
    && command.clientSequence >= 0;
}

function createObjectPath(
  table: BilliardsTableState,
  collision: BilliardsShotPreview['firstCollision'],
  impact: Vec2,
): ReadonlyArray<Vec2> {
  if (collision?.kind !== billiardsCollisionKinds.ball) {
    return [];
  }
  const objectId = collision.leftBallId === cueBallId(table)
    ? collision.rightBallId
    : collision.leftBallId;
  const objectBall = table.balls.find((ball) => ball.id === objectId);
  if (objectBall === undefined) {
    return [];
  }
  const direction = normalizeVec2({
    x: objectBall.position.x - impact.x,
    y: objectBall.position.y - impact.y,
  });
  return [
    objectBall.position,
    addVec2(objectBall.position, scaleVec2(direction, billiardsPhysics.objectGuideDistance)),
  ];
}

function findCueBall(table: BilliardsTableState): BilliardsBallState | null {
  return table.balls.find((ball) => ball.id === cueBallId(table) && !ball.pocketed) ?? null;
}

function shotDirection(angleRadians: number): Vec2 {
  return { x: Math.cos(angleRadians), y: Math.sin(angleRadians) };
}

function vectorSpeed(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}
