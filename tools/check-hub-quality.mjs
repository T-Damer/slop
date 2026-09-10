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
const baseUrl = process.argv[2] ?? process.env.HUB_PAGE_URL;
if (!baseUrl) {
  throw new Error('Usage: node tools/check-hub-quality.mjs <url>');
}

const quality = JSON.parse(await readFile('quality/quality-contract.json', 'utf8'));
const ui = JSON.parse(await readFile('quality/hub-ui-contract.json', 'utf8'));
const outputRoot = path.resolve(
  root,
  process.env.QUALITY_REPORT_DIR ?? 'quality-artifacts',
  'hub-ui',
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
      resetIsland: viewport.id === 'small-phone',
    }));
  }

  const failures = viewportReports.flatMap((report) =>
    report.failures.map((failure) => `${report.id}: ${failure}`),
  );
  const report = {
    schemaVersion: 3,
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
  resetIsland,
}) {
  const directory = path.join(outputRoot, viewport.id);
  await mkdir(directory, { recursive: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 768,
  });
  await cdp.send('Page.navigate', {
    url: createTestUrl(baseUrl, resetIsland),
  });
  const onboarding = await ensureIslandReady(cdp, ui);
  await delay(600);

  const layout = await evaluate(cdp, createIslandLayoutExpression(ui));
  const screenshot = await captureScreenshot(cdp, path.join(directory, 'island.png'));
  const failures = [...layout.failures];
  const interactions = { onboarding };

  if (viewport.id === 'phone') {
    interactions.junkyardLaunch = await launchJunkyard(cdp, ui, directory);
    if (!interactions.junkyardLaunch.launched) {
      failures.push('Junkyard Station did not launch from the island game menu.');
    }
    if (!interactions.junkyardLaunch.returned) {
      failures.push('The home control did not return to the personal island.');
    }
  }

  for (const runtimeError of runtimeErrors) {
    failures.push(`Browser error: ${runtimeError}`);
  }
  const report = {
    id: viewport.id,
    width: viewport.width,
    height: viewport.height,
    layout,
    interactions,
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

async function ensureIslandReady(cdp, ui) {
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.onboardingSelector)}) || document.querySelector(${JSON.stringify(ui.islandSelector)}))`,
    20000,
  );
  const needsOnboarding = await evaluate(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.onboardingSelector)}))`,
  );
  if (needsOnboarding) {
    await completeOnboarding(cdp, ui);
  }
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.islandSelector)}) && window.__SLOP_ISLAND_QA__?.ready())`,
    30000,
  );
  return needsOnboarding;
}

async function completeOnboarding(cdp, ui) {
  await clickSelector(cdp, ui.startSelector);
  for (let index = 0; index < ui.preferenceStepCount; index += 1) {
    await waitForExpression(
      cdp,
      `document.querySelectorAll(${JSON.stringify(ui.chipSelector)}).length > 0`,
      10000,
    );
    await clickSelector(cdp, `${ui.chipSelector}:first-of-type`);
    await clickSelector(cdp, ui.nextSelector);
  }
}

async function launchJunkyard(cdp, ui, directory) {
  await clickSelector(cdp, ui.gameMenuButtonSelector);
  await waitForExpression(
    cdp,
    `document.querySelector(${JSON.stringify(ui.gameMenuSelector)})?.classList.contains('is-open') === true`,
    10000,
  );
  const menu = await evaluate(cdp, createGameMenuExpression(ui));
  await clickSelector(cdp, ui.junkyardLinkSelector);
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.junkyardRootSelector)}))`,
    20000,
  );
  await delay(800);
  await captureScreenshot(cdp, path.join(directory, 'junkyard-launch.png'));
  const homeVisible = await evaluate(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.homeSelector)}))`,
  );
  if (!homeVisible) {
    return { launched: true, returned: false, menu };
  }
  await clickSelector(cdp, ui.homeSelector);
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.islandSelector)}) && window.__SLOP_ISLAND_QA__?.ready())`,
    20000,
  );
  return { launched: true, returned: true, menu };
}

async function clickSelector(cdp, selector) {
  const clicked = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLButtonElement)) return false;
    element.click();
    return true;
  })()`);
  if (!clicked) {
    throw new Error(`Could not click ${selector}.`);
  }
  await delay(120);
}

function createIslandLayoutExpression(ui) {
  return `(() => {
    const failures = [];
    const overflow = Math.max(0, document.documentElement.scrollWidth - innerWidth);
    if (overflow > ${ui.maximumHorizontalOverflowPx}) {
      failures.push('Horizontal overflow: ' + overflow + 'px.');
    }
    const root = document.querySelector(${JSON.stringify(ui.islandSelector)});
    const canvas = document.querySelector(${JSON.stringify(ui.canvasSelector)});
    const joystick = document.querySelector(${JSON.stringify(ui.joystickSelector)});
    const camera = document.querySelector(${JSON.stringify(ui.cameraSelector)});
    if (!(root instanceof HTMLElement)) failures.push('Personal island root is missing.');
    if (!(canvas instanceof HTMLCanvasElement)) failures.push('Island canvas is missing.');
    if (!(joystick instanceof HTMLElement)) failures.push('Touch joystick is missing.');
    if (!(camera instanceof HTMLButtonElement)) failures.push('Camera control is missing.');
    if (document.querySelector('.slop-game-grid')) failures.push('Legacy game picker is still rendered.');
    for (const element of [joystick, camera]) {
      if (!(element instanceof HTMLElement)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < ${ui.minimumTouchTargetPx} || rect.height < ${ui.minimumTouchTargetPx}) {
        failures.push('A primary island control is smaller than the touch target budget.');
      }
    }
    const qa = window.__SLOP_ISLAND_QA__;
    if (!qa?.hasSnapshot()) failures.push('Island snapshot is not available.');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overflow,
      canvas: canvas instanceof HTMLCanvasElement,
      joystick: joystick instanceof HTMLElement,
      camera: camera instanceof HTMLButtonElement,
      scene: qa?.scene() ?? null,
      failures
    };
  })()`;
}

function createGameMenuExpression(ui) {
  return `(() => {
    const cards = [...document.querySelectorAll(${JSON.stringify(ui.gameCardSelector)})]
      .filter((element) => element instanceof HTMLButtonElement)
      .map((element) => ({
        id: element.dataset.islandGameId ?? '',
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height
      }));
    return {
      cards,
      hasMinimum: cards.length >= ${ui.minimumCardCount},
      hasExpected: ${JSON.stringify(ui.expectedGameIds)}.every((id) => cards.some((card) => card.id === id))
    };
  })()`;
}

function createTestUrl(value, resetIsland) {
  const url = new URL(value);
  url.searchParams.set('qa', '1');
  if (resetIsland) {
    url.searchParams.set('resetIsland', '1');
  }
  return url.toString();
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
