import { writeFile } from 'node:fs/promises';
import { captureScreenshot, delay, evaluate } from './cdp-client.mjs';

const pinch = { margin: 8, minimumSpan: 128, spread: 30, steps: 4, intervalMs: 40 };

/** CDP input uses viewport CSS coordinates, never the enlarged canvas bounds.
 * Reject missing/occluded layout rather than dispatching malformed input. */
export function pinchPoints(bounds) {
  const { left, top, right, bottom, width, height } = bounds;
  if (![left, top, right, bottom, width, height].every(Number.isFinite)) {
    throw new Error(`Non-finite camera gesture bounds: ${JSON.stringify(bounds)}`);
  }
  const x0 = Math.max(0, left) + pinch.margin, x1 = Math.min(width, right) - pinch.margin;
  const y0 = Math.max(0, top) + pinch.margin, y1 = Math.min(height, bottom) - pinch.margin;
  if (x1 - x0 < pinch.minimumSpan || y1 - y0 < pinch.minimumSpan) {
    throw new Error(`Camera stage is not large enough for two fingers: ${JSON.stringify(bounds)}`);
  }
  const x = (x0 + x1) / 2, y = (y0 + y1) / 2;
  return Array.from({ length: pinch.steps + 1 }, (_, step) => {
    const progress = step / pinch.steps;
    const spread = pinch.spread * (1 + progress * 0.6);
    return [-1, 1].map((direction, index) => ({
      x: Math.round(x + progress * 12 + direction * spread),
      y: Math.round(y - progress * 15), id: index + 1, radiusX: 2, radiusY: 2, force: 1,
    }));
  });
}

export async function exercisePinch(cdp, directory) {
  const bounds = await evaluate(cdp, `(() => {
    const r = document.querySelector('.billiards-stage').getBoundingClientRect();
    return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:innerWidth, height:innerHeight };
  })()`);
  const frames = pinchPoints(bounds);
  const hits = await evaluate(cdp, `${JSON.stringify(frames.flat())}.every(p =>
    document.elementFromPoint(p.x,p.y)?.matches('[data-billiards-canvas]'))`);
  if (!hits) throw new Error(`Camera gesture is outside the visible canvas: ${JSON.stringify({ bounds, frames })}`);
  let attempted = null;
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    const send = async (type, touchPoints) => {
      attempted = { type, touchPoints };
      await cdp.send('Input.dispatchTouchEvent', attempted);
      await delay(pinch.intervalMs);
    };
    await send('touchStart', [frames[0][0]]);
    await send('touchStart', frames[0]);
    for (const frame of frames.slice(1)) await send('touchMove', frame);
    await send('touchEnd', []);
  } catch (error) {
    const evidence = { bounds, frames, attempted, error: String(error) };
    console.error(JSON.stringify(evidence));
    await writeFile(`${directory}/pinch-error.json`, JSON.stringify(evidence, null, 2));
    await captureScreenshot(cdp, `${directory}/pinch-error.png`);
    throw error;
  }
}
