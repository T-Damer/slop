import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Read-only acquisition: public licensed previews, never login-only originals.
// Evidence stays in an artifact; production uses reviewed, committed local clips.
const sources = [
  { id: 539854, author: 'Za-Games', name: 'ball', license: 'CC0-1.0', licensePath: 'publicdomain/zero/1.0' },
  { id: 42364, author: 'mccarthy@bedmas.com', name: 'cushion', license: 'CC0-1.0', licensePath: 'publicdomain/zero/1.0' },
  { id: 45804, author: 'Bunyi', name: 'cue', license: 'CC-BY-4.0', licensePath: 'licenses/by/4.0' },
  { id: 241373, author: 'jtroan', name: 'pocket', license: 'CC-BY-3.0', licensePath: 'licenses/by/3.0' },
];
const destination = 'quality-artifacts/audio-review';
await mkdir(destination, { recursive: true });
for (const sound of sources) {
  const source = `https://freesound.org/people/${encodeURIComponent(sound.author)}/sounds/${sound.id}/`;
  const page = await fetch(source, { signal: AbortSignal.timeout(30000) });
  if (!page.ok) throw new Error(`Metadata ${sound.name}: HTTP ${page.status}`);
  const html = (await page.text()).replaceAll('\\/', '/');
  await writeFile(`${destination}/${sound.name}-source.html`, html);
  if (!html.includes(`creativecommons.org/${sound.licensePath}`)) throw new Error(`License mismatch: ${sound.name}`);
  const pattern = new RegExp(`https://[^\\s"'<>]+${sound.id}_[^\\s"'<>]+-hq\\.mp3`, 'g');
  const preview = [...html.matchAll(pattern)].map(([url]) => url).find((url) =>
    ['cdn.freesound.org', 'fcdn.freesound.org', 'freesound.org'].includes(new URL(url).hostname));
  if (!preview) throw new Error(`No public preview: ${sound.name}`);
  const response = await fetch(preview, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Audio ${sound.name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 512000) throw new Error(`Unexpected size: ${sound.name}`);
  await writeFile(`${destination}/${sound.name}.mp3`, bytes);
  await writeFile(`${destination}/${sound.name}.json`, JSON.stringify({ ...sound, source, preview,
    sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }, null, 2));
  console.log(`${sound.name}: ${sound.license}, ${bytes.length} bytes`);
}
