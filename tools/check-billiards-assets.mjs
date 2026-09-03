import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const manifestPath = 'games/billiards/runtime/presentation/assets/provenance.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const failures = [];
const reports = [];
const declaredPaths = new Set();

if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) {
  failures.push(`${manifestPath}: unsupported schema or missing assets.`);
} else {
  for (const asset of manifest.assets) {
    reports.push(await validateAsset(asset));
  }
}

const directory = path.dirname(manifestPath);
const actualFiles = (await readdir(directory))
  .filter((name) => name !== path.basename(manifestPath))
  .map((name) => path.join(directory, name).split(path.sep).join('/'));
for (const file of actualFiles) {
  if (!declaredPaths.has(file)) {
    failures.push(`${file}: generated billiards asset is missing provenance.`);
  }
}

console.log(JSON.stringify({ schemaVersion: 1, assets: reports, failures }, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}

async function validateAsset(asset) {
  const label = asset.id ?? '<unknown>';
  requireString(asset.id, `${label}: id is required.`);
  requireString(asset.path, `${label}: path is required.`);
  requireString(asset.license, `${label}: license is required.`);
  requireString(asset.source, `${label}: source is required.`);
  requireString(asset.promptSummary, `${label}: promptSummary is required.`);
  requireString(asset.runtimeUse, `${label}: runtimeUse is required.`);
  declaredPaths.add(asset.path);
  let bytes;
  try {
    const metadata = await stat(asset.path);
    bytes = metadata.isFile() ? await readFile(asset.path) : null;
  } catch {
    bytes = null;
  }
  if (bytes === null) {
    failures.push(`${label}: asset file is missing.`);
    return { id: asset.id, path: asset.path, bytes: 0, sha256: null };
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== asset.sha256) {
    failures.push(`${label}: sha256 mismatch; expected ${asset.sha256}, got ${sha256}.`);
  }
  if (bytes.length !== asset.bytes) {
    failures.push(`${label}: byte count changed; expected ${asset.bytes}, got ${bytes.length}.`);
  }
  if (!Number.isInteger(asset.maximumBytes) || bytes.length > asset.maximumBytes) {
    failures.push(`${label}: ${bytes.length} bytes exceeds budget ${asset.maximumBytes}.`);
  }
  if (asset.license !== 'project-authored') {
    failures.push(`${label}: only project-authored Pocket Club art may ship.`);
  }
  validateSignature(label, asset.path, bytes);
  return { id: asset.id, path: asset.path, bytes: bytes.length, sha256 };
}

function validateSignature(label, file, bytes) {
  if (file.endsWith('.png')) {
    const png = '89504e470d0a1a0a';
    if (bytes.subarray(0, 8).toString('hex') !== png) {
      failures.push(`${label}: invalid PNG signature.`);
    }
  } else if (file.endsWith('.webp')) {
    if (bytes.subarray(0, 4).toString('ascii') !== 'RIFF'
      || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
      failures.push(`${label}: invalid WebP signature.`);
    }
  } else if (file.endsWith('.svg')) {
    const text = bytes.toString('utf8').trimStart();
    if (!text.startsWith('<svg') && !text.startsWith('<?xml')) {
      failures.push(`${label}: invalid SVG document.`);
    }
    if (/<(script|foreignObject)\b/iu.test(text)) {
      failures.push(`${label}: executable SVG content is forbidden.`);
    }
  } else {
    failures.push(`${label}: unsupported generated asset extension.`);
  }
}

function requireString(value, message) {
  if (typeof value !== 'string' || value.trim() === '') {
    failures.push(message);
  }
}
