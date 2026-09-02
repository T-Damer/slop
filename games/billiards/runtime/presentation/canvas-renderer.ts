import type {
  BilliardsMatchState,
  BilliardsShotPreview,
} from '../domain/types.ts';
import { drawBilliardsAim } from './aim-renderer.ts';
import { drawBilliardsBalls } from './ball-renderer.ts';
import {
  drawBilliardsBackdrop,
  drawBilliardsTable,
  drawTableMarkings,
} from './table-renderer.ts';
import { billiardsView } from './registry.ts';

export interface BilliardsRenderState {
  readonly match: BilliardsMatchState;
  readonly preview: BilliardsShotPreview;
  readonly angleRadians: number;
  readonly power: number;
  readonly reducedMotion: boolean;
}

export class BilliardsCanvasRenderer {
  private readonly context: CanvasRenderingContext2D;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (context === null) {
      throw new Error('Canvas 2D is unavailable.');
    }
    this.context = context;
    canvas.width = billiardsView.canvasWidth;
    canvas.height = billiardsView.canvasHeight;
  }

  public draw(state: BilliardsRenderState): void {
    const context = this.context;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawBilliardsBackdrop(context);
    drawBilliardsTable(context);
    drawBilliardsAim(
      context,
      state.match,
      state.preview,
      state.angleRadians,
      state.power,
    );
    drawBilliardsBalls(context, state.match.table.balls, state.reducedMotion);
    drawTableMarkings(context);
  }
}
