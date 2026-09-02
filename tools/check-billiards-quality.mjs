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

const root = process.cwd();
const baseUrl = process.argv[2] ?? process.env.BILLIARDS_PAGE_URL;
if (!baseUrl) {
  throw new Error('Usage: node tools/check-billiards-quality.mjs <url>');
}

const quality = JSON.parse(await readFile('quality/quality-contract.json', 'utf8'));
const ui = JSON.parse(await readFile('quality/billiards-ui-contract.json', 'utf8'));
const outputRoot = path.resolve(
  root,
  process.env.QUALITY_REPORT_DIR ?? 'quality-artifacts',
  'billiards-ui',
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
      ui,
      outputRoot,
      runtimeErrors,
      exerciseShot: viewport.id === 'phone',
    }));
  }

  const failures = viewportReports.flatMap((report) =>
    report.failures.map((failure) => `${report.id}: ${failure}`),
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
    const errors = chromium.getBrowserErrors().trim();
    if (errors !== '') {
      console.error(errors.slice(-4000));
    }
  }
}

async function inspectViewport({
  cdp,
  viewport,
  ui,
  outputRoot,
  runtimeErrors,
  exerciseShot,
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
    20000,
  );
  await waitForExpression(cdp, `Boolean(${ui.qaExpression})`, 20000);
  await delay(700);

  const layout = await evaluate(cdp, createLayoutExpression(ui));
  const screenshot = await captureScreenshot(cdp, path.join(directory, 'boot.png'));
  const failures = [...layout.failures];
  const interactions = {};
  if (exerciseShot) {
    interactions.breakShot = await runBreakShot(cdp, ui, directory);
    if (!interactions.breakShot.completed) {
      failures.push('The deterministic break shot did not complete.');
    }
    if (!interactions.breakShot.cueMoved) {
      failures.push('The cue ball did not travel after the shot.');
    }
    if (!interactions.breakShot.revisionAdvanced) {
      failures.push('The match revision did not advance through the shot.');
    }
  }
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
    performance: await readPerformance(cdp),
    runtimeErrors: [...runtimeErrors],
    failures,
    screenshotSha256: screenshot.sha256,
  };
  await writeFile(
    path.join(directory, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

async function runBreakShot(cdp, ui, directory) {
  const baseline = await evaluate(cdp, ui.qaExpression);
  const started = await evaluate(cdp, `(() => {
    const qa = window.__SLOP_BILLIARDS_QA__;
    if (!qa) return false;
    qa.setAim(0);
    qa.setPower(0.82);
    return qa.shoot();
  })()`);
  if (!started) {
    return {
      completed: false,
      cueMoved: false,
      revisionAdvanced: false,
      baseline,
      current: null,
    };
  }
  await waitForExpression(
    cdp,
    `document.querySelector(${JSON.stringify(ui.rootSelector)})?.getAttribute('data-shot-active') === 'true'`,
    3000,
  );
  const minimumRevision = Number(baseline?.match?.revision ?? 0) + 2;
  await waitForExpression(
    cdp,
    `(() => {
      const snapshot = window.__SLOP_BILLIARDS_QA__?.snapshot();
      return snapshot?.match?.activeShot === null
        && Number(snapshot?.match?.revision ?? 0) >= ${minimumRevision};
    })()`,
    ui.shotSettleTimeoutMs,
  );
  await delay(250);
  const current = await evaluate(cdp, ui.qaExpression);
  await captureScreenshot(cdp, path.join(directory, 'after-break.png'));
  const beforeCue = readCuePosition(baseline);
  const afterCue = readCuePosition(current);
  const cueTravel = Math.hypot(
    afterCue.x - beforeCue.x,
    afterCue.y - beforeCue.y,
  );
  return {
    completed: current?.match?.activeShot === null,
    cueMoved: cueTravel >= ui.minimumCueTravel,
    revisionAdvanced: Number(current?.match?.revision ?? 0) >= minimumRevision,
    cueTravel,
    baselineRevision: baseline?.match?.revision ?? null,
    currentRevision: current?.match?.revision ?? null,
    tableSteps: current?.match?.table?.step ?? null,
  };
}

function createLayoutExpression(ui) {
  return `(() => {
    const failures = [];
    const overflow = Math.max(0, document.documentElement.scrollWidth - innerWidth);
    if (overflow > ${ui.maximumHorizontalOverflowPx}) {
      failures.push('Horizontal overflow: ' + overflow + 'px.');
    }
    const root = document.querySelector(${JSON.stringify(ui.rootSelector)});
    const canvas = document.querySelector(${JSON.stringify(ui.canvasSelector)});
    const shoot = document.querySelector(${JSON.stringify(ui.shootSelector)});
    const restart = document.querySelector(${JSON.stringify(ui.restartSelector)});
    if (!(root instanceof HTMLElement)) failures.push('Billiards root is missing.');
    if (!(canvas instanceof HTMLCanvasElement)) failures.push('Billiards canvas is missing.');
    if (!(shoot instanceof HTMLButtonElement)) failures.push('Shot control is missing.');
    if (!(restart instanceof HTMLButtonElement)) failures.push('Restart control is missing.');
    const canvasRect = canvas instanceof HTMLElement ? canvas.getBoundingClientRect() : null;
    if (canvasRect && (canvasRect.width < ${ui.minimumCanvasWidthPx} || canvasRect.height < ${ui.minimumCanvasHeightPx})) {
      failures.push('The table canvas is below the minimum usable size.');
    }
    for (const element of [shoot, restart]) {
      if (!(element instanceof HTMLElement)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < ${ui.minimumTouchTargetPx} || rect.height < ${ui.minimumTouchTargetPx}) {
        failures.push('A primary billiards control is smaller than the touch target budget.');
      }
      const viewportOverflow = Math.max(
        0,
        -rect.left,
        -rect.top,
        rect.right - innerWidth,
        rect.bottom - innerHeight,
      );
      if (viewportOverflow > ${ui.maximumControlViewportOverflowPx}) {
        failures.push('A primary billiards control is outside the initial viewport.');
      }
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overflow,
      canvas: canvasRect ? { width: canvasRect.width, height: canvasRect.height } : null,
      connection: root?.getAttribute('data-connection-state') ?? null,
      revision: root?.getAttribute('data-match-revision') ?? null,
      failures
    };
  })()`;
}

function readCuePosition(snapshot) {
  const cue = snapshot?.match?.table?.balls?.find((ball) => ball.id === 0);
  return {
    x: Number(cue?.position?.x ?? 0),
    y: Number(cue?.position?.y ?? 0),
  };
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
