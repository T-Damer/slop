import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const architecturePaths = {
  model: 'architecture/model.json',
  current: 'architecture/current.mmd',
  target: 'architecture/target.mmd',
  domain: 'games/traffic-jam/runtime/domain',
  ui: 'games/traffic-jam/runtime/ui',
  setup: 'games/traffic-jam/runtime/setup.ts',
};

const architecturePatterns = {
  domainForbidden: [
    /@modoki\//u,
    /(?:^|\W)document(?:\W|$)/u,
    /(?:^|\W)window(?:\W|$)/u,
    /(?:^|\W)localStorage(?:\W|$)/u,
    /(?:^|\W)HTMLElement(?:\W|$)/u,
    /\.\.\/ui\//u,
  ],
  uncontrolledRuntime: [
    /Math\.random\s*\(/u,
    /Date\.now\s*\(/u,
    /performance\.now\s*\(/u,
  ],
  modokiBoundary: /@modoki\/engine/u,
};

const failures = [];
const model = JSON.parse(await readFile(architecturePaths.model, 'utf8'));

if (model.schemaVersion !== 1) {
  failures.push('architecture/model.json has an unsupported schemaVersion.');
}

for (const requiredPath of [architecturePaths.current, architecturePaths.target]) {
  const content = await readFile(requiredPath, 'utf8');
  if (!content.includes('flowchart')) {
    failures.push(`${requiredPath} must contain a Mermaid flowchart.`);
  }
}

for (const file of await listTypeScriptFiles(architecturePaths.domain)) {
  const content = await readFile(file, 'utf8');
  for (const pattern of architecturePatterns.domainForbidden) {
    if (pattern.test(content)) {
      failures.push(`${file} crosses the pure-domain boundary: ${pattern}.`);
    }
  }
  for (const pattern of architecturePatterns.uncontrolledRuntime) {
    if (pattern.test(content)) {
      failures.push(`${file} uses an uncontrolled runtime source: ${pattern}.`);
    }
  }
}

const setup = await readFile(architecturePaths.setup, 'utf8');
if (architecturePatterns.modokiBoundary.test(setup)) {
  failures.push('runtime/setup.ts should only adapt lifecycle; import Modoki types from game.ts/config.ts instead.');
}

if (failures.length > 0) {
  console.error('Architecture check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log('Architecture check passed.');
}

async function listTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const nextPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listTypeScriptFiles(nextPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(nextPath);
    }
  }
  return files;
}
