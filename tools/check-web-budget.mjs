import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = process.cwd();
const distributionDirectory = path.resolve(
  root,
  process.argv[2] ?? 'games/traffic-jam/dist',
);
const reportDirectory = path.resolve(
  root,
  process.env.QUALITY_REPORT_DIR ?? 'quality-artifacts',
);
const contract = JSON.parse(await readFile('quality/quality-contract.json', 'utf8'));
const files = await listFiles(distributionDirectory);
const entries = [];
let rawBytes = 0;
let gzipBytes = 0;
let brotliBytes = 0;
let largestJavaScriptBytes = 0;
let largestJavaScriptPath = null;

for (const file of files) {
  const content = await readFile(file);
  const relativePath = path.relative(distributionDirectory, file).split(path.sep).join('/');
  const gzip = gzipSync(content, { level: 9 }).length;
  const brotli = brotliCompressSync(content, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
    },
  }).length;
  rawBytes += content.length;
  gzipBytes += gzip;
  brotliBytes += brotli;
  if (relativePath.endsWith('.js') && content.length > largestJavaScriptBytes) {
    largestJavaScriptBytes = content.length;
    largestJavaScriptPath = relativePath;
  }
  entries.push({ path: relativePath, rawBytes: content.length, gzipBytes: gzip, brotliBytes: brotli });
}

entries.sort((left, right) => right.rawBytes - left.rawBytes);
const limits = contract.runtime;
const failures = [];
checkLimit('rawBytes', rawBytes, limits.rawRatchetBytes);
checkLimit('gzipBytes', gzipBytes, limits.gzipRatchetBytes);
checkLimit('brotliBytes', brotliBytes, limits.brotliRatchetBytes);
checkLimit(
  'largestJavaScriptBytes',
  largestJavaScriptBytes,
  limits.largestJavaScriptRatchetBytes,
);

const report = {
  schemaVersion: 1,
  distributionDirectory: path.relative(root, distributionDirectory),
  fileCount: files.length,
  rawBytes,
  gzipBytes,
  brotliBytes,
  largestJavaScriptBytes,
  largestJavaScriptPath,
  targetBrotliBytes: limits.targetBrotliBytes,
  targetGapBytes: Math.max(0, brotliBytes - limits.targetBrotliBytes),
  limits: {
    rawBytes: limits.rawRatchetBytes,
    gzipBytes: limits.gzipRatchetBytes,
    brotliBytes: limits.brotliRatchetBytes,
    largestJavaScriptBytes: limits.largestJavaScriptRatchetBytes,
  },
  largestFiles: entries.slice(0, 20),
  failures,
};

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  path.join(reportDirectory, 'web-budget.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}

function checkLimit(metric, actual, maximum) {
  if (!Number.isInteger(maximum) || maximum <= 0) {
    failures.push(`${metric}: invalid configured limit ${maximum}.`);
  } else if (actual > maximum) {
    failures.push(`${metric}: ${actual} exceeds ratchet ${maximum}.`);
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const nextPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...await listFiles(nextPath));
    } else if (entry.isFile() && !entry.name.endsWith('.map')) {
      output.push(nextPath);
    }
  }
  return output;
}
