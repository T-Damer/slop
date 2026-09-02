import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
const root = process.cwd();
const modelPath = 'architecture/model.json';
const ignoredDirectoryNames = new Set(['node_modules', 'dist', '.modoki-engine']);
const model = JSON.parse(await readFile(modelPath, 'utf8'));
const failures = [];
if (model.schemaVersion !== 4) {
  failures.push(`${modelPath} has unsupported schemaVersion.`);
}
await validateDiagrams();
const modules = await validateModules(model.modules ?? []);
validateForbiddenDependencies(modules, model.forbidden ?? []);
validateDependencyCycles(modules);
for (const module of modules.filter((candidate) => candidate.kind === 'domain')) {
  await validatePureDomain(module);
}
await validateRelativeModuleDependencies(modules);
for (const module of modules.filter((candidate) => candidate.kind === 'adapter')) {
  await validateThinAdapter(module);
}
const coveredTypeScriptFiles = await validateTypeScriptCoverage(
  modules,
  model.coverage?.typescriptRoots ?? [],
);
const checkedWorkflows = await validateWorkflowPolicy(model.workflowPolicy);
const report = {
  schemaVersion: 2,
  modules: modules.map((module) => module.id),
  coveredTypeScriptFiles,
  checkedWorkflows,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}

async function validateDiagrams() {
  for (const diagram of ['architecture/current.mmd', 'architecture/target.mmd']) {
    const content = await readFile(diagram, 'utf8');
    if (!content.includes('flowchart')) {
      failures.push(`${diagram} must contain a Mermaid flowchart.`);
    }
  }
}

async function validateModules(modules) {
  const moduleById = new Map();
  const moduleByPath = new Map();
  for (const module of modules) {
    validateModuleShape(module);
    if (moduleById.has(module.id)) {
      failures.push(`Duplicate architecture module id: ${module.id}.`);
    }
    if (moduleByPath.has(module.path)) {
      failures.push(`Duplicate architecture module path: ${module.path}.`);
    }
    moduleById.set(module.id, module);
    moduleByPath.set(module.path, module);
    await requirePath(module.path, `Architecture module path is missing: ${module.path}.`);
  }
  for (const module of modules) {
    const dependencies = new Set();
    for (const dependency of module.dependsOn ?? []) {
      if (dependency === module.id) {
        failures.push(`${module.id} cannot depend on itself.`);
      }
      if (dependencies.has(dependency)) {
        failures.push(`${module.id} declares duplicate dependency ${dependency}.`);
      }
      if (!moduleById.has(dependency)) {
        failures.push(`${module.id} depends on unknown module ${dependency}.`);
      }
      dependencies.add(dependency);
    }
  }
  return modules;
}

function validateModuleShape(module) {
  for (const field of ['id', 'kind', 'path']) {
    if (typeof module[field] !== 'string' || module[field].trim() === '') {
      failures.push(`Architecture module is missing ${field}.`);
    }
  }
  if (!Array.isArray(module.owns) || module.owns.length === 0) {
    failures.push(`${module.id ?? '<unknown>'} must declare at least one owned concern.`);
  }
  if (!Array.isArray(module.dependsOn)) {
    failures.push(`${module.id ?? '<unknown>'} must declare dependsOn as an array.`);
  }
}

function validateForbiddenDependencies(modules, forbiddenDependencies) {
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  for (const forbidden of forbiddenDependencies) {
    if (!moduleById.has(forbidden.from) || !moduleById.has(forbidden.to)) {
      failures.push(`Forbidden dependency references an unknown module: ${forbidden.from} → ${forbidden.to}.`);
      continue;
    }
    if (moduleById.get(forbidden.from)?.dependsOn?.includes(forbidden.to)) {
      failures.push(`Forbidden target dependency declared: ${forbidden.from} → ${forbidden.to}.`);
    }
  }
}

function validateDependencyCycles(modules) {
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const visited = new Set();
  const active = new Set();
  const stack = [];
  for (const module of modules) {
    visitDependency(module.id, moduleById, visited, active, stack);
  }
}

function visitDependency(moduleId, moduleById, visited, active, stack) {
  if (active.has(moduleId)) {
    const cycleStart = stack.indexOf(moduleId);
    failures.push(`Architecture dependency cycle: ${[...stack.slice(cycleStart), moduleId].join(' → ')}.`);
    return;
  }
  if (visited.has(moduleId)) {
    return;
  }
  active.add(moduleId);
  stack.push(moduleId);
  for (const dependency of moduleById.get(moduleId)?.dependsOn ?? []) {
    if (moduleById.has(dependency)) {
      visitDependency(dependency, moduleById, visited, active, stack);
    }
  }
  stack.pop();
  active.delete(moduleId);
  visited.add(moduleId);
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
        if (target === null) {
          failures.push(`${file} imports unowned TypeScript module ${resolved}.`);
        } else if (
          target.id !== module.id
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

async function validateTypeScriptCoverage(modules, sourceRoots) {
  let checkedFiles = 0;
  for (const sourceRoot of sourceRoots) {
    for (const file of await listTypeScriptFiles(sourceRoot)) {
      checkedFiles += 1;
      const relativeFile = toRelative(file);
      if (findOwningModule(relativeFile, modules) === null) {
        failures.push(`TypeScript source has no architecture owner: ${relativeFile}.`);
      }
    }
  }
  return checkedFiles;
}

async function validateWorkflowPolicy(policy) {
  if (policy === undefined) {
    failures.push('architecture/model.json must declare workflowPolicy.');
    return 0;
  }
  const repositoryFiles = await listFiles(policy.directory);
  const workflowDirectory = policy.workflowDirectory ?? policy.directory;
  let checkedWorkflows = 0;
  for (const file of repositoryFiles) {
    const relativeFile = toRelative(file);
    for (const suffix of policy.forbiddenPayloadSuffixes ?? []) {
      if (relativeFile.endsWith(suffix)) {
        failures.push(`Repository delivery payload is forbidden: ${relativeFile}.`);
      }
    }
    if (path.dirname(relativeFile) !== workflowDirectory || !/\.ya?ml$/u.test(file)) {
      continue;
    }
    checkedWorkflows += 1;
    const content = await readFile(file, 'utf8');
    if (
      policy.allowRepositoryContentWrites !== true
      && (/contents:\s*write/u.test(content) || /\bgit\s+(?:commit|push)\b/u.test(content))
    ) {
      failures.push(`${relativeFile} may not mutate repository contents.`);
    }
  }
  return checkedWorkflows;
}

async function sourceFilesForModule(module) {
  const metadata = await stat(module.path);
  return metadata.isDirectory()
    ? listTypeScriptFiles(module.path)
    : [module.path];
}

function extractImportSpecifiers(content) {
  const specifiers = new Set();
  const staticPattern = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gu;
  const dynamicPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;
  for (const pattern of [staticPattern, dynamicPattern]) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) {
        specifiers.add(match[1]);
      }
    }
  }
  return [...specifiers];
}

async function resolveImport(sourceFile, specifier) {
  const base = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [base, `${base}.ts`, path.join(base, 'index.ts')];
  for (const candidate of candidates) {
    try {
      const metadata = await stat(candidate);
      if (metadata.isFile()) {
        return toRelative(candidate);
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
  return (await listFiles(directory)).filter((file) => file.endsWith('.ts'));
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) continue;
    const nextPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(nextPath));
    } else if (entry.isFile()) {
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

function toRelative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}
