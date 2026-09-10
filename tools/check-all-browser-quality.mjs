import { spawn } from 'node:child_process';
import process from 'node:process';

const baseUrl = process.argv[2] ?? process.env.PAGE_URL;
if (!baseUrl) {
  throw new Error('Usage: node tools/check-all-browser-quality.mjs <url>');
}

// The personal-island route and the cross-game return journey are owned by
// check-hub-quality.mjs. Keep this aggregate focused on Parking Jam so it does
// not assert the removed legacy card-picker UI.
const status = await run('tools/check-browser-quality.mjs', baseUrl);
if (status !== 0) {
  process.exitCode = status;
}

function run(script, url) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, url], {
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
}
