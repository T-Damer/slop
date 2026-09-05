import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Read-only asset acquisition for review. No production fetch and no source writes.
const source = 'https://freesound.org/people/Za-Games/sounds/539854/';
const destination = 'quality-artifacts/audio-review';
await mkdir(destination, { recursive: true });
const page = await fetch(source, { signal: AbortSignal.timeout(30000) });
if (!page.ok) throw new Error(`Freesound metadata HTTP ${page.status}`);
const html = await page.text();
await writeFile(`${destination}/source.html`, html);
if (!html.includes('creativecommons.org/publicdomain/zero/1.0')) throw new Error('CC0 license was not found on the source page.');
const urls = [...html.replaceAll('\\/', '/').matchAll(/https:\/\/[^\s"'<>]+539854_[^\s"'<>]+-hq\.mp3/g)].map((match) => match[0]);
const preview = urls.find((value) => ['cdn.freesound.org', 'freesound.org'].includes(new URL(value).hostname));
if (!preview) throw new Error('No public high-quality preview found.');
const response = await fetch(preview, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Freesound audio HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length === 0 || bytes.length > 512000) throw new Error('Unexpected preview size.');
await writeFile(`${destination}/billiard-clack.mp3`, bytes);
await writeFile(`${destination}/provenance.json`, JSON.stringify({ source, preview,
  author: 'Za-Games', soundId: 539854, license: 'CC0-1.0',
  sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }, null, 2));
