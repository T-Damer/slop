# Game specifications

Every game in `slop` should have a concise canonical specification before substantial implementation begins.

The specification exists so implementation agents do not invent product/session/network behaviour while writing code.

Use [`_template.md`](./_template.md) for new games.

## Rules

- one canonical spec per game;
- the spec describes behaviour/contracts, not implementation trivia;
- implementation must link/reuse platform capabilities instead of redefining them in prose;
- unknown decisions are marked explicitly as `TBD`; agents must not silently choose a permanent architecture for a `TBD` item;
- when behaviour changes intentionally, update the game spec in the same change;
- temporary prototype omissions must be listed under `Prototype scope`, so “not implemented yet” is not mistaken for the final design.

## Required topics

Every game spec should answer, as applicable:

- core loop;
- target session length;
- input model;
- player count;
- online/offline/bot policy;
- join policy;
- spectator behaviour;
- reconnect/leave behaviour;
- win/loss/end conditions;
- progression/rating policy;
- meaningful social moments;
- chat/presence summary;
- monetization/cosmetic surfaces;
- reusable ECS capabilities required;
- genuinely game-specific systems/data;
- authoritative networking model;
- deterministic/random requirements;
- visual/theme requirements;
- asset/audio requirements;
- performance constraints;
- acceptance tests for the current milestone.

## Agent reading rule

An agent implementing a game must read:

1. root `AGENTS.md`;
2. `docs/README.md` routing;
3. this game specification;
4. the relevant architecture docs for the systems it changes.

The game spec does not override repository-wide architecture rules.
