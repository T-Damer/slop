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
import {
  clickSelector,
  createLayoutExpression,
  probeCanvasInteraction,
  withQualityQuery,
} from './browser-quality/layout-contract.mjs';

const root = process.cwd();
const baseUrl = process.argv[2] ?? process.env.PAGE_URL;
if (!baseUrl) {
  throw new Error('Usage: node tools/check-browser-quality.mjs <url>');
}

const contract = JSON.parse(await readFile('quality/quality-contract.json', 'utf8'));
const uiContract = JSON.parse(await readFile('quality/ui-contract.json', 'utf8'));
const outputRoot = path.resolve(
  root,
  process.env.QUALITY_REPORT_DIR ?? 'quality-artifacts',
  'ui',
);
await mkdir(outputRoot, { recursive: true });

const chromium = await openChromium();
const { cdp } = chromium;
try {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');

  const runtimeErrors = [];
  cdp.on('Runtime.exceptionThrown', (params) => {
    runtimeErrors.push(params.exceptionDetails?.text ?? 'Runtime exception');
  });
  cdp.on('Runtime.consoleAPICalled', (params) => {
    if (params.type === 'error' || params.type === 'assert') {
      runtimeErrors.push(
        params.args?.map((argument) => argument.value ?? argument.description ?? '').join(' ')
          || `console.${params.type}`,
      );
    }
  });
  cdp.on('Log.entryAdded', (params) => {
    if (params.entry?.level === 'error') {
      runtimeErrors.push(params.entry.text ?? 'Browser log error');
    }
  });

  const viewportReports = [];
  for (const viewport of contract.ui.requiredViewports) {
    runtimeErrors.length = 0;
    const report = await inspectViewport({
      cdp,
      viewport,
      contract,
      uiContract,
      baseUrl,
      outputRoot,
      runtimeErrors,
    });
    viewportReports.push(report);
  }

  const failures = viewportReports.flatMap((viewport) =>
    viewport.failures.map((failure) => `${viewport.id}: ${failure}`),
  );
  const report = {
    schemaVersion: 1,
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
    const browserErrors = chromium.getBrowserErrors().trim();
    if (browserErrors !== '') {
      console.error(browserErrors.slice(-4000));
    }
  }
}

async function inspectViewport({
  cdp,
  viewport,
  contract,
  uiContract,
  baseUrl,
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

  const url = withQualityQuery(baseUrl, uiContract.stableQuery, viewport.id);
  await cdp.send('Page.navigate', { url });
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(uiContract.rootSelector)}))`,
    15000,
  );
  await delay(1400);

  const layout = await evaluate(cdp, createLayoutExpression(contract, uiContract));
  const boot = await captureScreenshot(cdp, path.join(directory, 'boot.png'));
  const failures = [...layout.failures];
  const interactions = {};

  if (viewport.id === 'phone') {
    interactions.canvas = await probeCanvasInteraction(cdp, uiContract);
    if (!interactions.canvas.triggered) {
      failures.push('No real canvas interaction produced gameplay feedback.');
    }
    await delay(1800);
    await captureScreenshot(cdp, path.join(directory, 'after-car.png'));

    interactions.hint = await clickSelector(cdp, uiContract.interaction.hintSelector);
    if (!interactions.hint) {
      failures.push('Hint control could not be activated.');
    }
    await delay(900);
    await captureScreenshot(cdp, path.join(directory, 'after-hint.png'));

    const beforeShuffle = await captureScreenshot(
      cdp,
      path.join(directory, 'before-shuffle.png'),
    );
    interactions.shuffle = await clickSelector(
      cdp,
      uiContract.interaction.shuffleSelector,
    );
    if (!interactions.shuffle) {
      failures.push('Shuffle control could not be activated.');
    }
    await delay(1400);
    const afterShuffle = await captureScreenshot(
      cdp,
      path.join(directory, 'after-shuffle.png'),
    );
    interactions.shuffleChangedScreenshot = beforeShuffle.sha256 !== afterShuffle.sha256;
    if (!interactions.shuffleChangedScreenshot) {
      failures.push('Shuffle did not change the rendered layout screenshot.');
    }
  }

  const performance = await evaluate(cdp, `(() => {
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
  addPerformanceFailures(performance, contract.ui.performance, failures);

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

function addPerformanceFailures(performance, limits, failures) {
  if (!limits) {
    return;
  }
  const checks = [
    ['domContentLoadedMs', 'maximumDomContentLoadedMs', 'DOMContentLoaded'],
    ['loadMs', 'maximumLoadMs', 'load'],
    ['firstPaintMs', 'maximumFirstPaintMs', 'first paint'],
    ['firstContentfulPaintMs', 'maximumFirstContentfulPaintMs', 'first contentful paint'],
    ['heapBytes', 'maximumHeapBytes', 'JavaScript heap'],
  ];
  for (const [metric, limitKey, label] of checks) {
    const value = performance[metric];
    const limit = limits[limitKey];
    if (typeof value === 'number' && typeof limit === 'number' && value > limit) {
      failures.push(`${label} exceeded the ratchet: ${value} > ${limit}.`);
    }
  }
}
