import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const modelPath = 'architecture/model.json';
const model = JSON.parse(await readFile(modelPath, 'utf8'));
const failures = [];

if (model.schemaVersion !== 3) {
  failures.push(`${modelPath} has unsupported schemaVersion.`);
}

for (const diagram of ['architecture/current.mmd', 'architecture/target.mmd']) {
  const content = await readFile(diagram, 'utf8');
  if (!content.includes('flowchart')) {
    failures.push(`${diagram} must contain a Mermaid flowchart.`);
  }
}

const modules = model.modules ?? [];
const moduleById = new Map();
const moduleByPath = new Map();
for (const module of modules) {
  if (moduleById.has(module.id)) {
    failures.push(`Duplicate architecture module id: ${module.id}.`);
  }
  if (moduleByPath.has(module.path)) {
    failures.push(`Duplicate architecture module path: ${module.path}.`);
  }
  moduleById.set(module.id, module);
  moduleByPath.set(module.path, module);
  await requirePath(module.path, `Architecture module path is missing: ${module.path}.`);
  for (const dependency of module.dependsOn ?? []) {
    if (dependency === module.id) {
      failures.push(`${module.id} cannot depend on itself.`);
    }
  }
}

for (const module of modules) {
  for (const dependency of module.dependsOn ?? []) {
    if (!moduleById.has(dependency)) {
      failures.push(`${module.id} depends on unknown module ${dependency}.`);
    }
  }
}

for (const forbidden of model.forbidden ?? []) {
  const source = moduleById.get(forbidden.from);
  if (source?.dependsOn?.includes(forbidden.to)) {
    failures.push(`Forbidden target dependency declared: ${forbidden.from} → ${forbidden.to}.`);
  }
}

for (const module of modules.filter((candidate) => candidate.kind === 'domain')) {
  await validatePureDomain(module);
}
await validateRelativeModuleDependencies(modules);
for (const module of modules.filter((candidate) => candidate.kind === 'adapter')) {
  await validateThinAdapter(module);
}

const report = {
  schemaVersion: 1,
  modules: modules.map((module) => module.id),
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}

async function validatePureDomain(module) {
  const forbiddenPatterns = [
    /@modoki\//u,
    /from\s+['"]three['"]/u,
    /(?:^|\W)document(?:\W|$)/u,
    /(?:^|\W)window(?:\W|$)/u,
    /(?:^|\W)localStorage(?:\W|$)/u,
    /(?:^|\W)HTMLElement(?:\W|$)/u,
    /\/presentation\//u,
    /Math\.random\s*\(/u,
    /Date\.now\s*\(/u,
    /performance\.now\s*\(/u,
  ];
  for (const file of await sourceFilesForModule(module)) {
    const content = await readFile(file, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        failures.push(`${file} crosses the pure-domain boundary: ${pattern}.`);
      }
    }
  }
}

async function validateThinAdapter(module) {
  for (const file of await sourceFilesForModule(module)) {
    const content = await readFile(file, 'utf8');
    if (content.includes("from 'three'") || content.includes('@modoki/engine')) {
      failures.push(`${file} must remain a thin presentation lifecycle adapter.`);
    }
  }
}

async function validateRelativeModuleDependencies(allModules) {
  for (const module of allModules) {
    for (const file of await sourceFilesForModule(module)) {
      const content = await readFile(file, 'utf8');
      for (const specifier of extractImportSpecifiers(content)) {
        if (!specifier.startsWith('.')) {
          continue;
        }
        const resolved = await resolveImport(file, specifier);
        if (resolved === null) {
          failures.push(`${file} imports unresolved module ${specifier}.`);
          continue;
        }
        const target = findOwningModule(resolved, allModules);
        if (
          target !== null
          && target.id !== module.id
          && !(module.dependsOn ?? []).includes(target.id)
        ) {
          failures.push(
            `${module.id} imports ${target.id} without declaring the dependency: ${file} → ${specifier}.`,
          );
        }
      }
    }
  }
}

async function sourceFilesForModule(module) {
  const metadata = await stat(module.path);
  return metadata.isDirectory()
    ? listTypeScriptFiles(module.path)
    : [module.path];
}

function extractImportSpecifiers(content) {
  const specifiers = [];
  const pattern = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gu;
  for (const match of content.matchAll(pattern)) {
    if (match[1]) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

async function resolveImport(sourceFile, specifier) {
  const base = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [base, `${base}.ts`, path.join(base, 'index.ts')];
  for (const candidate of candidates) {
    try {
      const metadata = await stat(candidate);
      if (metadata.isFile()) {
        return path.relative(root, candidate).split(path.sep).join('/');
      }
    } catch {
      // Try the next resolution candidate.
    }
  }
  return null;
}

function findOwningModule(file, allModules) {
  return [...allModules]
    .sort((left, right) => right.path.length - left.path.length)
    .find((module) => file === module.path || file.startsWith(`${module.path}/`))
    ?? null;
}

async function listTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const nextPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listTypeScriptFiles(nextPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(nextPath);
    }
  }
  return files;
}

async function requirePath(target, message) {
  try {
    await access(target);
  } catch {
    failures.push(message);
  }
}
