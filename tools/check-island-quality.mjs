import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { openChromium } from './browser-quality/chromium-host.mjs';
import { captureScreenshot, delay, evaluate, waitForExpression } from './browser-quality/cdp-client.mjs';

const baseUrl = process.argv[2];
assert.ok(baseUrl, 'Pass the production hub URL.');
const output = path.join(process.env.QUALITY_REPORT_DIR ?? 'quality-artifacts', 'island-cozy');
await mkdir(output, { recursive: true });
const viewports = JSON.parse(await readFile('quality/quality-contract.json', 'utf8')).ui.requiredViewports;
const browser = await openChromium();
const { cdp } = browser;
const failures = [];
const reports = [];
// Software WebGL runners advance capped simulation much slower than wall time.
// Keep real-input assertions, but allow the same route enough actual frames.
const walkingTimeoutMs = 60000;
cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => failures.push(exceptionDetails.text));
cdp.on('Runtime.consoleAPICalled', ({ type, args }) => {
  if (type === 'error') failures.push(args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
});
cdp.on('Log.entryAdded', ({ entry }) => {
  if (entry.level === 'error' && !entry.text.includes('favicon.ico')) failures.push(entry.text);
});
try {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  const url = new URL(baseUrl);
  url.searchParams.set('qa', '1');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('slop.local-player-id.v1', 'island-browser-review')` });
  await cdp.send('Page.navigate', { url: url.href });
  await waitForExpression(cdp, `!!document.querySelector('#slop-island-onboarding')`, 30000);
  await click('[data-island-action="start"]');
  for (let step = 0; step < 7; step += 1) {
    await waitForExpression(cdp, `document.querySelectorAll('.island-chip').length > 0`, 10000);
    await click('.island-chip');
    await click('[data-island-action="next"]');
  }
  await ready();
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await waitForExpression(cdp, `window.__SLOP_ISLAND_QA__.scene().simulationTime > 0.1`, 10000);
  await captureScreenshot(cdp, path.join(output, 'hero-desktop.png'));
  for (const viewport of viewports) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width,
      height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 768 });
    await cdp.send('Page.bringToFront');
    await waitForExpression(cdp, `window.__SLOP_ISLAND_QA__?.scene()?.paused === false`, 10000);
    await delay(500);
    const before = await snapshot();
    await walk('KeyD', 'd', `window.__SLOP_ISLAND_QA__.scene().player.x > ${before.player.x + 0.15}`);
    const after = await snapshot();
    assert.ok(after.player.x > before.player.x, `${viewport.id}: screen-right movement`);
    await walk('KeyA', 'a', `window.__SLOP_ISLAND_QA__.scene().player.x <= ${before.player.x + 0.03}`);
    await click('[data-island-shell-action="camera"]');
    assert.notEqual((await snapshot()).cameraMode, before.cameraMode);
    await click('[data-island-shell-action="camera"]');
    await click('[data-island-shell-action="camera"]');
    await click('[data-island-shell-action="games"]');
    const paused = await snapshot();
    assert.equal(paused.paused, true);
    await key('KeyD', 'd', 200);
    assert.deepEqual((await snapshot()).player, paused.player);
    await key('Escape', 'Escape', 30);
    assert.equal((await snapshot()).paused, false);
    const layout = await evaluate(cdp, `({overflow: document.documentElement.scrollWidth > innerWidth,
      canvas: !!document.querySelector('.island-canvas'),
      action: document.querySelector('[data-island-interact]').getBoundingClientRect().height,
      renderer: window.__SLOP_ISLAND_QA__.scene().renderer})`);
    assert.equal(layout.overflow, false);
    assert.ok(layout.action >= 44);
    await captureScreenshot(cdp, path.join(output, `${viewport.id}.png`));
    reports.push({ ...viewport, ...layout });
  }
  // Real joystick pointer dispatch, rather than calling the simulation or teleporting QA state.
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const beforeTouch = await snapshot();
  const stick = await evaluate(cdp, `(() => { const r = document.querySelector('.island-joystick-base').getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: stick.x, y: stick.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: stick.x + 34, y: stick.y }] });
  await waitForExpression(cdp, `window.__SLOP_ISLAND_QA__.scene().player.x > ${beforeTouch.player.x + 0.05}`, 10000);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok((await snapshot()).player.x > beforeTouch.player.x, 'Touch joystick moves right');
  // Focus loss releases a held key and pauses portal progress.
  await evaluate(cdp, `window.dispatchEvent(new Event('blur'))`);
  assert.equal((await snapshot()).paused, true);
  await evaluate(cdp, `window.dispatchEvent(new Event('focus'))`);
  assert.equal((await snapshot()).paused, false);
  assert.equal((await snapshot()).portal.progress, 0);
  // Deterministic fixture route: walk to a tree, harvest, return by the cottage and plant.
  // The read-only QA bridge observes state; no teleport or reward injection is used.
  await walk('KeyD', 'd', `document.querySelector('[data-island-interact]').textContent.includes('Собрать яблоко')`);
  await key('KeyE', 'e', 30);
  await waitForExpression(cdp, `window.__SLOP_ISLAND_QA__.scene().fruit === 1`, 10000);
  await walk('KeyA', 'a', `window.__SLOP_ISLAND_QA__.scene().player.x <= 0.1`);
  await walk('KeyW', 'w', `window.__SLOP_ISLAND_QA__.scene().player.z <= 1.5`);
  await walk('KeyA', 'a', `document.querySelector('[data-island-interact]').textContent.includes('Посадить цветы')`);
  await click('[data-island-interact]');
  await waitForExpression(cdp, `window.__SLOP_ISLAND_QA__.scene().planted === 1`, 10000);
  const journal = (await snapshot()).journal;
  await captureScreenshot(cdp, path.join(output, 'planting.png'));
  await cdp.send('Page.reload');
  await ready();
  const restored = await snapshot();
  assert.equal(restored.planted, 1);
  assert.equal(restored.fruit, 0);
  assert.deepEqual(restored.journal, journal);
  reports.push({ interactions: { keyboard: true, touch: true, pause: true,
    harvest: true, planting: true, persistence: true } });
  await click('[data-island-shell-action="camera"]');
  await click('[data-island-shell-action="camera"]');
  const overviewStart = (await snapshot()).simulationTime;
  await waitForExpression(cdp, `window.__SLOP_ISLAND_QA__.scene().simulationTime > ${overviewStart + 0.8}`, walkingTimeoutMs);
  await captureScreenshot(cdp, path.join(output, 'overview.png'));
} catch (error) {
  failures.push(error instanceof Error ? error.stack : String(error));
  reports.push({ failureState: await snapshot().catch(() => null) });
  await captureScreenshot(cdp, path.join(output, 'failure.png')).catch(() => {});
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ reports, failures }, null, 2));
  console.log(JSON.stringify({ reports, failures }, null, 2));
  await browser.close();
}
if (failures.length > 0) process.exitCode = 1;

async function click(selector) {
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click()`);
  await delay(120);
}
async function ready() {
  await waitForExpression(cdp, `!!window.__SLOP_ISLAND_QA__?.ready()`, 30000);
  await delay(500);
}
async function snapshot() { return evaluate(cdp, `window.__SLOP_ISLAND_QA__.scene()`); }
async function key(code, key, milliseconds) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key });
  await delay(milliseconds);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key });
  await delay(100);
}

async function walk(code, key, condition) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key });
  try { await waitForExpression(cdp, condition, walkingTimeoutMs); }
  finally { await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key }); }
}
