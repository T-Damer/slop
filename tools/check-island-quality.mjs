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
  await cdp.send('Page.navigate', { url: url.href });
  await waitForExpression(cdp, `!!document.querySelector('#slop-island-onboarding')`, 30000);
  await click('[data-island-action="start"]');
  for (let step = 0; step < 7; step += 1) {
    await waitForExpression(cdp, `document.querySelectorAll('.island-chip').length > 0`, 10000);
    await click('.island-chip');
    await click('[data-island-action="next"]');
  }
  await ready();
  for (const viewport of viewports) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width,
      height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 768 });
    await delay(500);
    const before = await snapshot();
    await key('KeyD', 'd', 250);
    const after = await snapshot();
    assert.ok(after.player.x > before.player.x, `${viewport.id}: screen-right movement`);
    await key('KeyA', 'a', 250);
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
  const beforeTouch = await snapshot();
  const stick = await evaluate(cdp, `(() => { const r = document.querySelector('.island-joystick-base').getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: stick.x, y: stick.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: stick.x + 34, y: stick.y }] });
  await delay(300);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok((await snapshot()).player.x > beforeTouch.player.x, 'Touch joystick moves right');
  // Focus loss releases a held key and pauses portal progress.
  await evaluate(cdp, `window.dispatchEvent(new Event('blur'))`);
  assert.equal((await snapshot()).paused, true);
  await evaluate(cdp, `window.dispatchEvent(new Event('focus'))`);
  assert.equal((await snapshot()).paused, false);
  assert.equal((await snapshot()).portal.progress, 0);
} catch (error) {
  failures.push(error instanceof Error ? error.stack : String(error));
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
