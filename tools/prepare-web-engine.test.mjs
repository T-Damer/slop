import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compactEngineEntry, compactWebProfile as profile } from './prepare-web-engine.mjs';

const engineAvailable = existsSync('.modoki-engine/.git');

test('compact profile refuses an unexpected engine pin', () => {
  assert.throws(() => compactEngineEntry('', {}, 'wrong-revision'), /Unexpected Modoki revision/);
});

test('compact profile refuses remote-subgame configuration', () => {
  assert.throws(() => compactEngineEntry('', { ota: { enabled: true } }, profile.engineCommit), /OTA configuration/);
});

test('compact profile refuses debug builds', () => {
  assert.throws(() => compactEngineEntry('', { build: { debugBuild: true } }, profile.engineCommit), /release builds/);
});

test('compact profile refuses unreviewed source and cannot silently patch a changed entry', () => {
  assert.throws(() => compactEngineEntry(profile.registryImport, {}, profile.engineCommit), /differs from the reviewed source/);
});

test('reviewed engine patch changes only its unused registry import and is idempotent',
  { skip: !engineAvailable && 'Pinned engine is not installed in this local environment.' }, () => {
    const source = execFileSync('git', ['-C', '.modoki-engine', 'show', `HEAD:${profile.entryPath}`], { encoding: 'utf8' });
    const patched = compactEngineEntry(source, {}, profile.engineCommit);
    assert.equal(patched.replace(profile.replacement, profile.registryImport), source);
    assert.equal(compactEngineEntry(patched, {}, profile.engineCommit), patched);
    assert.ok(patched.includes("import App from './App.tsx'"));
    assert.ok(patched.includes("from '@modoki/engine/runtime'"));
  });
