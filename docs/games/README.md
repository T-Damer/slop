# Game specifications

## Hard rules

1. Every substantial game gets a canonical spec before substantial implementation.
2. Every game implementation boundary (`games/<game>/`) gets its own concise `AGENTS.md` before code is added.
3. The spec defines game-specific behaviour; local `AGENTS.md` defines implementation ownership/dependency/reuse rules.
4. Neither may override root/shared architecture invariants.
5. Unknown permanent decisions remain explicit `TBD`; implementation agents do not silently invent them.

Use [`_template.md`](./_template.md) for a new game spec and [`../engineering/local-agents-template.md`](../engineering/local-agents-template.md) for the implementation boundary.

## Why two files

A game spec answers **what the game does**:

- loop/session/join/spectator rules;
- win/loss/progression/social moments;
- networking authority;
- visual/asset/performance requirements.

`games/<game>/AGENTS.md` answers **how agents may change that implementation**:

- owned state/contracts;
- reusable ECS/platform capabilities;
- allowed dependencies;
- canonical registries such as `<game>Events`, `<game>Rules`, `<game>Timers`;
- local refactor restrictions;
- required tests.

Keeping these separate prevents either document from becoming a giant handbook.

## Required spec topics

As applicable:

- core loop and target session length;
- input model;
- player count;
- online/offline/bot policy;
- join/spectator/reconnect/leave behaviour;
- win/loss/end conditions;
- progression/rating;
- social moments and presence summary;
- monetization/cosmetic surfaces;
- reusable ECS/platform capabilities;
- genuinely game-specific systems/data;
- authoritative networking model;
- deterministic/random requirements;
- visual/theme requirements;
- asset/audio requirements;
- performance constraints;
- current prototype scope;
- acceptance tests.

## Agent reading rule

An agent implementing `games/<game>/...` reads only:

1. root `AGENTS.md`;
2. `games/<game>/AGENTS.md` plus any deeper applicable local instructions;
3. that game's canonical spec;
4. the smallest architecture/engineering docs routed by the local instructions/task.

Do not require the agent to ingest every game or the entire documentation tree.

When behaviour changes intentionally, update the game spec in the same change. When ownership/dependencies/reuse rules change, update the local `AGENTS.md` in the same change.
