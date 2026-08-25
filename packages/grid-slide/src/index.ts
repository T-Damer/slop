import { SlopDomainError } from "../../contracts/src/index.js";
import {
  gridAxes,
  gridErrorCodes,
  gridMessages,
  type GridAxis,
} from "./registry.js";

export * from "./registry.js";

export interface GridPosition {
  readonly x: number;
  readonly y: number;
}

export interface GridBoard {
  readonly width: number;
  readonly height: number;
}

export interface GridPiece {
  readonly id: string;
  readonly axis: GridAxis;
  readonly position: GridPosition;
  readonly length: number;
}

export interface GridMove {
  readonly pieceId: string;
  readonly delta: number;
}

export function findGridPiece(
  pieces: ReadonlyArray<GridPiece>,
  pieceId: string,
): GridPiece {
  for (const candidate of pieces) {
    if (candidate.id === pieceId) {
      return candidate;
    }
  }

  throw new SlopDomainError(
    gridErrorCodes.pieceMissing,
    gridMessages.pieceMissing,
  );
}

export function getOccupiedCells(piece: GridPiece): ReadonlyArray<GridPosition> {
  const cells: Array<GridPosition> = [];
  for (let offset = 0; offset < piece.length; offset += 1) {
    cells.push({
      x:
        piece.axis === gridAxes.horizontal
          ? piece.position.x + offset
          : piece.position.x,
      y:
        piece.axis === gridAxes.vertical
          ? piece.position.y + offset
          : piece.position.y,
    });
  }
  return cells;
}

export function validateGridMove(
  board: GridBoard,
  pieces: ReadonlyArray<GridPiece>,
  move: GridMove,
): GridPosition {
  if (!isFinite(move.delta) || Math.floor(move.delta) !== move.delta) {
    throw new SlopDomainError(
      gridErrorCodes.invalidDelta,
      gridMessages.invalidDelta,
    );
  }
  if (move.delta === 0) {
    throw new SlopDomainError(gridErrorCodes.zeroMove, gridMessages.zeroMove);
  }

  const movingPiece = findGridPiece(pieces, move.pieceId);
  const occupiedByOthers: Record<string, boolean> = {};
  for (const piece of pieces) {
    if (piece.id === movingPiece.id) {
      continue;
    }
    for (const cell of getOccupiedCells(piece)) {
      occupiedByOthers[toCellKey(cell)] = true;
    }
  }
  const direction = move.delta > 0 ? 1 : -1;

  for (
    let distance = direction;
    Math.abs(distance) <= Math.abs(move.delta);
    distance += direction
  ) {
    const position = translatePosition(
      movingPiece.position,
      movingPiece.axis,
      distance,
    );
    const candidate: GridPiece = { ...movingPiece, position };

    for (const cell of getOccupiedCells(candidate)) {
      if (!isInsideBoard(board, cell)) {
        throw new SlopDomainError(
          gridErrorCodes.outOfBounds,
          gridMessages.outOfBounds,
        );
      }
      if (occupiedByOthers[toCellKey(cell)] === true) {
        throw new SlopDomainError(
          gridErrorCodes.pathBlocked,
          gridMessages.pathBlocked,
        );
      }
    }
  }

  return translatePosition(movingPiece.position, movingPiece.axis, move.delta);
}

export function applyGridMove<TPiece extends GridPiece>(
  pieces: ReadonlyArray<TPiece>,
  move: GridMove,
  nextPosition: GridPosition,
): ReadonlyArray<TPiece> {
  return pieces.map((piece) =>
    piece.id === move.pieceId
      ? ({ ...piece, position: nextPosition } as TPiece)
      : piece,
  );
}

function translatePosition(
  position: GridPosition,
  axis: GridAxis,
  delta: number,
): GridPosition {
  return axis === gridAxes.horizontal
    ? { x: position.x + delta, y: position.y }
    : { x: position.x, y: position.y + delta };
}

function isInsideBoard(board: GridBoard, position: GridPosition): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < board.width &&
    position.y < board.height
  );
}

function toCellKey(position: GridPosition): string {
  return `${position.x}:${position.y}`;
}
