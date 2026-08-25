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
  const piece = pieces.find((candidate) => candidate.id === pieceId);
  if (piece === undefined) {
    throw new SlopDomainError(
      gridErrorCodes.pieceMissing,
      gridMessages.pieceMissing,
    );
  }
  return piece;
}

export function getOccupiedCells(piece: GridPiece): ReadonlyArray<GridPosition> {
  return Array.from({ length: piece.length }, (_value, offset) => ({
    x:
      piece.axis === gridAxes.horizontal
        ? piece.position.x + offset
        : piece.position.x,
    y:
      piece.axis === gridAxes.vertical
        ? piece.position.y + offset
        : piece.position.y,
  }));
}

export function validateGridMove(
  board: GridBoard,
  pieces: ReadonlyArray<GridPiece>,
  move: GridMove,
): GridPosition {
  if (!Number.isInteger(move.delta)) {
    throw new SlopDomainError(
      gridErrorCodes.invalidDelta,
      gridMessages.invalidDelta,
    );
  }
  if (move.delta === 0) {
    throw new SlopDomainError(gridErrorCodes.zeroMove, gridMessages.zeroMove);
  }

  const movingPiece = findGridPiece(pieces, move.pieceId);
  const occupiedByOthers = new Set(
    pieces
      .filter((piece) => piece.id !== movingPiece.id)
      .flatMap((piece) => getOccupiedCells(piece))
      .map(toCellKey),
  );
  const direction = Math.sign(move.delta);

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
      if (occupiedByOthers.has(toCellKey(cell))) {
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
