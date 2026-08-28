# Slop

Slop is an AI-oriented game factory built around small, testable game domains, runtime adapters, and machine-enforced generation contracts.

The first vertical slice is **Parking Jam**, built as an external Modoki project:

- one pure TypeScript source of truth for parking, passenger groups, pickup bays, scoring, jam detection, and solving;
- touch-first isometric Three.js presentation;
- deterministic seeded level generation with solver sweeps;
- project-authored GLB source assets with recipes and provenance;
- strict code-size, asset, bundle, browser interaction, layout, and performance ratchets;
- adaptive low/medium/high runtime quality profiles;
- GitHub Pages publication from `stable` only.

## Play

GitHub Pages: **https://t-damer.github.io/slop/**

A reproducible low-quality QA view can be opened with:

```text
https://t-damer.github.io/slop/?level=0&seed=17&quality=low&qa=1
```

## Quality commands

The full CI toolchain checks out the pinned Modoki revision and installs the locked asset dependencies before running:

```bash
npm run check
npm run web:budget
npm run ui:quality -- http://127.0.0.1:4173/slop/
```

`npm run check` includes:

- domain and 32-seed-per-level generator tests;
- active change-contract validation;
- architecture boundaries;
- code-size, suppression, generic-owner, and duplicate ratchets;
- GLB recipe, provenance, structure, hash, and budget validation;
- strict TypeScript checking against the pinned Modoki toolchain.

The browser contract runs the production build at six viewports, performs a real canvas interaction, invokes Hint and Shuffle, checks browser errors, touch targets, overflow, critical UI overlap, rendering changes, load/paint timings, and JavaScript heap, then stores screenshots and JSON reports.

## Build with Modoki

The workflows pin Modoki `v0.5.2` by commit. For a local build:

```bash
git clone https://github.com/lsgmasa33/modoki-engine.git .modoki-engine
cd .modoki-engine
git checkout 145bae5b2dc38ac0561a2b627d726cba69a99c1f
npm ci
cd ../games/traffic-jam
npm ci
cd ../../.modoki-engine
MODOKI_PROJECT=/absolute/path/to/slop/games/traffic-jam \
  npm run build -- --target web
```

The artifact is written to `games/traffic-jam/dist`.

## Architecture

```text
Parking domain — pure TypeScript
        ↓
Parking presentation — Three.js / DOM projection and input
        ↓
Modoki adapter — lifecycle and browser packaging

Quality contract
        ↓
code · asset · bundle · browser · performance gates
```

See:

- `AGENTS.md`;
- `quality/README.md`;
- `quality/generation-policy.md`;
- `quality/visual-target.md`;
- `architecture/current.mmd`;
- `architecture/target.mmd`.
