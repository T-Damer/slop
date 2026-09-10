import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../.modoki-engine/node_modules/vite/dist/node/index.js';

// Use the existing pinned engine toolchain. This fixture never enters the hub bundle.
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({
  configFile: false,
  root: path.join(repository, 'tools/browser-quality/island-preview'),
  base: './',
  resolve: { alias: { three: path.join(repository, '.modoki-engine/node_modules/three') } },
  build: {
    target: 'es2022',
    outDir: path.join(repository, process.env.QUALITY_REPORT_DIR ?? 'quality-artifacts', 'island-preview'),
    emptyOutDir: true,
  },
});
