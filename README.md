# Slop

Slop is an AI-oriented game factory built around small, testable game domains, reusable mechanics, runtime adapters, and machine-enforced generation contracts.

The browser build now opens a shared game hub with two vertical slices:

- **Junkyard Station** — the base for character-driven tycoon worlds: move with keyboard or touch, approach an object or NPC, and let a reusable proximity interaction progress automatically;
- **Parking Jam** — the existing isometric parking and passenger puzzle with deterministic seeded levels and a solver-backed domain.

Junkyard Station is an original implementation of the broad junkyard/gas-station tycoon loop. It does not contain third-party source code, branding, levels, models, textures, sounds, or copied assets.

## Play

GitHub Pages: **https://t-damer.github.io/slop/**

Direct routes:

```text
https://t-damer.github.io/slop/?game=junkyard-tycoon
https://t-damer.github.io/slop/?game=parking-jam&level=0&seed=17
```

Weak-device QA routes:

```text
https://t-damer.github.io/slop/?game=junkyard-tycoon&quality=low&qa=1
https://t-damer.github.io/slop/?game=parking-jam&level=0&seed=17&quality=low&qa=1
```

Legacy Parking Jam links containing `level`, `seed`, or `viewport` continue to open Parking Jam even without `game=parking-jam`.

## Reusable proximity-world base

`games/shared/proximity-world/domain` is the canonical owner for:

- normalized top-down movement and world bounds;
- nearest ready interaction selection;
- sustained proximity progress;
- locked, ready, cooldown, and completed states;
- semantic movement and completion events.

A new tycoon-style game should compose this domain, define its own interactions and rewards, and add presentation-specific models and animations. It should not implement a second movement or auto-interaction state machine.

## Quality commands

The full CI toolchain checks out the pinned Modoki revision and installs locked dependencies before running:

```bash
npm run check
npm run web:budget
npm run ui:quality -- http://127.0.0.1:4173/slop/
```

`npm run check` includes:

- Parking Jam domain and generator tests;
- reusable proximity-world tests;
- the complete Junkyard Station starter-loop test;
- active change-contract validation;
- architecture boundaries;
- code-size, suppression, generic-owner, and duplicate ratchets;
- GLB recipe, provenance, structure, hash, and budget validation;
- strict TypeScript checking against the pinned Modoki toolchain.

The browser contract tests Parking Jam at six viewports and separately verifies the hub and cross-game journey. It launches Junkyard Station, moves the real character into an interaction, observes resource changes through a read-only QA bridge, returns to the hub, and launches Parking Jam. Screenshots and JSON reports are retained as workflow artifacts.

## Build with Modoki

The workflows pin Modoki `v0.5.2` by commit. The current build shell remains `games/traffic-jam` while the hub migration is in progress:

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
Shared proximity domain ──→ Junkyard domain ──→ Junkyard presentation ─┐
                                                                     ├─→ Game hub ─→ Modoki adapter
Parking domain ───────────────────────→ Parking presentation ─────────┘

Quality contract ─→ code · asset · bundle · browser · performance gates
```

See:

- `AGENTS.md`;
- `games/shared/proximity-world/README.md`;
- `quality/README.md`;
- `quality/generation-policy.md`;
- `quality/visual-target.md`;
- `architecture/current.mmd`;
- `architecture/target.mmd`.
