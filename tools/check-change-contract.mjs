import { access, readFile } from 'node:fs/promises';
import process from 'node:process';

const quality = JSON.parse(await readFile('quality/quality-contract.json', 'utf8'));
const contractPath = quality.activeChangeContractPath;
const failures = [];

if (typeof contractPath !== 'string' || contractPath.trim() === '') {
  failures.push('quality-contract.json must declare activeChangeContractPath.');
} else {
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  if (contract.schemaVersion !== 1) {
    failures.push(`${contractPath} has unsupported schemaVersion.`);
  }
  for (const field of ['area', 'problem', 'reuseDecision', 'stateOwner']) {
    if (typeof contract[field] !== 'string' || contract[field].trim() === '') {
      failures.push(`${contractPath} is missing ${field}.`);
    }
  }
  for (const field of ['existingOwnersChecked', 'nonGoals', 'acceptance']) {
    if (!Array.isArray(contract[field]) || contract[field].length === 0) {
      failures.push(`${contractPath} requires a non-empty ${field} array.`);
    } else if (contract[field].some((value) => typeof value !== 'string' || value.trim() === '')) {
      failures.push(`${contractPath}.${field} contains an empty value.`);
    }
  }
  if (Array.isArray(contract.existingOwnersChecked)) {
    for (const ownerPath of contract.existingOwnersChecked) {
      try {
        await access(ownerPath);
      } catch {
        failures.push(`${contractPath} references missing owner ${ownerPath}.`);
      }
    }
  }
  if (Array.isArray(contract.acceptance) && contract.acceptance.length < 3) {
    failures.push(`${contractPath} requires at least three measurable acceptance checks.`);
  }
}

console.log(JSON.stringify({ schemaVersion: 1, contractPath, failures }, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}
