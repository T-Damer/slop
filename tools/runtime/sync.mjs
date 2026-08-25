import {
  access,
  cp,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const runtimePaths = {
  repositoryRoot: resolve(import.meta.dirname, "../.."),
  configuration: ".slop/runtime-dependencies.json",
  temporaryPrefix: "slop-runtime-",
};
const runtimeArguments = {
  check: "--check",
};

const repositoryRoot = runtimePaths.repositoryRoot;
const configuration = JSON.parse(
  await readFile(resolve(repositoryRoot, runtimePaths.configuration), "utf8"),
);
const dependency = configuration.godot.nakama;
const checkOnly = process.argv.includes(runtimeArguments.check);

if (checkOnly) {
  await checkDependency(dependency);
  console.log(`Runtime dependency ${dependency.repository}@${dependency.commit} is current.`);
} else {
  await syncDependency(dependency);
}

async function syncDependency(definition) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), runtimePaths.temporaryPrefix));
  const checkoutRoot = join(temporaryRoot, "repository");
  const destination = resolve(repositoryRoot, definition.destinationPath);

  try {
    await run("git", ["init", checkoutRoot]);
    await run("git", [
      "-C",
      checkoutRoot,
      "remote",
      "add",
      "origin",
      definition.repositoryUrl,
    ]);
    await run("git", [
      "-C",
      checkoutRoot,
      "fetch",
      "--depth=1",
      "origin",
      definition.commit,
    ]);
    await run("git", ["-C", checkoutRoot, "checkout", "--detach", "FETCH_HEAD"]);
    const actualCommit = (
      await run("git", ["-C", checkoutRoot, "rev-parse", "HEAD"], true)
    ).trim();
    if (actualCommit !== definition.commit) {
      throw new Error(
        `Runtime dependency resolved ${actualCommit}, expected ${definition.commit}.`,
      );
    }

    await rm(destination, { recursive: true, force: true });
    await cp(resolve(checkoutRoot, definition.sourcePath), destination, {
      recursive: true,
    });
    await cp(
      resolve(checkoutRoot, definition.licensePath),
      resolve(destination, "LICENSE"),
    );
    await writeFile(
      resolve(destination, definition.metadataFile),
      `${JSON.stringify(
        {
          schemaVersion: configuration.schemaVersion,
          repository: definition.repository,
          commit: definition.commit,
          license: "Apache-2.0",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await checkDependency(definition);
    console.log(`Synchronized ${definition.repository}@${definition.commit}.`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function checkDependency(definition) {
  const destination = resolve(repositoryRoot, definition.destinationPath);
  const metadataPath = resolve(destination, definition.metadataFile);
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  if (
    metadata.repository !== definition.repository ||
    metadata.commit !== definition.commit
  ) {
    throw new Error(
      `Runtime dependency metadata does not match ${definition.repository}@${definition.commit}.`,
    );
  }

  for (const requiredFile of definition.requiredFiles) {
    const requiredPath = resolve(destination, requiredFile);
    await access(requiredPath).catch(() => {
      throw new Error(`Runtime dependency file is missing: ${requiredPath}`);
    });
  }
}

function run(command, args, capture = false) {
  return new Promise((resolvePromise, rejectPromise) => {
    const output = [];
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    });
    if (capture && child.stdout !== null) {
      child.stdout.on("data", (chunk) => output.push(chunk));
    }
    child.once("error", rejectPromise);
    child.once("exit", (code) => {
      if (code !== 0) {
        rejectPromise(new Error(`${command} exited with code ${code}.`));
        return;
      }
      resolvePromise(capture ? Buffer.concat(output).toString("utf8") : String());
    });
  });
}
