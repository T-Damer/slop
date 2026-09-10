import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { CdpClient, delay } from './cdp-client.mjs';

export async function openChromium() {
  const browserPath = process.env.CHROME_BIN ?? await findBrowser();
  const userDataDirectory = await mkdtemp(path.join(os.tmpdir(), 'slop-chrome-'));
  const browser = spawn(browserPath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-sync',
    '--hide-scrollbars',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-first-run',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDirectory}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let browserErrors = '';
  browser.stderr.on('data', (chunk) => {
    browserErrors += chunk.toString();
  });

  const port = await readDebugPort(userDataDirectory);
  const target = await waitForTarget(port);
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.connect();

  return {
    browserPath,
    cdp,
    getBrowserErrors: () => browserErrors,
    close: async () => {
      await cdp.close();
      browser.kill('SIGTERM');
      await delay(200);
      if (!browser.killed) {
        browser.kill('SIGKILL');
      }
      await rm(userDataDirectory, { recursive: true, force: true });
    },
  };
}

async function findBrowser() {
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next known path.
    }
  }
  throw new Error('No supported Chromium browser found. Set CHROME_BIN.');
}

async function readDebugPort(directory) {
  const file = path.join(directory, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const [port] = (await readFile(file, 'utf8')).trim().split(/\r?\n/u);
      if (port) {
        return Number.parseInt(port, 10);
      }
    } catch {
      // Browser is still starting.
    }
    await delay(100);
  }
  throw new Error('Chromium did not expose a DevTools port.');
}

async function waitForTarget(port) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const target = targets.find((candidate) => candidate.type === 'page');
      if (target?.webSocketDebuggerUrl) {
        return target;
      }
    } catch {
      // DevTools endpoint is still starting.
    }
    await delay(100);
  }
  throw new Error('Chromium page target was not available.');
}
