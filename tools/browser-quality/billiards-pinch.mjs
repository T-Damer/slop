import { writeFile } from 'node:fs/promises';
import { captureScreenshot, delay, evaluate, waitForExpression } from './cdp-client.mjs';

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
  const hits = await evaluate(cdp, `${JSON.stringify(frames.flat())}.map(p => {
    const element=document.elementFromPoint(p.x,p.y);
    return {x:p.x,y:p.y,canvas:element?.matches('[data-billiards-canvas]')??false,
      tag:element?.tagName??null,id:element?.id??null,className:typeof element?.className==='string'?element.className:null};
  })`);
  if (hits.some((hit) => !hit.canvas)) {
    const evidence = { bounds, frames, hits };
    await writeFile(`${directory}/pinch-hit-test.json`, `${JSON.stringify(evidence, null, 2)}\n`);
    throw new Error(`Camera gesture is outside the visible canvas: ${JSON.stringify(evidence)}`);
  }
  let attempted = null;
  try {
    const send = async (type, touchPoints) => {
      attempted = { type, touchPoints };
      await cdp.send('Input.dispatchTouchEvent', attempted);
      await delay(pinch.intervalMs);
    };
    await send('touchStart', [frames[0][0]]);
    await send('touchStart', frames[0]);
    await waitForExpression(cdp, 'window.__SLOP_BILLIARDS_QA_V2__.snapshot().camera.multiTouch === true', 3000);
    for (const frame of frames.slice(1)) await send('touchMove', frame);
    await waitForExpression(cdp, 'window.__SLOP_BILLIARDS_QA_V2__.snapshot().camera.zoom > 1.2', 3000);
    await send('touchEnd', []);
    await waitForExpression(cdp, 'window.__SLOP_BILLIARDS_QA_V2__.snapshot().camera.multiTouch === false', 3000);
  } catch (error) {
    const state = await evaluate(cdp, 'window.__SLOP_BILLIARDS_QA_V2__.snapshot()').catch(() => null);
    const evidence = { bounds, frames, attempted, state, error: String(error) };
    console.error(JSON.stringify(evidence));
    await writeFile(`${directory}/pinch-error.json`, JSON.stringify(evidence, null, 2));
    await captureScreenshot(cdp, `${directory}/pinch-error.png`);
    throw error;
  } finally {
    // Device capabilities belong to the viewport, not to a gesture. Toggling
    // touch emulation between gestures can invalidate Chrome's active pointers.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }).catch(() => undefined);
  }
}
