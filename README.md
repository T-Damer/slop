# slop

A web-first, friend-first game platform built around a compact Godot runtime,
deterministic turn sessions, immutable history, reusable UI, and agent-oriented
generation/validation tooling.

## Current vertical slice

The repository currently contains:

- the versioned `addons/slop_engine` Godot runtime package;
- the shared `addons/slop_ui` library;
- deterministic TypeScript session/replay primitives;
- reusable grid-slide rules;
- a Nakama runtime/storage adapter;
- Traffic Jam as the first real conformance game;
- Godot and Blender MCP pins;
- architecture/repository guards;
- CI on feature/main and automatic GitHub Pages publishing from `stable`.

## Run checks

```bash
npm install
npm run check
```

With Godot available:

```bash
npm run godot:conformance
npm run godot:run
```

Build the Nakama module and run the local server:

```bash
npm run build:nakama
docker compose up
```

## Branches

- `main`: reviewed code;
- `stable`: publish/deploy source;
- up to three non-overlapping feature branches.

See `AGENTS.md`, `docs/README.md`, and `.slop/repository-policy.json` before
changing the repository.
