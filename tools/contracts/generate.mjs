import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const generatorConfig = {
  checkFlag: "--check",
  source: "games/traffic-jam/fixtures/conformance.json",
  target: "games/traffic-jam/domain/src/traffic-fixture.generated.ts",
  header:
    "// Generated from games/traffic-jam/fixtures/conformance.json. Do not edit.\n",
};

const repositoryRoot = resolve(import.meta.dirname, "../..");
const sourcePath = resolve(repositoryRoot, generatorConfig.source);
const targetPath = resolve(repositoryRoot, generatorConfig.target);
const fixture = JSON.parse(await readFile(sourcePath, "utf8"));
const expected = `${generatorConfig.header}export const trafficConformanceFixture = ${JSON.stringify(
  fixture,
  null,
  2,
)} as const;\n`;
const checkOnly = process.argv.includes(generatorConfig.checkFlag);

if (checkOnly) {
  const current = await readFile(targetPath, "utf8").catch(() => String());
  if (current !== expected) {
    console.error(`Generated contract is stale: ${generatorConfig.target}`);
    process.exitCode = 1;
  }
} else {
  await writeFile(targetPath, expected, "utf8");
}
