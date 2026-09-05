import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const settings = { attempts: 24, intervalMs: 5000, requestTimeoutMs: 10000 };
const [mode, target, commitSha] = process.argv.slice(2);
if (!target || !/^[a-f0-9]{40}$/.test(commitSha ?? '')) {
  throw new Error('Usage: build-identity.mjs <write|verify> <dist-directory|page-url> <commit-sha>');
}
if (mode === 'write') {
  const identity = { schemaVersion: 1, commitSha, controls: 'controls-authority-v3' };
  await writeFile(path.join(target, 'build.json'), `${JSON.stringify(identity, null, 2)}\n`);
  const index = path.join(target, 'index.html');
  const html = (await readFile(index, 'utf8')).replace(/<meta name="slop-build-sha"[^>]*>\s*/g, '');
  if (!html.includes('</head>')) throw new Error('Built index.html has no head element.');
  await writeFile(index, html.replace('</head>', `<meta name="slop-build-sha" content="${commitSha}"></head>`));
} else if (mode === 'verify') {
  await verifyDeployment();
} else throw new Error('Unknown build-identity operation.');

async function verifyDeployment() {
  let observed = 'unavailable';
  for (let attempt = 0; attempt < settings.attempts; attempt += 1) {
    const url = new URL('build.json', target.endsWith('/') ? target : `${target}/`);
    url.searchParams.set('expected', commitSha);
    url.searchParams.set('attempt', String(attempt));
    try {
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(settings.requestTimeoutMs) });
      const identity = response.ok ? await response.json() : null;
      observed = identity?.commitSha ?? `HTTP ${response.status}`;
      if (observed === commitSha) { console.log(`Verified deployed commit ${commitSha}`); return; }
    } catch (error) { observed = String(error); }
    await delay(settings.intervalMs);
  }
  throw new Error(`Pages is not the expected build ${commitSha}; observed ${observed}`);
}
