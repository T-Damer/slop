import { spawn } from 'node:child_process';
import process from 'node:process';

const baseUrl = process.argv[2] ?? process.env.PAGE_URL;
if (!baseUrl) {
  throw new Error('Usage: node tools/check-all-browser-quality.mjs <url>');
}

for (const script of [
  'tools/check-browser-quality.mjs',
  'tools/check-experience-quality.mjs',
]) {
  const status = await run(script, baseUrl);
  if (status !== 0) {
    process.exitCode = status;
    break;
  }
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
