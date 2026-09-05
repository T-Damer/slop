import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const compactWebProfile = {
  engineCommit: '145bae5b2dc38ac0561a2b627d726cba69a99c1f',
  entryPath: 'engine/app/main.tsx',
  entryBlob: '6a9e5847f747190890fe6499de602f38611a4d91',
  registryImport: "import './sharedRegistry'",
  replacement: '// SLOP static web profile: remote Modoki OTA subgames are not enabled.',
  projectConfig: 'games/traffic-jam/project.config.json',
};

/** A dependency patch, not a second engine build. Keep the normal Modoki CLI,
 * strict typechecks, asset processing and Vite config. This removes only the
 * namespace export for REMOTELY downloaded Modoki subgames. Our authored game
 * router uses ordinary ESM imports and does not consume that namespace.
 * The hash check deliberately fails when upgrading the pinned engine.
 */
export function compactEngineEntry(source, config, commit) {
  if (commit !== compactWebProfile.engineCommit) throw new Error('Unexpected Modoki revision. Review the compact web patch.');
  if (config.ota && Object.keys(config.ota).length > 0) {
    throw new Error('The static SLOP profile cannot use Modoki OTA configuration. Restore the full engine registry first.');
  }
  if (config.build?.debugBuild === true) throw new Error('Compact web preparation is for release builds only.');
  const original = source.replace(compactWebProfile.replacement, compactWebProfile.registryImport);
  const bytes = Buffer.from(original);
  const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (blob !== compactWebProfile.entryBlob) throw new Error('Modoki entry differs from the reviewed source. Refusing to patch.');
  if (original.split(compactWebProfile.registryImport).length !== 2) throw new Error('Expected exactly one shared registry import.');
  return original.replace(compactWebProfile.registryImport, compactWebProfile.replacement);
}

async function prepare() {
  const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const engine = path.join(repository, '.modoki-engine');
  const config = JSON.parse(await readFile(path.join(repository, compactWebProfile.projectConfig), 'utf8'));
  const commit = execFileSync('git', ['-C', engine, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const file = path.join(engine, compactWebProfile.entryPath);
  const source = await readFile(file, 'utf8');
  const patched = compactEngineEntry(source, config, commit);
  await writeFile(file, patched);
  console.log(`Prepared static SLOP web profile for Modoki ${commit}; ordinary game imports remain enabled.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await prepare();
