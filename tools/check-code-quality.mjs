import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const contractPath = path.join(root, 'quality/quality-contract.json');
const debtPath = path.join(root, 'quality/debt.json');
const contract = JSON.parse(await readFile(contractPath, 'utf8'));
const debt = JSON.parse(await readFile(debtPath, 'utf8'));
const failures = [];
const warnings = [];

assertSchema(contract, contractPath);
assertSchema(debt, debtPath);

const debtByPath = new Map();
for (const entry of debt.entries ?? []) {
  validateDebtEntry(entry);
  if (debtByPath.has(entry.path)) {
    failures.push(`Duplicate debt entry: ${entry.path}`);
  }
  debtByPath.set(entry.path, entry);
}

const sourceRoots = ['games', 'tools'];
const sourceFiles = [];
for (const sourceRoot of sourceRoots) {
  sourceFiles.push(...await listFiles(path.join(root, sourceRoot)));
}

const checkedExtensions = new Set(['.ts', '.mjs', '.js', '.py']);
const textFiles = sourceFiles.filter((file) => checkedExtensions.has(path.extname(file)));
const relativeFiles = new Set(textFiles.map(toRelative));

for (const entry of debtByPath.values()) {
  if (!relativeFiles.has(entry.path)) {
    failures.push(`Debt entry points to a missing source file: ${entry.path}`);
  }
}

for (const file of textFiles) {
  const relativePath = toRelative(file);
  const basename = path.basename(file);
  const content = await readFile(file, 'utf8');
  const bytes = Buffer.byteLength(content);
  const lines = countLines(content);
  const entry = debtByPath.get(relativePath);

  if (contract.code.forbiddenGenericOwners.includes(basename)) {
    failures.push(`${relativePath} uses a forbidden generic owner filename.`);
  }

  for (const suppression of contract.code.forbiddenSuppressions) {
    if (content.includes(suppression)) {
      failures.push(`${relativePath} contains forbidden suppression: ${suppression}`);
    }
  }

  if (entry === undefined) {
    if (lines > contract.code.defaultMaximumLines) {
      failures.push(
        `${relativePath} has ${lines} lines; maximum is ${contract.code.defaultMaximumLines}.`,
      );
    }
    if (bytes > contract.code.defaultMaximumBytes) {
      failures.push(
        `${relativePath} has ${bytes} bytes; maximum is ${contract.code.defaultMaximumBytes}.`,
      );
    }
  } else if (bytes > entry.maximumBytes) {
    failures.push(
      `${relativePath} grew to ${bytes} bytes; debt ceiling is ${entry.maximumBytes}.`,
    );
  }

  if (path.extname(file) === '.ts' && entry === undefined) {
    checkFunctionLengths(relativePath, content);
  }
}

const textCache = new Map();
await Promise.all(textFiles.map(async (file) => {
  textCache.set(file, await readFile(file, 'utf8'));
}));

const duplicateCandidates = findDuplicateBlocks(
  textFiles.filter((file) => path.extname(file) === '.ts'),
  contract.code.duplicateBlockMinimumLines,
);
for (const candidate of duplicateCandidates.slice(0, 20)) {
  warnings.push(
    `Duplicate candidate (${candidate.lines} lines): ${candidate.left} ↔ ${candidate.right}`,
  );
}

const report = {
  schemaVersion: 1,
  checkedFiles: textFiles.length,
  debtEntries: debtByPath.size,
  duplicateCandidates: duplicateCandidates.length,
  failures,
  warnings,
};
console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}

function assertSchema(value, file) {
  if (value.schemaVersion !== 1) {
    failures.push(`${toRelative(file)} has unsupported schemaVersion.`);
  }
}

function validateDebtEntry(entry) {
  const requiredStrings = ['path', 'owner', 'reason', 'splitPlan', 'expiresOn'];
  for (const field of requiredStrings) {
    if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
      failures.push(`Debt entry ${entry.path ?? '<unknown>'} is missing ${field}.`);
    }
  }
  if (!Number.isInteger(entry.maximumBytes) || entry.maximumBytes <= 0) {
    failures.push(`Debt entry ${entry.path ?? '<unknown>'} has invalid maximumBytes.`);
  }
  const expiry = Date.parse(`${entry.expiresOn}T23:59:59Z`);
  if (!Number.isFinite(expiry)) {
    failures.push(`Debt entry ${entry.path ?? '<unknown>'} has invalid expiresOn.`);
  } else if (expiry < Date.now()) {
    failures.push(`Debt entry ${entry.path ?? '<unknown>'} expired on ${entry.expiresOn}.`);
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['node_modules', 'dist', '.modoki-engine'].includes(entry.name)) {
      continue;
    }
    const nextPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(nextPath));
    } else if (entry.isFile()) {
      files.push(nextPath);
    }
  }
  return files;
}

function checkFunctionLengths(relativePath, content) {
  const lines = content.split(/\r?\n/u);
  let active = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (active === null && looksLikeFunctionStart(line)) {
      active = { start: index + 1, depth: 0, opened: false };
    }
    if (active === null) {
      continue;
    }

    for (const character of stripStringsAndComments(line)) {
      if (character === '{') {
        active.depth += 1;
        active.opened = true;
      } else if (character === '}') {
        active.depth -= 1;
      }
    }

    if (active.opened && active.depth <= 0) {
      const functionLines = index + 1 - active.start + 1;
      if (functionLines > contract.code.maximumFunctionLines) {
        failures.push(
          `${relativePath}:${active.start} function spans ${functionLines} lines; maximum is ${contract.code.maximumFunctionLines}.`,
        );
      }
      active = null;
    }
  }
}

function looksLikeFunctionStart(line) {
  const trimmed = line.trim();
  return /^(?:export\s+)?(?:async\s+)?function\s+/u.test(trimmed)
    || /^(?:public|private|protected)?\s*(?:readonly\s+)?[A-Za-z_$][\w$]*\s*\([^;]*\)\s*[:{]/u.test(trimmed)
    || /^(?:const|let)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/u.test(trimmed);
}

function stripStringsAndComments(line) {
  return line
    .replace(/\/\/.*$/u, '')
    .replace(/'(?:\\.|[^'\\])*'/gu, "''")
    .replace(/"(?:\\.|[^"\\])*"/gu, '""')
    .replace(/`(?:\\.|[^`\\])*`/gu, '``');
}

function findDuplicateBlocks(files, minimumLines) {
  const seen = new Map();
  const candidates = [];
  for (const file of files) {
    const content = requireText(file);
    const lines = content
      .split(/\r?\n/u)
      .map(normalizeLine)
      .filter((line) => line.length >= 8 && !line.startsWith('import '));
    for (let index = 0; index + minimumLines <= lines.length; index += 1) {
      const block = lines.slice(index, index + minimumLines).join('\n');
      const previous = seen.get(block);
      const current = `${toRelative(file)}:${index + 1}`;
      if (previous !== undefined && previous.split(':')[0] !== toRelative(file)) {
        candidates.push({ left: previous, right: current, lines: minimumLines });
      } else if (previous === undefined) {
        seen.set(block, current);
      }
    }
  }
  return candidates;
}

function requireText(file) {
  const cached = textCache.get(file);
  if (cached === undefined) {
    throw new Error(`Duplicate scan cache was not populated for ${file}`);
  }
  return cached;
}


function normalizeLine(line) {
  return line.trim().replace(/\s+/gu, ' ');
}

function countLines(content) {
  return content === '' ? 0 : content.split(/\r?\n/u).length;
}

function toRelative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}
