import { billiardsTableModel, type BilliardsTableModel } from '../domain/table-model.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import { drawDiamond, roundedRect } from './drawing.ts';
import { billiardsPalette, billiardsView } from './registry.ts';

const fullCircle = Math.PI * 2;

/** The room is the existing authored SVG backdrop beneath this transparent layer.
 * Keep only the table here instead of shipping a second floor/furniture renderer. */
export function drawBilliardsBackdrop(context: CanvasRenderingContext2D): void {
  context.clearRect(0, 0, billiardsView.canvasWidth, billiardsView.canvasHeight);
}

export function drawBilliardsTable(context: CanvasRenderingContext2D, model: BilliardsTableModel = billiardsTableModel): void {
  const table = billiardsView.table;
  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.76)';
  context.shadowBlur = 42;
  context.shadowOffsetY = 24;
  roundedRect(
    context,
    table.left - table.railWidth,
    table.top - table.railWidth,
    table.width + table.railWidth * 2,
    table.height + table.railWidth * 2,
    table.cornerRadius + table.railWidth / 2,
  );
  context.fillStyle = createRailGradient(context, table.top, table.top + table.height);
  context.fill();
  context.restore();
  drawRailHighlights(context);
  roundedRect(context, table.left - 16, table.top - 16, table.width + 32, table.height + 32, 30);
  context.fillStyle = '#111815';
  context.fill();
  roundedRect(context, table.left, table.top, table.width, table.height, 22);
  const felt = context.createRadialGradient(610, 310, 35, 640, 350, 630);
  felt.addColorStop(0, '#159560');
  felt.addColorStop(0.48, '#087448');
  felt.addColorStop(1, '#033c2a');
  context.fillStyle = felt;
  context.fill();
  drawFeltLighting(context);
  drawFeltGrain(context);
  drawCushionBevels(context, model);
  drawPockets(context, model);
  drawRailSights(context);
}

export function drawTableMarkings(context: CanvasRenderingContext2D): void {
  const table = billiardsView.table;
  context.save();
  context.globalAlpha = 0.12;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 1;
  const headX = table.left + table.width * 0.24;
  context.beginPath();
  context.moveTo(headX, table.top + 20);
  context.lineTo(headX, table.top + table.height - 20);
  context.stroke();
  context.restore();
}

function createRailGradient(
  context: CanvasRenderingContext2D,
  top: number,
  bottom: number,
): CanvasGradient {
  const rail = context.createLinearGradient(0, top - 60, 0, bottom + 60);
  rail.addColorStop(0, '#d09155');
  rail.addColorStop(0.12, '#7a3d1c');
  rail.addColorStop(0.5, '#4b2414');
  rail.addColorStop(0.86, '#8b4d25');
  rail.addColorStop(1, '#2a130d');
  return rail;
}

function drawRailHighlights(context: CanvasRenderingContext2D): void {
  const table = billiardsView.table;
  roundedRect(
    context,
    table.left - table.railWidth + 7,
    table.top - table.railWidth + 7,
    table.width + (table.railWidth - 7) * 2,
    table.height + (table.railWidth - 7) * 2,
    table.cornerRadius + 16,
  );
  context.strokeStyle = 'rgba(255, 214, 145, 0.34)';
  context.lineWidth = 3;
  context.stroke();
}

function drawFeltLighting(context: CanvasRenderingContext2D): void {
  const table = billiardsView.table;
  context.save();
  roundedRect(context, table.left, table.top, table.width, table.height, 22);
  context.clip();
  const lamp = context.createRadialGradient(600, 290, 8, 640, 350, 450);
  lamp.addColorStop(0, 'rgba(170, 255, 184, 0.12)');
  lamp.addColorStop(0.66, 'rgba(21, 90, 52, 0.03)');
  lamp.addColorStop(1, 'rgba(0, 20, 12, 0.34)');
  context.fillStyle = lamp;
  context.fillRect(table.left, table.top, table.width, table.height);
  context.restore();
}

function drawFeltGrain(context: CanvasRenderingContext2D): void {
  const table = billiardsView.table;
  context.save();
  roundedRect(context, table.left, table.top, table.width, table.height, 22);
  context.clip();
  context.globalAlpha = 0.045;
  for (let index = 0; index < 320; index += 1) {
    const x = table.left + (index * 67 % table.width);
    const y = table.top + (index * 113 % table.height);
    context.fillStyle = index % 3 === 0 ? '#ffffff' : '#00150f';
    context.fillRect(x, y, 2, 1);
  }
  context.restore();
}

function drawCushionBevels(context: CanvasRenderingContext2D, model: BilliardsTableModel): void {
  context.save();
  context.lineCap = 'butt';
  for (const cushion of model.cushions) {
    const start = worldToCanvas(cushion.start), end = worldToCanvas(cushion.end);
    // Rubber lies OUTSIDE the playable plane. Its lit nose is on the CCD boundary.
    const shift = { x: -cushion.inwardNormal.x * 5, y: -cushion.inwardNormal.y * 5 };
    context.strokeStyle = '#063c2e'; context.lineWidth = 10;
    context.beginPath(); context.moveTo(start.x + shift.x, start.y + shift.y);
    context.lineTo(end.x + shift.x, end.y + shift.y); context.stroke();
    context.strokeStyle = 'rgba(125,239,172,.35)'; context.lineWidth = 2;
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
  }
  context.restore();
}

function drawPockets(context: CanvasRenderingContext2D, model: BilliardsTableModel): void {
  for (const pocket of model.pockets) {
    const center = worldToCanvas(pocket.center);
    const radius = worldLengthToCanvas(pocket.radius);
    const rim = context.createRadialGradient(center.x, center.y, radius * 0.4, center.x, center.y, radius * 1.1);
    rim.addColorStop(0, '#000000');
    rim.addColorStop(0.62, billiardsPalette.pocket);
    rim.addColorStop(0.78, '#5c5d5a');
    rim.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
    context.fillStyle = rim;
    context.beginPath();
    context.arc(center.x, center.y, radius * 1.1, 0, fullCircle);
    context.fill();
  }
}

function drawRailSights(context: CanvasRenderingContext2D): void {
  const table = billiardsView.table;
  context.fillStyle = billiardsPalette.sight;
  const topY = table.top - 31;
  const bottomY = table.top + table.height + 31;
  for (const fraction of [0.125, 0.25, 0.375, 0.625, 0.75, 0.875]) {
    drawDiamond(context, table.left + table.width * fraction, topY);
    drawDiamond(context, table.left + table.width * fraction, bottomY);
  }
  const leftX = table.left - 31;
  const rightX = table.left + table.width + 31;
  for (const fraction of [0.25, 0.5, 0.75]) {
    drawDiamond(context, leftX, table.top + table.height * fraction);
    drawDiamond(context, rightX, table.top + table.height * fraction);
  }
}
