import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const contract = JSON.parse(await readFile('quality/quality-contract.json', 'utf8'));
const recipeDirectory = contract.assets.recipeDirectory;
const recipeFiles = (await readdir(recipeDirectory))
  .filter((name) => name.endsWith('.asset.json'))
  .sort();
const failures = [];
const reports = [];

if (recipeFiles.length === 0) {
  failures.push(`No asset recipes found in ${recipeDirectory}.`);
}

for (const recipeFile of recipeFiles) {
  const recipePath = path.join(recipeDirectory, recipeFile);
  const recipe = JSON.parse(await readFile(recipePath, 'utf8'));
  const report = await validateAsset(recipePath, recipe);
  reports.push(report);
}

console.log(JSON.stringify({ schemaVersion: 1, assets: reports, failures }, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}

async function validateAsset(recipePath, recipe) {
  const label = recipe.id ?? recipePath;
  requireValue(recipe.schemaVersion === 1, `${label}: unsupported schemaVersion.`);
  requireString(recipe.id, `${label}: id is required.`);
  requireString(recipe.path, `${label}: path is required.`);
  requireString(recipe.license, `${label}: license is required.`);
  requireString(recipe.units, `${label}: units are required.`);
  requireString(recipe.upAxis, `${label}: upAxis is required.`);
  requireString(recipe.forwardAxis, `${label}: forwardAxis is required.`);
  requireString(recipe.originPolicy, `${label}: originPolicy is required.`);
  if (contract.assets.requireRuntimeUseDeclaration) {
    requireString(recipe.runtimeUse, `${label}: runtimeUse is required.`);
  }
  requireString(recipe.generator?.path, `${label}: generator.path is required.`);
  requireString(recipe.generator?.version, `${label}: generator.version is required.`);
  requireString(
    recipe.generator?.sourceGitBlobSha,
    `${label}: generator.sourceGitBlobSha is required.`,
  );

  const assetPath = path.resolve(root, recipe.path ?? '');
  const generatorPath = path.resolve(root, recipe.generator?.path ?? '');
  await requireFile(assetPath, `${label}: asset file is missing.`);
  await requireFile(generatorPath, `${label}: generator file is missing.`);

  const generatorBytes = await readFile(generatorPath);
  const sourceGitBlobSha = gitBlobSha(generatorBytes);
  if (sourceGitBlobSha !== recipe.generator.sourceGitBlobSha) {
    failures.push(
      `${label}: generator Git blob SHA mismatch; expected ${recipe.generator.sourceGitBlobSha}, got ${sourceGitBlobSha}.`,
    );
  }

  const bytes = await readFile(assetPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (contract.assets.requireSha256 && sha256 !== recipe.sha256) {
    failures.push(`${label}: sha256 mismatch; expected ${recipe.sha256}, got ${sha256}.`);
  }

  const glb = parseGlb(bytes, label);
  const document = glb.document;
  const nodeNames = new Set((document.nodes ?? []).map((node) => node.name).filter(Boolean));
  const duplicateNodeNames = findDuplicates(
    (document.nodes ?? []).map((node) => node.name).filter(Boolean),
  );
  for (const duplicate of duplicateNodeNames) {
    failures.push(`${label}: duplicate node name ${duplicate}.`);
  }
  for (const requiredNode of recipe.requiredNodes ?? []) {
    if (!nodeNames.has(requiredNode)) {
      failures.push(`${label}: missing required node ${requiredNode}.`);
    }
  }

  if (contract.assets.forbidExternalUris) {
    const externalUris = [
      ...(document.buffers ?? []).map((buffer) => buffer.uri),
      ...(document.images ?? []).map((image) => image.uri),
    ].filter((uri) => typeof uri === 'string' && !uri.startsWith('data:'));
    if (externalUris.length > 0) {
      failures.push(`${label}: external URIs are forbidden: ${externalUris.join(', ')}.`);
    }
  }

  const meshCount = (document.meshes ?? []).length;
  const materialCount = (document.materials ?? []).length;
  const triangleCount = countTriangles(document, label);
  const budgets = recipe.budgets ?? {};
  compareBudget(label, 'bytes', bytes.length, budgets.maximumBytes);
  compareBudget(label, 'meshes', meshCount, budgets.maximumMeshes);
  compareBudget(label, 'materials', materialCount, budgets.maximumMaterials);
  compareBudget(label, 'triangles', triangleCount, budgets.maximumTriangles);
  validateAccessorBounds(document, label);

  return {
    id: recipe.id,
    path: recipe.path,
    bytes: bytes.length,
    sha256,
    version: glb.version,
    meshes: meshCount,
    materials: materialCount,
    triangles: triangleCount,
    nodes: nodeNames.size,
    runtimeUse: recipe.runtimeUse,
    generatorGitBlobSha: sourceGitBlobSha,
  };
}

function gitBlobSha(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

function parseGlb(bytes, label) {
  if (bytes.length < 20) {
    failures.push(`${label}: GLB is too short.`);
    return { document: {}, version: 0 };
  }
  const magic = bytes.subarray(0, 4).toString('utf8');
  const version = bytes.readUInt32LE(4);
  const declaredLength = bytes.readUInt32LE(8);
  requireValue(magic === 'glTF', `${label}: invalid GLB magic ${JSON.stringify(magic)}.`);
  requireValue(version === 2, `${label}: GLB version must be 2, got ${version}.`);
  requireValue(
    declaredLength === bytes.length,
    `${label}: declared length ${declaredLength} does not equal ${bytes.length}.`,
  );

  let offset = 12;
  let document = null;
  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + chunkLength;
    if (end > bytes.length) {
      failures.push(`${label}: chunk exceeds file length.`);
      break;
    }
    if (chunkType === 0x4e4f534a) {
      try {
        document = JSON.parse(bytes.subarray(start, end).toString('utf8').trimEnd());
      } catch (error) {
        failures.push(`${label}: invalid JSON chunk: ${String(error)}.`);
      }
    }
    offset = end;
  }
  if (document === null) {
    failures.push(`${label}: GLB has no JSON chunk.`);
  }
  return { document: document ?? {}, version };
}

function countTriangles(document, label) {
  let triangles = 0;
  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const mode = primitive.mode ?? 4;
      if (mode !== 4) {
        failures.push(`${label}: only TRIANGLES primitives are accepted, found mode ${mode}.`);
        continue;
      }
      const accessorIndex = primitive.indices;
      if (!Number.isInteger(accessorIndex)) {
        failures.push(`${label}: every primitive must use an index accessor.`);
        continue;
      }
      const count = document.accessors?.[accessorIndex]?.count;
      if (!Number.isInteger(count) || count < 0 || count % 3 !== 0) {
        failures.push(`${label}: invalid triangle index count ${count}.`);
        continue;
      }
      triangles += count / 3;
    }
  }
  return triangles;
}

function validateAccessorBounds(document, label) {
  for (let index = 0; index < (document.accessors ?? []).length; index += 1) {
    const accessor = document.accessors[index];
    for (const key of ['min', 'max']) {
      const values = accessor?.[key];
      if (values !== undefined && (!Array.isArray(values) || values.some((value) => !Number.isFinite(value)))) {
        failures.push(`${label}: accessor ${index} has non-finite ${key} bounds.`);
      }
    }
  }
}

function compareBudget(label, metric, actual, maximum) {
  if (!Number.isInteger(maximum) || maximum <= 0) {
    failures.push(`${label}: missing positive ${metric} budget.`);
  } else if (actual > maximum) {
    failures.push(`${label}: ${metric} ${actual} exceeds budget ${maximum}.`);
  }
}

async function requireFile(file, message) {
  try {
    const metadata = await stat(file);
    if (!metadata.isFile()) {
      failures.push(message);
    }
  } catch {
    failures.push(message);
  }
}

function requireString(value, message) {
  requireValue(typeof value === 'string' && value.trim() !== '', message);
}

function requireValue(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}
