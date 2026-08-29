import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  captureScreenshot,
  delay,
  evaluate,
  waitForExpression,
} from './browser-quality/cdp-client.mjs';
import { openChromium } from './browser-quality/chromium-host.mjs';
import { createLayoutExpression } from './browser-quality/layout-contract.mjs';

const root = process.cwd();
const baseUrl = process.argv[2] ?? process.env.JUNKYARD_PAGE_URL;
if (!baseUrl) {
  throw new Error('Usage: node tools/check-junkyard-quality.mjs <url>');
}

const quality = JSON.parse(await readFile('quality/quality-contract.json', 'utf8'));
const ui = JSON.parse(await readFile('quality/junkyard-ui-contract.json', 'utf8'));
const outputRoot = path.resolve(
  root,
  process.env.QUALITY_REPORT_DIR ?? 'quality-artifacts',
  'junkyard-ui',
);
await mkdir(outputRoot, { recursive: true });

const chromium = await openChromium();
const { cdp } = chromium;
try {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  const runtimeErrors = collectRuntimeErrors(cdp);
  const viewportReports = [];

  for (const viewport of quality.ui.requiredViewports) {
    runtimeErrors.length = 0;
    viewportReports.push(await inspectViewport({
      cdp,
      viewport,
      quality,
      ui,
      outputRoot,
      runtimeErrors,
    }));
  }

  const failures = viewportReports.flatMap((report) =>
    report.failures.map((failure) => `${report.id}: ${failure}`),
  );
  const report = {
    schemaVersion: 2,
    browserPath: chromium.browserPath,
    baseUrl,
    viewports: viewportReports,
    failures,
  };
  await writeFile(
    path.join(outputRoot, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await chromium.close();
  if (process.exitCode) {
    const errors = chromium.getBrowserErrors().trim();
    if (errors !== '') {
      console.error(errors.slice(-4000));
    }
  }
}

async function inspectViewport({
  cdp,
  viewport,
  quality,
  ui,
  outputRoot,
  runtimeErrors,
}) {
  const directory = path.join(outputRoot, viewport.id);
  await mkdir(directory, { recursive: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 768,
  });
  const url = withQuery(baseUrl, ui.stableQuery, viewport.id);
  await cdp.send('Page.navigate', { url });
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.rootSelector)}))`,
    15000,
  );
  await waitForExpression(cdp, `Boolean(${ui.qaExpression})`, 15000);
  await delay(1000);

  const layout = await evaluate(cdp, createLayoutExpression(quality, ui));
  const boot = await captureScreenshot(cdp, path.join(directory, 'boot.png'));
  const failures = [...layout.failures];
  const interactions = {};

  if (viewport.id === 'phone') {
    interactions.walkAndCollect = await exerciseWalkAndCollect(cdp, ui);
    if (!interactions.walkAndCollect.moved) {
      failures.push('Keyboard movement did not move the proximity-world player.');
    }
    if (!interactions.walkAndCollect.rewarded) {
      failures.push('Approaching the first junk pile did not award scrap.');
    }
    await captureScreenshot(cdp, path.join(directory, 'after-walk.png'));
  }

  const performance = await readPerformance(cdp);
  for (const runtimeError of runtimeErrors) {
    failures.push(`Browser error: ${runtimeError}`);
  }
  const report = {
    id: viewport.id,
    width: viewport.width,
    height: viewport.height,
    url,
    layout,
    interactions,
    performance,
    runtimeErrors: [...runtimeErrors],
    failures,
    screenshotSha256: boot.sha256,
  };
  await writeFile(
    path.join(directory, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

async function exerciseWalkAndCollect(cdp, ui) {
  const baseline = await evaluate(cdp, ui.qaExpression);
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: ui.movement.key,
    code: ui.movement.code,
    windowsVirtualKeyCode: ui.movement.virtualKeyCode,
    nativeVirtualKeyCode: ui.movement.virtualKeyCode,
  });
  await delay(ui.movement.holdMs);
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: ui.movement.key,
    code: ui.movement.code,
    windowsVirtualKeyCode: ui.movement.virtualKeyCode,
    nativeVirtualKeyCode: ui.movement.virtualKeyCode,
  });
  await delay(ui.movement.settleMs ?? 900);
  const current = await evaluate(cdp, ui.qaExpression);
  const baselinePosition = readPlayerPosition(baseline);
  const currentPosition = readPlayerPosition(current);
  const deltaX = currentPosition.x - baselinePosition.x;
  const deltaZ = currentPosition.z - baselinePosition.z;
  const distance = Math.hypot(deltaX, deltaZ);
  const baselineReward = readResource(baseline, ui.movement.rewardResourceId);
  const currentReward = readResource(current, ui.movement.rewardResourceId);
  return {
    baseline,
    current,
    distance,
    moved: distance >= ui.movement.minimumDistance,
    rewarded: currentReward - baselineReward >= ui.movement.minimumReward,
  };
}

function readPlayerPosition(snapshot) {
  const state = snapshot?.state;
  const position = state?.world?.playerPosition
    ?? state?.playerPosition
    ?? state?.player
    ?? { x: 0, z: 0 };
  return {
    x: Number(position.x ?? 0),
    z: Number(position.z ?? 0),
  };
}

function readResource(snapshot, resourceId) {
  const state = snapshot?.state;
  const direct = state?.[resourceId];
  if (typeof direct === 'number') {
    return direct;
  }
  const nested = state?.resources?.[resourceId]
    ?? state?.world?.resources?.[resourceId];
  return typeof nested === 'number' ? nested : 0;
}

function collectRuntimeErrors(cdp) {
  const errors = [];
  cdp.on('Runtime.exceptionThrown', (params) => {
    errors.push(params.exceptionDetails?.text ?? 'Runtime exception');
  });
  cdp.on('Runtime.consoleAPICalled', (params) => {
    if (params.type === 'error' || params.type === 'assert') {
      errors.push(
        params.args?.map((argument) => argument.value ?? argument.description ?? '').join(' ')
          || `console.${params.type}`,
      );
    }
  });
  cdp.on('Log.entryAdded', (params) => {
    if (params.entry?.level === 'error') {
      errors.push(params.entry.text ?? 'Browser log error');
    }
  });
  return errors;
}

function withQuery(base, query, viewportId) {
  const url = new URL(base);
  for (const [key, value] of new URLSearchParams(query)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('viewport', viewportId);
  return url.toString();
}

function readPerformance(cdp) {
  return evaluate(cdp, `(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paints = Object.fromEntries(
      performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime])
    );
    return {
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
      loadMs: navigation?.loadEventEnd ?? null,
      firstPaintMs: paints['first-paint'] ?? null,
      firstContentfulPaintMs: paints['first-contentful-paint'] ?? null,
      heapBytes: performance.memory?.usedJSHeapSize ?? null
    };
  })()`);
}
