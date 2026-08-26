# Slop

Slop is an AI-oriented game factory built around small, testable game domains and interchangeable authoring/runtime adapters.

The first vertical slice is **Traffic Jam**, built as an external Modoki project:

- one pure TypeScript source of truth for rules;
- touch-first browser UI;
- deterministic level solver and tests;
- Modoki `GameDefinition`, project lifecycle, scene, and web build;
- GitHub Pages publication from `stable`;
- human-readable current/target architecture diagrams with a CI drift check.

## Play

GitHub Pages: **https://t-damer.github.io/slop/**

## Verify the domain

Requires Node.js 24 or newer:

```bash
npm test
npm run architecture:check
```

## Build with Modoki

The workflow pins Modoki `v0.5.2` by commit. For a local build:

```bash
git clone https://github.com/lsgmasa33/modoki-engine.git
cd modoki-engine
git checkout 145bae5b2dc38ac0561a2b627d726cba69a99c1f
npm ci
MODOKI_PROJECT=/absolute/path/to/slop/games/traffic-jam \
  npm run build -- --target web
```

The artifact is written to `games/traffic-jam/dist`.

## Module map

```text
Traffic domain (pure TypeScript)
        ↓
Traffic UI (DOM projection + input)
        ↓
Modoki adapter (GameDefinition + lifecycle + web build)
```

See `architecture/target.mmd`, `architecture/current.mmd`, and `architecture/model.json`.
