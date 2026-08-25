import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";

const packagingPaths = {
  repositoryRoot: resolve(import.meta.dirname, ".."),
  definition: ".slop/engine-package.json",
  packageMetadata: "package.json",
  outputRoot: "dist/slop-engine",
  payloadDirectory: "package",
  definitionOutput: "engine-package.json",
  manifestOutput: "manifest.json",
} as const;

const repositoryRoot = packagingPaths.repositoryRoot;
const definition = JSON.parse(
  await readFile(resolve(repositoryRoot, packagingPaths.definition), "utf8"),
);
const packageMetadata = JSON.parse(
  await readFile(resolve(repositoryRoot, packagingPaths.packageMetadata), "utf8"),
);

if (definition.version !== packageMetadata.version) {
  throw new Error(
    `Engine version ${definition.version} does not match package version ${packageMetadata.version}.`,
  );
}

const outputRoot = resolve(repositoryRoot, packagingPaths.outputRoot);
const payloadRoot = resolve(outputRoot, packagingPaths.payloadDirectory);
await rm(outputRoot, { recursive: true, force: true });
await mkdir(payloadRoot, { recursive: true });

const sourcePaths = [...definition.contents, ...definition.contracts].sort();
for (const sourcePath of sourcePaths) {
  const absoluteSource = resolve(repositoryRoot, sourcePath);
  const absoluteDestination = resolve(payloadRoot, sourcePath);
  await copyDirectory(absoluteSource, absoluteDestination);
}

await writeFile(
  resolve(outputRoot, packagingPaths.definitionOutput),
  `${JSON.stringify(definition, null, 2)}\n`,
  "utf8",
);

const packagedFiles = await collectFiles(outputRoot);
const manifestEntries = [];
for (const filePath of packagedFiles) {
  if (filePath.endsWith(packagingPaths.manifestOutput)) {
    continue;
  }
  const content = await readFile(filePath);
  manifestEntries.push({
    path: normalize(relative(outputRoot, filePath)),
    bytes: content.byteLength,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
}

const manifest = {
  schemaVersion: 1,
  id: definition.id,
  version: definition.version,
  files: manifestEntries.sort((left, right) => left.path.localeCompare(right.path)),
};
await writeFile(
  resolve(outputRoot, packagingPaths.manifestOutput),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(
  `Packaged ${manifest.files.length} files into ${relative(repositoryRoot, outputRoot)}.`,
);

async function copyDirectory(source, destination) {
  const sourceStat = await stat(source);
  if (!sourceStat.isDirectory()) {
    throw new Error(`Engine package source is not a directory: ${source}`);
  }
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entrySource = join(source, entry.name);
    const entryDestination = join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(entrySource, entryDestination);
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`Symlinks and special files are forbidden in engine packages: ${entrySource}`);
    }
    await mkdir(dirname(entryDestination), { recursive: true });
    await copyFile(entrySource, entryDestination);
  }
}

async function collectFiles(directory) {
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

function normalize(path) {
  return path.replaceAll("\\", "/");
}
