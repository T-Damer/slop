# Slop

Slop is an AI-oriented browser-game factory built around small, testable domains, interchangeable presentation adapters, reproducible assets, and machine-enforced quality gates.

## Live

- Personal Island Hub: **https://t-damer.github.io/slop/**
- Force the first-run guide again: **https://t-damer.github.io/slop/?onboarding=1&resetIsland=1**
- Parking Jam: **https://t-damer.github.io/slop/?game=parking-jam&level=0&seed=17**
- Junkyard Station: **https://t-damer.github.io/slop/?game=junkyard-station**

## Personal Island Hub

The root experience is a persistent personal island rather than a card-only launcher.

On the first visit the player:

1. meets a guide;
2. chooses typed preferences through emoji chips;
3. watches the actual island scene reveal in five generation stages;
4. receives a deterministic island blueprint derived from the normalized profile;
5. enters an island containing a house, vegetation, rocks, animal life, an animated shore, camera modes, and in-world portals to the existing games.

The concrete `IslandSnapshot` is stored behind an `IslandRepository` port. The current adapter uses browser storage; a future HTTP/database adapter can replace it without changing the generator, onboarding, or scene owners.

## Architecture

```text
PlayerProfile + typed preferences
        ↓
stable seed → pure IslandBlueprint generator
        ↓
versioned IslandSnapshot → IslandRepository
        ↓
application session
        ↓
Three.js island scene + onboarding components
        ↓
existing hub router
        ↓
Parking Jam / Junkyard Station
```

Major owners are intentionally separate:

- player profile and avatar appearance;
- preference catalog;
- deterministic island generator and validation;
- repository and snapshot migration boundary;
- guide dialog;
- preference wizard;
- generation overlay;
- terrain, ocean, decor, assets, camera, player input, HUD, and portals;
- existing game route lifecycle.

## Assets

Island assets come from vetted CC0 sources, including Kenney and Quaternius packs. Shipped third-party files have local provenance, source commit, license, size, and SHA-256 checks. Generated placeholder assets are not silently substituted for accepted external assets.

## Quality

Requires Node.js 24 or newer:

```bash
npm test
npm run check
```

CI additionally performs:

- strict TypeScript and formatting/lint checks;
- architecture, dependency, code-size, and function-size ratchets;
- deterministic generator and persistence tests;
- third-party asset provenance and binary validation;
- the pinned Modoki production web build;
- bundle budgets;
- multi-viewport browser contracts for the hub, personal island, Parking Jam, and Junkyard Station;
- a real first-run flow through the seven preference steps, five reveal stages, final guide, island movement, camera change, route launch, and persistence after clean navigation.

## Branch policy

- `main`: reviewed code;
- `stable`: the only automatic Pages publication source;
- up to three disjoint `feature/*` branches;
- maximum five branches total and three open PRs.
