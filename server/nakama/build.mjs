import { rm, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const compiledDirectory = resolve(import.meta.dirname, ".compiled");
const outputDirectory = resolve(import.meta.dirname, "build");
const TypeScriptExecutable = process.platform === "win32" ? "npx.cmd" : "npx";
const buildSettings = {
  entryPoint: resolve(compiledDirectory, "server/nakama/src/main.js"),
  outputFile: resolve(outputDirectory, "index.js"),
  globalName: "SlopNakamaModule",
  footer: "var InitModule = SlopNakamaModule.InitModule;",
} as const;

await rm(compiledDirectory, { recursive: true, force: true });
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const typeScriptResult = spawnSync(
  TypeScriptExecutable,
  ["tsc", "-p", "server/nakama/tsconfig.json"],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: "inherit",
  },
);
if (typeScriptResult.status !== 0) {
  process.exit(typeScriptResult.status ?? 1);
}

await build({
  entryPoints: [buildSettings.entryPoint],
  outfile: buildSettings.outputFile,
  bundle: true,
  format: "iife",
  globalName: buildSettings.globalName,
  footer: { js: buildSettings.footer },
  platform: "neutral",
  target: ["es5"],
  minify: false,
  legalComments: "inline",
});
