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
import { clickSelector } from './browser-quality/layout-contract.mjs';

const root = process.cwd();
const baseUrl = process.argv[2] ?? process.env.PAGE_URL;
if (!baseUrl) {
  throw new Error('Usage: node tools/check-experience-quality.mjs <url>');
}

const contract = JSON.parse(
  await readFile('quality/experience-ui-contract.json', 'utf8'),
);
const quality = JSON.parse(await readFile('quality/quality-contract.json', 'utf8'));
const outputRoot = path.resolve(
  root,
  process.env.QUALITY_REPORT_DIR ?? 'quality-artifacts',
  'experience',
);
await mkdir(outputRoot, { recursive: true });

const chromium = await openChromium();
const { cdp } = chromium;
const runtimeErrors = [];
try {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  installErrorCapture(cdp, runtimeErrors);

  const hubReports = [];
  for (const viewport of [
    { id: 'hub-phone', width: 360, height: 640 },
    { id: 'hub-desktop', width: 1366, height: 768 },
  ]) {
    runtimeErrors.length = 0;
    hubReports.push(await inspectHub(cdp, viewport, runtimeErrors));
  }
  runtimeErrors.length = 0;
  const journey = await inspectGameJourney(cdp, runtimeErrors);
  const failures = [
    ...hubReports.flatMap((report) =>
      report.failures.map((failure) => `${report.id}: ${failure}`),
    ),
    ...journey.failures.map((failure) => `journey: ${failure}`),
  ];
  const report = {
    schemaVersion: 2,
    baseUrl,
    browserPath: chromium.browserPath,
    hubs: hubReports,
    journey,
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

async function inspectHub(cdp, viewport, errors) {
  await setViewport(cdp, viewport);
  const url = routeUrl('qa=1');
  await cdp.send('Page.navigate', { url });
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${json(contract.hub.rootSelector)}))`,
    15000,
  );
  await delay(700);
  const layout = await evaluate(cdp, hubLayoutExpression());
  const screenshot = await captureScreenshot(
    cdp,
    path.join(outputRoot, `${viewport.id}.png`),
  );
  const failures = [...layout.failures];
  failures.push(...errors.map((error) => `Browser error: ${error}`));
  return {
    ...viewport,
    url,
    layout,
    screenshotSha256: screenshot.sha256,
    runtimeErrors: [...errors],
    failures,
  };
}

async function inspectGameJourney(cdp, errors) {
  const failures = [];
  await setViewport(cdp, { id: 'journey-phone', width: 390, height: 844 });
  const url = routeUrl(contract.junkyard.stableQuery);
  await cdp.send('Page.navigate', { url });
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${json(contract.junkyard.rootSelector)}))
      && Boolean(window.__SLOP_JUNKYARD_QA__)`,
    15000,
  );
  await delay(1100);
  const before = await junkyardSnapshot(cdp);
  await captureScreenshot(cdp, path.join(outputRoot, 'junkyard-boot.png'));
  await holdMovementKey(cdp, 'KeyD', 'd', 420);
  await delay(180);
  const bubbleVisible = await evaluate(
    cdp,
    `document.querySelector(${json(contract.junkyard.actionBubbleSelector)})
      ?.classList.contains('is-visible') ?? false`,
  );
  await captureScreenshot(cdp, path.join(outputRoot, 'junkyard-action.png'));
  await waitForExpression(
    cdp,
    'window.__SLOP_JUNKYARD_QA__?.snapshot().state.clearedJunkCount >= 1',
    5000,
  );
  const after = await junkyardSnapshot(cdp);
  if (!bubbleVisible) {
    failures.push('Automatic proximity interaction bubble never became visible.');
  }
  if (after.state.clearedJunkCount <= before.state.clearedJunkCount) {
    failures.push('Real movement did not complete a junk interaction.');
  }
  if (after.state.scrap < 1 || after.state.cash < 1) {
    failures.push('Completed junk interaction did not award resources.');
  }
  if (after.renderer.calls <= 0 || after.renderer.triangles <= 0) {
    failures.push('Junkyard renderer did not produce a real 3D frame.');
  }
  if (after.renderer.pixelRatio > 1.01) {
    failures.push(`Low quality pixel ratio is ${after.renderer.pixelRatio}.`);
  }

  const homeClicked = await clickSelector(cdp, contract.junkyard.homeSelector);
  if (!homeClicked) {
    failures.push('Home control could not be activated.');
  } else {
    await waitForExpression(
      cdp,
      `Boolean(document.querySelector(${json(contract.hub.rootSelector)}))`,
      8000,
    );
  }
  const parkingClicked = await clickSelector(
    cdp,
    contract.hub.parkingCardSelector,
  );
  if (!parkingClicked) {
    failures.push('Parking Jam card could not be activated from the hub.');
  } else {
    await waitForExpression(
      cdp,
      "Boolean(document.querySelector('#slop-parking-jam'))",
      15000,
    );
    await delay(900);
    await captureScreenshot(cdp, path.join(outputRoot, 'parking-from-hub.png'));
  }
  failures.push(...errors.map((error) => `Browser error: ${error}`));
  return {
    url,
    before,
    after,
    bubbleVisible,
    homeClicked,
    parkingClicked,
    runtimeErrors: [...errors],
    failures,
  };
}

