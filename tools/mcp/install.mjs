import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const installerPaths = {
  repositoryRoot: resolve(import.meta.dirname, "../.."),
  configuration: ".slop/mcp-tools.json",
  temporaryPrefix: "slop-mcp-",
};
const installerTargets = {
  godot: "godot",
  blender: "blender",
};

const repositoryRoot = installerPaths.repositoryRoot;
const configuration = JSON.parse(
  await readFile(resolve(repositoryRoot, installerPaths.configuration), "utf8"),
);
const requestedTargets = new Set(process.argv.slice(2));
const installAll = requestedTargets.size === 0;

if (installAll || requestedTargets.has(installerTargets.godot)) {
  await installGodotToolkit(configuration.godot);
}
if (installAll || requestedTargets.has(installerTargets.blender)) {
  await installBlenderToolkit(configuration.blender);
}

for (const target of requestedTargets) {
  if (!Object.values(installerTargets).includes(target)) {
    throw new Error(`Unknown MCP install target: ${target}`);
  }
}

async function installGodotToolkit(tool) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), installerPaths.temporaryPrefix));
  const archivePath = join(temporaryRoot, "toolkit.tar.gz");
  try {
    await run("curl", [
      "--fail",
      "--location",
      "--retry",
      "3",
      "--output",
      archivePath,
      tool.archiveUrl,
    ]);
    await run("tar", ["-xzf", archivePath, "-C", temporaryRoot]);
    const entries = await readdir(temporaryRoot, { withFileTypes: true });
    const extractedRoot = entries.find((entry) => entry.isDirectory());
    if (extractedRoot === undefined) {
      throw new Error("Godot MCP archive did not contain a project directory.");
    }
    const source = join(temporaryRoot, extractedRoot.name, tool.addonPath);
    const destination = resolve(repositoryRoot, tool.destinationPath);
    await rm(destination, { recursive: true, force: true });
    await cp(source, destination, { recursive: true });
    console.log(`Installed Godot MCP Toolkit ${tool.toolkitCommit}.`);
    console.log("Enable Godot MCP Toolkit in Project Settings > Plugins.");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function installBlenderToolkit(tool) {
  await run("uvx", [`${tool.package}==${tool.version}`, "install-addon"]);
  console.log(`Installed Blender MCP ${tool.version}.`);
}

function run(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      stdio: "inherit",
    });
    child.once("error", rejectPromise);
    child.once("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`${command} exited with code ${code}.`));
    });
  });
}
