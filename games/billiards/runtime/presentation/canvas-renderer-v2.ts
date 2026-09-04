import type { BilliardsQualityMode } from './adaptive-quality-v2.ts';
import { BilliardsBallRendererV2 } from './ball-renderer-v2.ts';
import type { BilliardsControllerSnapshotV2 } from './controller-v2.ts';
import { drawBilliardsCueStrikeV2, drawBilliardsCueV2 } from './cue-renderer-v2.ts';
import {
  BilliardsEffectsRenderer,
  type BilliardsEffectsDebugSnapshot,
} from './effects-renderer.ts';
import { drawBilliardsGuideV2 } from './guide-renderer-v2.ts';
import { billiardsInteractionModes } from './interaction-state-v2.ts';
import { billiardsView } from './registry.ts';
import {
  drawBilliardsBackdrop,
  drawBilliardsTable,
  drawTableMarkings,
} from './table-renderer.ts';
import {
  classicPocketClubSkinV2,
  type BilliardsTableSkinV2,
} from './table-skins-v2.ts';

export interface BilliardsCanvasRenderStateV2 {
  readonly snapshot: BilliardsControllerSnapshotV2;
  readonly quality: BilliardsQualityMode;
  readonly reducedMotion: boolean;
}

export interface BilliardsCanvasDebugV2 {
  readonly staticSceneBuildCount: number;
  readonly quality: BilliardsQualityMode;
  readonly ballRendering: ReturnType<BilliardsBallRendererV2['debugSnapshot']>;
  readonly effects: BilliardsEffectsDebugSnapshot;
}

export class BilliardsCanvasRendererV2 {
  private readonly context: CanvasRenderingContext2D;
  private readonly staticCanvas: HTMLCanvasElement;
  private readonly balls = new BilliardsBallRendererV2();
  private skin: BilliardsTableSkinV2 = classicPocketClubSkinV2;
  private staticSceneBuildCount = 0;
  private staticSceneDirty = true;
  private quality: BilliardsQualityMode = 'high';

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly effects: BilliardsEffectsRenderer,
  ) {
    const context = canvas.getContext('2d', { alpha: true });
    if (context === null) throw new Error('Canvas 2D is unavailable.');
    this.context = context;
    this.staticCanvas = document.createElement('canvas');
    canvas.width = billiardsView.canvasWidth;
    canvas.height = billiardsView.canvasHeight;
    this.staticCanvas.width = billiardsView.canvasWidth;
    this.staticCanvas.height = billiardsView.canvasHeight;
  }

  public setSkin(skin: BilliardsTableSkinV2): void {
    if (this.skin.id === skin.id) return;
    this.skin = skin;
    this.staticSceneDirty = true;
  }

  public draw(state: BilliardsCanvasRenderStateV2, nowMs: number): void {
    this.quality = state.quality;
    this.ensureStaticScene();
    const context = this.context;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.drawImage(this.staticCanvas, 0, 0);
    const snapshot = state.snapshot;
    const placing = snapshot.match.ballInHand
      || snapshot.interaction.mode === billiardsInteractionModes.placingCueBall;
    if (!placing && snapshot.match.activeShot === null && snapshot.match.winnerIndex === null) {
      drawBilliardsGuideV2(context, snapshot.preview, snapshot.interaction);
      const cue = snapshot.match.table.balls.find(
        (ball) => ball.id === 0 && !ball.pocketed,
      );
      if (cue !== undefined) {
        drawBilliardsCueV2(context, {
          cueBallPosition: cue.position,
          angleRadians: snapshot.angleRadians,
          power: snapshot.power,
          interaction: snapshot.interaction,
          skin: this.skin,
          quality: state.quality,
        });
      }
    }
    if (!placing) {
      drawBilliardsCueStrikeV2(
        context,
        this.effects.cueAnimation(nowMs),
        this.skin,
        state.quality,
      );
    }
    this.balls.draw(context, snapshot.match.table, this.skin, state.quality, placing);
    const placement = snapshot.interaction.placementPreview;
    if (placing && placement !== null) {
      this.balls.drawPlacementPreview(
        context,
        placement.position,
        placement.valid,
        this.skin,
      );
    }
    this.effects.draw(context, nowMs);
  }

  public debugSnapshot(nowMs: number): BilliardsCanvasDebugV2 {
    return {
      staticSceneBuildCount: this.staticSceneBuildCount,
      quality: this.quality,
      ballRendering: this.balls.debugSnapshot(),
      effects: this.effects.debugSnapshot(nowMs),
    };
  }

  private ensureStaticScene(): void {
    if (!this.staticSceneDirty) return;
    const context = this.staticCanvas.getContext('2d');
    if (context === null) throw new Error('Static billiards canvas is unavailable.');
    context.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
    drawBilliardsBackdrop(context);
    drawBilliardsTable(context);
    drawTableMarkings(context);
    this.staticSceneBuildCount += 1;
    this.staticSceneDirty = false;
  }
}