function installErrorCapture(cdp, errors) {
  cdp.on('Runtime.exceptionThrown', (params) => {
    errors.push(params.exceptionDetails?.text ?? 'Runtime exception');
  });
  cdp.on('Runtime.consoleAPICalled', (params) => {
    if (params.type === 'error' || params.type === 'assert') {
      errors.push(
        params.args?.map((argument) =>
          argument.value ?? argument.description ?? '').join(' ')
          || `console.${params.type}`,
      );
    }
  });
  cdp.on('Log.entryAdded', (params) => {
    if (params.entry?.level === 'error') {
      errors.push(params.entry.text ?? 'Browser log error');
    }
  });
}

async function setViewport(cdp, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 768,
  });
}

async function junkyardSnapshot(cdp) {
  return evaluate(cdp, 'window.__SLOP_JUNKYARD_QA__.snapshot()');
}

async function holdMovementKey(cdp, code, key, durationMs) {
  const virtualKeyCode = key.toUpperCase().charCodeAt(0);
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    code,
    key,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
  });
  await delay(durationMs);
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    code,
    key,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
  });
}

function routeUrl(query) {
  const url = new URL(baseUrl);
  url.search = '';
  for (const [key, value] of new URLSearchParams(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function hubLayoutExpression() {
  return `(() => {
    const failures = [];
    const cards = [...document.querySelectorAll(${json(contract.hub.cardSelector)})];
    const overflow = Math.max(0, document.documentElement.scrollWidth - innerWidth);
    if (overflow > ${quality.ui.maximumHorizontalOverflowPx}) {
      failures.push('Horizontal overflow: ' + overflow + 'px.');
    }
    if (cards.length < 2) failures.push('Hub exposes fewer than two games.');
    const buttons = [...document.querySelectorAll('button')]
      .filter((element) => element.offsetParent !== null)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const horizontalViewportClipping = rect.left < -1 || rect.right > innerWidth + 1;
        const internalClipping = element.scrollWidth > element.clientWidth + 1
          || element.scrollHeight > element.clientHeight + 1;
        return {
          label: element.getAttribute('aria-label') || element.textContent?.trim() || 'button',
          width: rect.width,
          height: rect.height,
          horizontalViewportClipping,
          internalClipping
        };
      });
    for (const button of buttons) {
      if (button.width < ${quality.ui.minimumTouchTargetPx} || button.height < ${quality.ui.minimumTouchTargetPx}) {
        failures.push('Touch target too small: ' + button.label + '.');
      }
      if (button.horizontalViewportClipping) {
        failures.push('Hub control crosses the horizontal viewport: ' + button.label + '.');
      }
      if (button.internalClipping) {
        failures.push('Hub control clips its own content: ' + button.label + '.');
      }
    }
    return { viewport: { width: innerWidth, height: innerHeight }, overflow, cardCount: cards.length, buttons, failures };
  })()`;
}

function json(value) {
  return JSON.stringify(value);
}
