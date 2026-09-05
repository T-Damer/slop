import { canWalkOnIsland } from '../../games/island-hub/runtime/domain/walking.ts';
import { evaluate, waitForExpression, delay, captureScreenshot } from './cdp-client.mjs';
import path from 'node:path';

export const voyageQa = 'window.__SLOP_ISLAND_QA__.scene()';
const timing = { timeout: 60000, grid: 0.5, clearance: 0.13, goalRadius: 0.45, stopMargin: 0.06 };
export function voyageHarness(cdp, output) {
  let mobile = false;
  const read = () => evaluate(cdp, voyageQa);
  const wait = (expression) => waitForExpression(cdp, expression, timing.timeout);
  return {
    cdp, read, wait,
    capture: (name) => captureScreenshot(cdp, path.join(output, `${name}.png`)),
    viewport: async (phone) => {
      mobile = phone;
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: phone ? 390 : 1366,
        height: phone ? 844 : 768, deviceScaleFactor: 1, mobile: phone });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: phone, maxTouchPoints: 1 });
    },
    click: async (selector) => {
      const point = await evaluate(cdp, `(() => { const e = document.querySelector(${JSON.stringify(selector)});
        if (!e || e.disabled) throw Error('Control unavailable: ' + ${JSON.stringify(selector)});
        e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      if (mobile) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
      }
      await delay(150);
    },
    key: async (code) => {
      const virtualKey = code === 'Escape' ? 27 : code.startsWith('Key') ? code.charCodeAt(3) : 0;
      const event = { code, key: code.startsWith('Key') ? code.slice(-1).toLowerCase() : code,
        windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey };
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...event });
      await delay(80);
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...event });
    },
    walkTo: async (target) => {
      const before = await read();
      const route = findWalkingRoute(before.voyage.blueprint, before.player, target);
      for (const point of route) {
        const player = (await read()).player;
        for (const axis of ['x', 'z']) {
          const difference = point[axis] - player[axis];
          if (Math.abs(difference) < timing.stopMargin) continue;
          const positive = difference > 0;
          const code = axis === 'x' ? positive ? 'KeyD' : 'KeyA' : positive ? 'KeyS' : 'KeyW';
          await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: code.slice(-1).toLowerCase() });
          try { await wait(`${voyageQa}.player.${axis} ${positive ? '>=' : '<='} ${point[axis] + (positive ? -timing.stopMargin : timing.stopMargin)}`); }
          finally { await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code.slice(-1).toLowerCase() }); }
        }
      }
    },
  };
}
/** Test-only navigation plans key presses from the read-only snapshot. It never sets player state. */
export function findWalkingRoute(world, origin, goal) {
  const grid = timing.grid;
  const key = (x, z) => `${x}:${z}`;
  const start = { x: Math.round(origin.x / grid), z: Math.round(origin.z / grid), previous: null };
  const queue = [start]; const seen = new Set([key(start.x, start.z)]);
  let found = null;
  for (let i = 0; i < queue.length; i += 1) {
    const point = queue[i];
    if (Math.hypot(point.x * grid - goal.x, point.z * grid - goal.z) <= timing.goalRadius) { found = point; break; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: point.x + dx, z: point.z + dz, previous: point }; const id = key(next.x, next.z);
      if (seen.has(id)) continue;
      const clear = [[0, 0], [timing.clearance, 0], [-timing.clearance, 0], [0, timing.clearance], [0, -timing.clearance]]
        .every(([x, z]) => canWalkOnIsland({ x: next.x * grid + x, z: next.z * grid + z }, world));
      if (!clear) continue;
      seen.add(id); queue.push(next);
    }
  }
  if (!found) throw Error(`No walkable route to ${JSON.stringify(goal)}`);
  const points = [];
  for (let point = found; point; point = point.previous) points.push({ x: point.x * grid, z: point.z * grid });
  points.reverse();
  return points.filter((point, index) => index === 0 || index === points.length - 1
    || (points[index - 1].x !== points[index + 1].x && points[index - 1].z !== points[index + 1].z));
}
