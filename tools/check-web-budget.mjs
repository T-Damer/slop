import { gzipSync } from "node:zlib";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const budgetPaths = {
  repositoryRoot: resolve(import.meta.dirname, ".."),
  configuration: ".slop/web-budget.json",
};

const repositoryRoot = budgetPaths.repositoryRoot;
const configuration = JSON.parse(
  await readFile(resolve(repositoryRoot, budgetPaths.configuration), "utf8"),
);

for (const [buildId, budget] of Object.entries(configuration.builds)) {
  const buildRoot = resolve(repositoryRoot, budget.path);
  const files = await collectFiles(buildRoot);
  let uncompressedBytes = 0;
  let gzipBytes = 0;
  let packBytes = 0;

  for (const filePath of files) {
    const content = await readFile(filePath);
    uncompressedBytes += content.byteLength;
    gzipBytes += gzipSync(content, { level: 9 }).byteLength;
    if (extname(filePath) === ".pck") {
      packBytes += content.byteLength;
    }
  }

  const result = {
    buildId,
    path: normalize(relative(repositoryRoot, buildRoot)),
    fileCount: files.length,
    uncompressedBytes,
    gzipBytes,
    packBytes,
  };
  console.log(JSON.stringify(result));
  assertWithinBudget(buildId, "uncompressedBytes", uncompressedBytes, budget.maxUncompressedBytes);
  assertWithinBudget(buildId, "gzipBytes", gzipBytes, budget.maxGzipBytes);
  assertWithinBudget(buildId, "packBytes", packBytes, budget.maxPackBytes);
}

async function collectFiles(directory) {
  const directoryStat = await stat(directory);
  if (!directoryStat.isDirectory()) {
    throw new Error(`Web build path is not a directory: ${directory}`);
  }
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function assertWithinBudget(buildId, metric, actual, maximum) {
  if (actual > maximum) {
    throw new Error(
      `${buildId} exceeds ${metric}: ${actual} bytes > ${maximum} bytes.`,
    );
  }
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}
