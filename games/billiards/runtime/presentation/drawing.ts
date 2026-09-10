export function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

export function drawDiamond(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  context.save();
  context.translate(x, y);
  context.rotate(Math.PI / 4);
  context.fillRect(-3.5, -3.5, 7, 7);
  context.restore();
}
