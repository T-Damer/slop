import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Review input only: runtime imports require a pinned recipe and selected files.
// Keep this acquisition separate from generation; CI never writes back source.
const reference = Object.freeze({
  author: 'Kenney',
  name: 'Nature Kit',
  license: 'CC0-1.0',
  sourcePage: 'https://kenney.nl/assets/nature-kit',
  licensePage: 'https://creativecommons.org/publicdomain/zero/1.0/',
  archive: 'https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip',
  maximumBytes: 24 * 1024 * 1024,
  timeoutMs: 90_000,
});
const directory = resolve('quality-artifacts/island-asset-review');
await mkdir(directory, { recursive: true });
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
// Tracked files only, no .git, credentials, untracked files or local caches.
execFileSync('git', ['archive', '--format=tar.gz', `--output=${directory}/source.tar.gz`, revision]);
await writeFile(`${directory}/revision.txt`, `${revision}\n`);
const response = await fetch(reference.archive, { signal: AbortSignal.timeout(reference.timeoutMs) });
if (!response.ok) throw new Error(`Nature Kit acquisition failed: HTTP ${response.status}`);
const reader = response.body?.getReader();
if (!reader) throw new Error('Nature Kit response has no body');
const chunks = [];
let bytes = 0;
try {
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > reference.maximumBytes) throw new Error('Nature Kit exceeds review download budget');
    chunks.push(value);
  }
} finally {
  await reader.cancel();
}
const archive = Buffer.concat(chunks);
if (archive.readUInt32LE(0) !== 0x04034b50) throw new Error('Nature Kit is not a ZIP archive');
await writeFile(`${directory}/kenney_nature-kit.zip`, archive);
const sha256 = createHash('sha256').update(archive).digest('hex');
const report = { ...reference, revision, bytes, sha256, approvedForRuntime: false };
await writeFile(`${directory}/reference.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
