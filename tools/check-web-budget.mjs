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
const optionalBundleContracts = readOptionalBundleContracts(contract.runtime);
const entries = [];
const failures = [];
let largestJavaScriptBytes = 0;
let largestJavaScriptPath = null;

for (const file of files) {
  const content = await readFile(file);
  const relativePath = path.relative(distributionDirectory, file).split(path.sep).join('/');
  const metrics = compressMetrics(content);
  const optionalBundleIds = matchOptionalBundles(
    relativePath,
    content,
    optionalBundleContracts,
  );
  if (optionalBundleIds.length > 1) {
    failures.push(
      `${relativePath}: matched multiple optional bundles (${optionalBundleIds.join(', ')}).`,
    );
  }
  const optionalBundleId = optionalBundleIds[0] ?? null;
  if (relativePath.endsWith('.js') && metrics.rawBytes > largestJavaScriptBytes) {
    largestJavaScriptBytes = metrics.rawBytes;
    largestJavaScriptPath = relativePath;
  }
  entries.push({ path: relativePath, optionalBundleId, ...metrics });
}

entries.sort((left, right) => right.rawBytes - left.rawBytes);
const limits = contract.runtime;
const baseEntries = entries.filter((entry) => entry.optionalBundleId === null);
const base = aggregateEntries(baseEntries);
const optionalBundles = optionalBundleContracts.map((bundleContract) => {
  const bundleEntries = entries.filter(
    (entry) => entry.optionalBundleId === bundleContract.id,
  );
  const metrics = aggregateEntries(bundleEntries);
  checkMatchCount(bundleContract, bundleEntries.length);
  checkMetricLimits(bundleContract.id, metrics, bundleContract);
  return {
    id: bundleContract.id,
    fileCount: bundleEntries.length,
    files: bundleEntries.map((entry) => entry.path),
    ...metrics,
    limits: metricLimits(bundleContract),
  };
});
const total = aggregateEntries(entries);
const totalLimits = {
  rawBytes: limits.rawRatchetBytes + sumOptionalLimit(optionalBundleContracts, 'rawRatchetBytes'),
  gzipBytes: limits.gzipRatchetBytes + sumOptionalLimit(optionalBundleContracts, 'gzipRatchetBytes'),
  brotliBytes: limits.brotliRatchetBytes + sumOptionalLimit(optionalBundleContracts, 'brotliRatchetBytes'),
};

checkMetricLimits('base', base, limits);
checkMetricLimits('total', total, {
  rawRatchetBytes: totalLimits.rawBytes,
  gzipRatchetBytes: totalLimits.gzipBytes,
  brotliRatchetBytes: totalLimits.brotliBytes,
});
checkLimit(
  'largestJavaScriptBytes',
  largestJavaScriptBytes,
  limits.largestJavaScriptRatchetBytes,
);

const report = {
  schemaVersion: 2,
  distributionDirectory: path.relative(root, distributionDirectory),
  fileCount: files.length,
  base: {
    ...base,
    limits: metricLimits(limits),
    targetBrotliBytes: limits.targetBrotliBytes,
    targetGapBytes: Math.max(0, base.brotliBytes - limits.targetBrotliBytes),
  },
  optionalBundles,
  total: {
    ...total,
    limits: totalLimits,
  },
  largestJavaScriptBytes,
  largestJavaScriptPath,
  largestJavaScriptLimitBytes: limits.largestJavaScriptRatchetBytes,
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

function compressMetrics(content) {
  return {
    rawBytes: content.length,
    gzipBytes: gzipSync(content, { level: 9 }).length,
    brotliBytes: brotliCompressSync(content, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
      },
    }).length,
  };
}

function readOptionalBundleContracts(runtimeContract) {
  const bundles = runtimeContract.optionalBundles ?? [];
  if (!Array.isArray(bundles)) {
    failures.push('runtime.optionalBundles must be an array.');
    return [];
  }
  const seenIds = new Set();
  return bundles.flatMap((bundle) => {
    if (typeof bundle?.id !== 'string' || bundle.id === '') {
      failures.push('Every optional runtime bundle requires a non-empty id.');
      return [];
    }
    if (seenIds.has(bundle.id)) {
      failures.push(`Duplicate optional runtime bundle id: ${bundle.id}.`);
      return [];
    }
    seenIds.add(bundle.id);
    const match = bundle.match ?? {};
    try {
      return [{
        ...bundle,
        pathExpression: new RegExp(match.pathPattern ?? '.*', 'u'),
        contentMarkers: Array.isArray(match.contentMarkers)
          ? match.contentMarkers
          : [],
      }];
    } catch (error) {
      failures.push(
        `${bundle.id}: invalid pathPattern (${error instanceof Error ? error.message : error}).`,
      );
      return [];
    }
  });
}

function matchOptionalBundles(relativePath, content, bundleContracts) {
  const text = content.toString('utf8');
  return bundleContracts
    .filter((bundle) => bundle.pathExpression.test(relativePath))
    .filter((bundle) => bundle.contentMarkers.every((marker) => text.includes(marker)))
    .map((bundle) => bundle.id);
}

function aggregateEntries(selectedEntries) {
  return selectedEntries.reduce((metrics, entry) => ({
    rawBytes: metrics.rawBytes + entry.rawBytes,
    gzipBytes: metrics.gzipBytes + entry.gzipBytes,
    brotliBytes: metrics.brotliBytes + entry.brotliBytes,
  }), { rawBytes: 0, gzipBytes: 0, brotliBytes: 0 });
}

function checkMatchCount(bundle, actual) {
  const minimum = bundle.minimumMatches ?? 1;
  const maximum = bundle.maximumMatches ?? minimum;
  if (!Number.isInteger(minimum) || minimum < 0) {
    failures.push(`${bundle.id}: invalid minimumMatches ${minimum}.`);
    return;
  }
  if (!Number.isInteger(maximum) || maximum < minimum) {
    failures.push(`${bundle.id}: invalid maximumMatches ${maximum}.`);
    return;
  }
  if (actual < minimum || actual > maximum) {
    failures.push(
      `${bundle.id}: matched ${actual} files; expected ${minimum}..${maximum}.`,
    );
  }
}

function checkMetricLimits(label, metrics, metricContract) {
  checkLimit(`${label}.rawBytes`, metrics.rawBytes, metricContract.rawRatchetBytes);
  checkLimit(`${label}.gzipBytes`, metrics.gzipBytes, metricContract.gzipRatchetBytes);
  checkLimit(`${label}.brotliBytes`, metrics.brotliBytes, metricContract.brotliRatchetBytes);
}

function checkLimit(metric, actual, maximum) {
  if (!Number.isInteger(maximum) || maximum <= 0) {
    failures.push(`${metric}: invalid configured limit ${maximum}.`);
  } else if (actual > maximum) {
    failures.push(`${metric}: ${actual} exceeds ratchet ${maximum}.`);
  }
}

function metricLimits(metricContract) {
  return {
    rawBytes: metricContract.rawRatchetBytes,
    gzipBytes: metricContract.gzipRatchetBytes,
    brotliBytes: metricContract.brotliRatchetBytes,
  };
}

function sumOptionalLimit(bundleContracts, key) {
  return bundleContracts.reduce((sum, bundle) => {
    const value = bundle[key];
    if (!Number.isInteger(value) || value <= 0) {
      return sum;
    }
    return sum + value;
  }, 0);
}

async function listFiles(directory) {
  const directoryEntries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of directoryEntries) {
    const nextPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...await listFiles(nextPath));
    } else if (entry.isFile() && !entry.name.endsWith('.map')) {
      output.push(nextPath);
    }
  }
  return output;
}
