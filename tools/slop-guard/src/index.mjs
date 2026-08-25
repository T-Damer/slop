import { access, readFile, readdir } from "node:fs/promises";
import { resolve, relative, extname, basename, dirname } from "node:path";

const guardConfig = {
  policyPath: ".slop/repository-policy.json",
  boundaryRoots: ["addons", "packages", "games", "server", "services", "tools"],
  sourceExtensions: new Set([".ts", ".tsx", ".js", ".mjs", ".gd"]),
  ignoredSegments: new Set([
    ".git",
    ".godot",
    ".build-tests",
    ".compiled",
    "node_modules",
    "dist",
    "build",
  ]),
  ownerNamePattern: /(registry|config|constants|generated|fixture|test)/i,
  documentationPattern: /(^|\/)docs\//,
  rawDomainPattern: /["'`](?:slop|traffic|grid)\.[a-z0-9_.:-]+["'`]/g,
  orphanConstantPattern:
    /\bconst\s+[A-Z][A-Z0-9_]*\s*(?::[^=]+)?=\s*(?:["'`][^"'`]+["'`]|-?\d+(?:\.\d+)?)/g,
  magicTimerPattern: /\b(?:setTimeout|setInterval)\s*\([^,]+,\s*\d+/g,
  deterministicApis: [
    "Date.now(",
    "performance.now(",
    "Math.random(",
    "setTimeout(",
    "setInterval(",
    "fetch(",
    "WebSocket(",
    "localStorage",
    "IndexedDB",
  ],
  deterministicRoots: [
    "packages/turn-engine/",
    "packages/grid-slide/",
    "games/traffic-jam/domain/",
  ],
  codes: {
    missingAgents: "SLOP070",
    rawIdentifier: "SLOP030",
    orphanConstant: "SLOP032",
    magicTimer: "SLOP031",
    deterministicSideEffect: "SLOP010",
    crossGameImport: "SLOP001",
    sharedImportsGame: "SLOP002",
    branchLimit: "SLOP080",
    pullRequestLimit: "SLOP081",
  },
};

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const failures = [];
await checkBoundaryInstructions();
await checkSources();
await checkRepositoryLimits();

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`${failure.code} ${failure.path}: ${failure.message}`);
  }
  process.exitCode = 1;
} else {
  console.log("slop-guard: PASS");
}

async function checkBoundaryInstructions() {
  for (const rootName of guardConfig.boundaryRoots) {
    const rootPath = resolve(repositoryRoot, rootName);
    if (!(await exists(rootPath))) {
      continue;
    }
    const entries = await readdir(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || guardConfig.ignoredSegments.has(entry.name)) {
        continue;
      }
      const agentsPath = resolve(rootPath, entry.name, "AGENTS.md");
      if (!(await exists(agentsPath))) {
        failures.push({
          code: guardConfig.codes.missingAgents,
          path: relative(repositoryRoot, dirname(agentsPath)),
          message: "Architectural boundary is missing AGENTS.md.",
        });
      }
    }
  }
}

async function checkSources() {
  const paths = await collectFiles(repositoryRoot);
  for (const absolutePath of paths) {
    const repositoryPath = normalize(relative(repositoryRoot, absolutePath));
    if (!guardConfig.sourceExtensions.has(extname(absolutePath))) {
      continue;
    }
    if (
      guardConfig.documentationPattern.test(repositoryPath) ||
      repositoryPath.startsWith("tools/slop-guard/")
    ) {
      continue;
    }
    const source = await readFile(absolutePath, "utf8");
    const ownerFile = guardConfig.ownerNamePattern.test(basename(repositoryPath));

    if (!ownerFile) {
      for (const match of source.matchAll(guardConfig.rawDomainPattern)) {
        failures.push({
          code: guardConfig.codes.rawIdentifier,
          path: repositoryPath,
          message: `Raw domain identifier ${match[0]} must come from a registry.`,
        });
      }
      for (const match of source.matchAll(guardConfig.orphanConstantPattern)) {
        failures.push({
          code: guardConfig.codes.orphanConstant,
          path: repositoryPath,
          message: `Orphan domain constant ${match[0]} requires cohesive registry ownership.`,
        });
      }
      for (const match of source.matchAll(guardConfig.magicTimerPattern)) {
        failures.push({
          code: guardConfig.codes.magicTimer,
          path: repositoryPath,
          message: `Inline timer ${match[0]} requires a domain timer registry.`,
        });
      }
    }

    if (guardConfig.deterministicRoots.some((root) => repositoryPath.startsWith(root))) {
      for (const api of guardConfig.deterministicApis) {
        if (source.includes(api)) {
          failures.push({
            code: guardConfig.codes.deterministicSideEffect,
            path: repositoryPath,
            message: `Deterministic code accesses forbidden API ${api}.`,
          });
        }
      }
    }

    const imports = source.matchAll(/(?:from\s+|import\s*)["'`]([^"'`]+)["'`]/g);
    for (const match of imports) {
      const importPath = match[1] ?? String();
      if (repositoryPath.startsWith("games/") && importPath.includes("/games/")) {
        const currentGame = repositoryPath.split("/")[1];
        const importedGame = importPath.split("/games/")[1]?.split("/")[0];
        if (importedGame !== undefined && importedGame !== currentGame) {
          failures.push({
            code: guardConfig.codes.crossGameImport,
            path: repositoryPath,
            message: `Game imports another game: ${importPath}.`,
          });
        }
      }
      if (
        (repositoryPath.startsWith("packages/") || repositoryPath.startsWith("addons/slop_")) &&
        importPath.includes("/games/")
      ) {
        failures.push({
          code: guardConfig.codes.sharedImportsGame,
          path: repositoryPath,
          message: `Shared code imports a concrete game: ${importPath}.`,
        });
      }
    }
  }
}

async function checkRepositoryLimits() {
  const policy = JSON.parse(
    await readFile(resolve(repositoryRoot, guardConfig.policyPath), "utf8"),
  );
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repository || !token) {
    return;
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const branches = await fetchAll(
    `https://api.github.com/repos/${repository}/branches?per_page=100`,
    headers,
  );
  const pullRequests = await fetchAll(
    `https://api.github.com/repos/${repository}/pulls?state=open&per_page=100`,
    headers,
  );
  const featureBranches = branches.filter(
    (branch) => !policy.permanentBranches.includes(branch.name),
  );

  if (
    branches.length > policy.maxBranches ||
    featureBranches.length > policy.maxFeatureBranches
  ) {
    failures.push({
      code: guardConfig.codes.branchLimit,
      path: guardConfig.policyPath,
      message:
        `Branch limit exceeded: ${branches.length}/${policy.maxBranches} total, ` +
        `${featureBranches.length}/${policy.maxFeatureBranches} feature.`,
    });
  }
  if (pullRequests.length > policy.maxOpenPullRequests) {
    failures.push({
      code: guardConfig.codes.pullRequestLimit,
      path: guardConfig.policyPath,
      message:
        `Open PR limit exceeded: ${pullRequests.length}/${policy.maxOpenPullRequests}.`,
    });
  }
}

async function fetchAll(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub policy request failed: ${response.status}`);
  }
  return response.json();
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (guardConfig.ignoredSegments.has(entry.name)) {
      continue;
    }
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

async function exists(path) {
  return access(path).then(
    () => true,
    () => false,
  );
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}
