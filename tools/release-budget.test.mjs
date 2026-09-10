import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('local game budget reallocation preserves base and aggregate delivery ceilings', async () => {
  const { runtime } = JSON.parse(await readFile('quality/quality-contract.json', 'utf8'));
  for (const [metric, base, total] of [
    ['rawRatchetBytes', 3735000, 4055000],
    ['gzipRatchetBytes', 1356000, 1455000],
    ['brotliRatchetBytes', 1150000, 1237000],
  ]) {
    assert.equal(runtime[metric], base);
    assert.equal(base + runtime.optionalBundles.reduce((sum, bundle) => sum + bundle[metric], 0), total);
  }
});
