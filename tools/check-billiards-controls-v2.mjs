import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const presentationRoot = path.join(root, 'games/billiards/runtime/presentation');
const excludedDirectories = new Set(['node_modules', 'dist', '.git']);
const requiredFiles = [
  'adaptive-quality-v2.ts',
  'app-v2.ts',
  'ball-renderer-v2.ts',
  'canvas-renderer-v2.ts',
  'control-input-v2.ts',
  'controller-v2.ts',
  'cue-renderer-v2.ts',
  'frame-loop-v2.ts',
  'guide-renderer-v2.ts',
  'interaction-state-v2.ts',
  'pocket-club.css',
  'table-camera.ts',
  'pointer-input-v2.ts',
  'rail-input-v2.ts',
  'shot-interaction-v2.ts',
  'table-skins-v2.ts',
  'view-state-v2.ts',
];

const failures = [];
const sources = new Map();
for (const file of requiredFiles) {
  try {
    sources.set(file, await readFile(path.join(presentationRoot, file), 'utf8'));
  } catch {
    failures.push(`missing required Pocket Club source: ${file}`);
  }
}

const appEntry = await readFile(path.join(presentationRoot, 'app.ts'), 'utf8');
expectIncludes(appEntry, "from './app-v2.ts'", 'app.ts must activate the v2 runtime');
const frameLoop = sources.get('frame-loop-v2.ts') ?? '';
const controller = sources.get('controller-v2.ts') ?? '';
const pointer = sources.get('pointer-input-v2.ts') ?? '';
const renderer = sources.get('canvas-renderer-v2.ts') ?? '';
const styles = sources.get('pocket-club.css') ?? '';

expectIncludes(frameLoop, 'recoverWhenStalled', 'frame loop needs stall recovery');
expectIncludes(frameLoop, 'visibilitychange', 'frame loop needs visibility recovery');
expectIncludes(controller, 'public advance(', 'simulation must be driven by the shared game loop');
expectExcludes(controller, 'requestAnimationFrame(', 'controller may not own a second frame loop');
expectIncludes(pointer, 'beginManualStroke', 'pointer input must support manual cue strokes');
expectIncludes(pointer, 'ManualCueStroke', 'manual stroke must use pointer velocity');
expectIncludes(renderer, 'placementPreview', 'renderer must draw placement preview');
expectIncludes(renderer, 'if (!placing', 'cue and guide must be hidden while placing');
expectIncludes(sources.get('table-camera.ts') ?? '', 'this.portrait ? 90 : 0', 'camera must rotate the portrait table');
expectIncludes(styles, "data-interaction-mode='aim-locked'", 'locked aim needs visible feedback');

const allSourceFiles = await collectFiles(path.join(root, 'games/billiards'));
for (const file of allSourceFiles) {
  if (!/\.(?:ts|tsx|js|mjs)$/.test(file)) continue;
  const source = await readFile(file, 'utf8');
  if (/\bany\b/.test(stripCommentsAndStrings(source))) {
    failures.push(`explicit any is forbidden in ${path.relative(root, file)}`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  schemaVersion: 1,
  checkedFiles: requiredFiles.length,
  explicitAny: 0,
  independentControllerFrameLoops: 0,
  status: 'ok',
}, null, 2));

function expectIncludes(source, token, message) {
  if (!source.includes(token)) failures.push(message);
}

function expectExcludes(source, token, message) {
  if (source.includes(token)) failures.push(message);
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}
