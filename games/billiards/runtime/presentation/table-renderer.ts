import { billiardsTableModel } from '../domain/table-model.ts';
import { worldLengthToCanvas, worldToCanvas } from './coordinates.ts';
import { drawDiamond, roundedRect } from './drawing.ts';
import { billiardsPalette, billiardsView } from './registry.ts';

export function drawBilliardsBackdrop(context: CanvasRenderingContext2D): void {
  const gradient = context.createRadialGradient(640, 335, 80, 640, 360, 650);
  gradient.addColorStop(0, '#294c63');
  gradient.addColorStop(0.62, billiardsPalette.pageTop);
  gradient.addColorStop(1, billiardsPalette.pageBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, billiardsView.canvasWidth, billiardsView.canvasHeight);
  for (let x = -200; x < billiardsView.canvasWidth + 200; x += 80) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 360, billiardsView.canvasHeight);
    context.lineWidth = 1;
    context.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    context.stroke();
  }
}

export function drawBilliardsTable(context: CanvasRenderingContext2D): void {
  const table = billiardsView.table;
  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.52)';
  context.shadowBlur = 34;
  context.shadowOffsetY = 20;
  roundedRect(
    context,
    table.left - table.railWidth,
    table.top - table.railWidth,
    table.width + table.railWidth * 2,
    table.height + table.railWidth * 2,
    table.cornerRadius + table.railWidth / 2,
  );
  const railGradient = context.createLinearGradient(0, table.top, 0, table.top + table.height);
  railGradient.addColorStop(0, '#8c6040');
  railGradient.addColorStop(0.5, billiardsPalette.rail);
  railGradient.addColorStop(1, billiardsPalette.railDark);
  context.fillStyle = railGradient;
  context.fill();
  context.restore();

  roundedRect(context, table.left - 12, table.top - 12, table.width + 24, table.height + 24, 28);
  context.fillStyle = '#17261f';
  context.fill();

  roundedRect(context, table.left, table.top, table.width, table.height, 22);
  const feltGradient = context.createRadialGradient(640, 350, 40, 640, 350, 630);
  feltGradient.addColorStop(0, '#21866f');
  feltGradient.addColorStop(1, billiardsPalette.feltDark);
  context.fillStyle = feltGradient;
  context.fill();
  drawFeltGrain(context);
  drawPockets(context);
  drawRailSights(context);
}

export function drawTableMarkings(context: CanvasRenderingContext2D): void {
  const table = billiardsView.table;
  context.save();
  context.globalAlpha = 0.18;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 1;
  const headX = table.left + table.width * 0.24;
  context.beginPath();
  context.moveTo(headX, table.top + 18);
  context.lineTo(headX, table.top + table.height - 18);
  context.stroke();
  context.restore();
}

function drawFeltGrain(context: CanvasRenderingContext2D): void {
  const table = billiardsView.table;
  context.save();
  roundedRect(context, table.left, table.top, table.width, table.height, 22);
  context.clip();
  context.globalAlpha = 0.045;
  for (let index = 0; index < 260; index += 1) {
    const x = table.left + (index * 67 % table.width);
    const y = table.top + (index * 113 % table.height);
    context.fillStyle = index % 3 === 0 ? '#ffffff' : '#00150f';
    context.fillRect(x, y, 2, 1);
  }
  context.restore();
}

function drawPockets(context: CanvasRenderingContext2D): void {
  for (const pocket of billiardsTableModel.pockets) {
    const center = worldToCanvas(pocket.center);
    const radius = worldLengthToCanvas(pocket.radius) * 1.04;
    const glow = context.createRadialGradient(center.x, center.y, 1, center.x, center.y, radius * 1.3);
    glow.addColorStop(0, '#000000');
    glow.addColorStop(0.62, billiardsPalette.pocket);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(center.x, center.y, radius * 1.28, 0, Math.PI * 2);
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
