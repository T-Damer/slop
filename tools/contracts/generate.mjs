import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const generatorConfig = {
  checkFlag: "--check",
  trafficFixture: {
    source: "games/traffic-jam/fixtures/conformance.json",
    target: "games/traffic-jam/domain/src/traffic-fixture.generated.ts",
  },
  protocol: {
    source: "packages/contracts/protocol.json",
    typeScriptTarget: "packages/contracts/src/protocol.generated.ts",
    godotTarget:
      "addons/slop_engine/network/slop_network_protocol.generated.gd",
  },
};

const repositoryRoot = resolve(import.meta.dirname, "../..");
const checkOnly = process.argv.includes(generatorConfig.checkFlag);
const trafficFixture = await readJson(generatorConfig.trafficFixture.source);
const protocol = await readJson(generatorConfig.protocol.source);

const outputs = [
  {
    target: generatorConfig.trafficFixture.target,
    content:
      "// Generated from games/traffic-jam/fixtures/conformance.json. Do not edit.\n" +
      `export const trafficConformanceFixture = ${JSON.stringify(
        trafficFixture,
        null,
        2,
      )} as const;\n`,
  },
  {
    target: generatorConfig.protocol.typeScriptTarget,
    content:
      "// Generated from packages/contracts/protocol.json. Do not edit.\n" +
      `export const slopProtocol = ${JSON.stringify(protocol, null, 2)} as const;\n`,
  },
  {
    target: generatorConfig.protocol.godotTarget,
    content: renderGodotProtocol(protocol),
  },
];

for (const output of outputs) {
  const targetPath = resolve(repositoryRoot, output.target);
  if (checkOnly) {
    const current = await readFile(targetPath, "utf8").catch(() => String());
    if (current !== output.content) {
      console.error(`Generated contract is stale: ${output.target}`);
      process.exitCode = 1;
    }
  } else {
    await writeFile(targetPath, output.content, "utf8");
  }
}

async function readJson(repositoryPath) {
  return JSON.parse(
    await readFile(resolve(repositoryRoot, repositoryPath), "utf8"),
  );
}

function renderGodotProtocol(value) {
  return [
    "# Generated from packages/contracts/protocol.json. Do not edit.",
    "class_name SlopNetworkProtocol",
    "extends RefCounted",
    String(),
    `const schema_version := ${value.schemaVersion}`,
    String(),
    `const rpc_ids := ${renderGodotDictionary(value.rpc_ids)}`,
    String(),
    `const envelope := ${renderGodotDictionary(value.envelope)}`,
    String(),
    `const fields := ${renderGodotDictionary(value.fields)}`,
    String(),
  ].join("\n");
}

function renderGodotDictionary(value) {
  return JSON.stringify(value, null, 4);
}
