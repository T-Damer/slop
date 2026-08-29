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

async function inspectViewport({ cdp, viewport, ui, outputRoot, runtimeErrors }) {
  const directory = path.join(outputRoot, viewport.id);
  await mkdir(directory, { recursive: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 768,
  });
  await cdp.send('Page.navigate', { url: baseUrl });
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.rootSelector)}))`,
    15000,
  );
  await delay(500);

  const layout = await evaluate(cdp, createHubLayoutExpression(ui));
  const boot = await captureScreenshot(cdp, path.join(directory, 'hub.png'));
  const failures = [...layout.failures];
  const interactions = {};

  if (viewport.id === 'phone') {
    interactions.junkyardLaunch = await launchJunkyard(cdp, ui, directory);
    if (!interactions.junkyardLaunch.launched) {
      failures.push('Junkyard Station card did not launch the game shell.');
    }
    if (!interactions.junkyardLaunch.returned) {
      failures.push('The game-shell home control did not return to the hub.');
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
    screenshotSha256: boot.sha256,
  };
  await writeFile(
    path.join(directory, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

async function launchJunkyard(cdp, ui, directory) {
  const clicked = await evaluate(cdp, `(() => {
    const button = document.querySelector(${JSON.stringify(ui.junkyardLinkSelector)});
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) {
    return { launched: false, returned: false };
  }
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.junkyardRootSelector)}))`,
    20000,
  );
  await delay(900);
  await captureScreenshot(cdp, path.join(directory, 'junkyard-launch.png'));
  const homeVisible = await evaluate(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.homeSelector)}))`,
  );
  if (!homeVisible) {
    return { launched: true, returned: false };
  }
  await evaluate(cdp, `(() => {
    const button = document.querySelector(${JSON.stringify(ui.homeSelector)});
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  })()`);
  await waitForExpression(
    cdp,
    `Boolean(document.querySelector(${JSON.stringify(ui.rootSelector)}))`,
    20000,
  );
  return { launched: true, returned: true };
}

function createHubLayoutExpression(ui) {
  return `(() => {
    const failures = [];
    const overflow = Math.max(0, document.documentElement.scrollWidth - innerWidth);
    if (overflow > ${ui.maximumHorizontalOverflowPx}) {
      failures.push('Horizontal overflow: ' + overflow + 'px.');
    }
    const cards = [...document.querySelectorAll(${JSON.stringify(ui.cardSelector)})]
      .filter((element) => element instanceof HTMLButtonElement)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          id: element.dataset.gameId ?? '',
          width: rect.width,
          height: rect.height,
          visible: element.offsetParent !== null
        };
      });
    if (cards.length < ${ui.minimumCardCount}) {
      failures.push('Expected at least ${ui.minimumCardCount} visible game cards.');
    }
    for (const expectedId of ${JSON.stringify(ui.expectedGameIds)}) {
      if (!cards.some((card) => card.id === expectedId)) {
        failures.push('Missing game card: ' + expectedId + '.');
      }
    }
    for (const card of cards) {
      if (card.width < ${ui.minimumTouchTargetPx} || card.height < ${ui.minimumTouchTargetPx}) {
        failures.push('Game card is too small: ' + card.id + '.');
      }
    }
    const icons = document.querySelectorAll(${JSON.stringify(ui.iconSelector)}).length;
    if (icons < cards.length) {
      failures.push('Every game card must have an original rendered icon.');
    }
    return { viewport: { width: innerWidth, height: innerHeight }, overflow, cards, icons, failures };
  })()`;
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
