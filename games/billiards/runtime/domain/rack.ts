import { distanceVec2 } from './geometry.ts';
import {
  billiardsBallIds,
  billiardsBallKinds,
  billiardsMatchPhases,
  billiardsMessages,
  billiardsPhysics,
  billiardsPlayerGroups,
  billiardsRules,
} from './registry.ts';
import { billiardsTableBounds } from './table-model.ts';
import type {
  BilliardsBallKind,
  BilliardsBallState,
  BilliardsMatchState,
  BilliardsPlayerState,
  BilliardsTableState,
  Vec2,
} from './types.ts';

const rackRows: ReadonlyArray<ReadonlyArray<number>> = [
  [1],
  [9, 2],
  [10, 8, 3],
  [4, 11, 5, 12],
  [13, 6, 14, 7, 15],
];

export function createInitialTable(): BilliardsTableState {
  const balls: BilliardsBallState[] = [createBall(billiardsBallIds.cue, cueHeadSpot())];
  const diameter = billiardsPhysics.ballRadius * 2;
  const rowAdvance = diameter * Math.sqrt(3) / 2;
  const apex = { x: billiardsPhysics.tableWidth * 0.18, y: 0 };
  for (let rowIndex = 0; rowIndex < rackRows.length; rowIndex += 1) {
    const row = rackRows[rowIndex] ?? [];
    for (let column = 0; column < row.length; column += 1) {
      const id = row[column];
      if (id !== undefined) {
        balls.push(createBall(id, {
          x: apex.x + rowIndex * rowAdvance,
          y: (column - rowIndex / 2) * diameter,
        }));
      }
    }
  }
  return { schemaVersion: 1, step: 0, balls };
}

export function createInitialPlayers(
  names: readonly [string, string] = ['Игрок 1', 'Игрок 2'],
): readonly [BilliardsPlayerState, BilliardsPlayerState] {
  return [
    { index: 0, name: names[0], group: billiardsPlayerGroups.open },
    { index: 1, name: names[1], group: billiardsPlayerGroups.open },
  ];
}

export function createInitialMatch(
  names: readonly [string, string] = ['Игрок 1', 'Игрок 2'],
): BilliardsMatchState {
  return {
    schemaVersion: 1,
    revision: 0,
    table: createInitialTable(),
    players: createInitialPlayers(names),
    turnIndex: 0,
    phase: billiardsMatchPhases.break,
    winnerIndex: null,
    ballInHand: false,
    activeShot: null,
    status: billiardsMessages.break,
  };
}

export function rerackMatch(match: BilliardsMatchState, status: string): BilliardsMatchState {
  return {
    ...match,
    revision: match.revision + 1,
    table: createInitialTable(),
    phase: billiardsMatchPhases.break,
    winnerIndex: null,
    ballInHand: false,
    activeShot: null,
    status,
  };
}

export function restoreCueBall(table: BilliardsTableState): BilliardsTableState {
  const cue = table.balls.find((ball) => ball.id === billiardsBallIds.cue);
  if (cue === undefined || !cue.pocketed) {
    return table;
  }
  const position = findCuePlacement(table.balls) ?? cueHeadSpot();
  return {
    ...table,
    balls: table.balls.map((ball) => ball.id === billiardsBallIds.cue ? {
      ...ball,
      position,
      velocity: { x: 0, y: 0 },
      sideSpin: 0,
      followSpin: 0,
      pocketed: false,
    } : ball),
  };
}

export function canPlaceCueBall(
  table: BilliardsTableState,
  position: Vec2,
): boolean {
  const radius = billiardsPhysics.ballRadius;
  if (
    position.x < billiardsTableBounds.left + radius
    || position.x > billiardsTableBounds.right - radius
    || position.y < billiardsTableBounds.top + radius
    || position.y > billiardsTableBounds.bottom - radius
  ) {
    return false;
  }
  return table.balls.every((ball) =>
    ball.id === billiardsBallIds.cue
    || ball.pocketed
    || distanceVec2(ball.position, position) >= radius * 2 + billiardsPhysics.separationEpsilon,
  );
}

export function placeCueBall(
  table: BilliardsTableState,
  position: Vec2,
): BilliardsTableState {
  if (!canPlaceCueBall(table, position)) {
    return table;
  }
  return {
    ...table,
    balls: table.balls.map((ball) => ball.id === billiardsBallIds.cue ? {
      ...ball,
      position: { ...position },
      velocity: { x: 0, y: 0 },
      pocketed: false,
    } : ball),
  };
}

export function ballKindForId(id: number): BilliardsBallKind {
  if (id === billiardsBallIds.cue) return billiardsBallKinds.cue;
  if (id === billiardsBallIds.eight) return billiardsBallKinds.eight;
  return billiardsBallIds.solids.some((ballId) => ballId === id)
    ? billiardsBallKinds.solid
    : billiardsBallKinds.stripe;
}

function findCuePlacement(balls: ReadonlyArray<BilliardsBallState>): Vec2 | null {
  const width = billiardsPhysics.tableWidth * 0.42;
  const height = billiardsPhysics.tableHeight - billiardsPhysics.ballRadius * 4;
  for (let column = 0; column < billiardsRules.cuePlacementColumns; column += 1) {
    for (let row = 0; row < billiardsRules.cuePlacementRows; row += 1) {
      const position = {
        x: billiardsTableBounds.left + billiardsPhysics.ballRadius * 2
          + width * column / Math.max(1, billiardsRules.cuePlacementColumns - 1),
        y: -height / 2 + height * row / Math.max(1, billiardsRules.cuePlacementRows - 1),
      };
      if (balls.every((ball) =>
        ball.id === billiardsBallIds.cue
        || ball.pocketed
        || distanceVec2(ball.position, position) >= billiardsPhysics.ballRadius * 2.05,
      )) {
        return position;
      }
    }
  }
  return null;
}

function cueHeadSpot(): Vec2 {
  return {
    x: billiardsPhysics.tableWidth * billiardsRules.cueHeadSpotFraction / 2,
    y: 0,
  };
}

function createBall(id: number, position: Vec2): BilliardsBallState {
  return {
    id,
    kind: ballKindForId(id),
    position,
    velocity: { x: 0, y: 0 },
    sideSpin: 0,
    followSpin: 0,
    pocketed: false,
  };
}
