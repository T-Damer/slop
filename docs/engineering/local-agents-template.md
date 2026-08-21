# Local AGENTS.md template

Copy this structure into a new architectural boundary and delete sections that are not applicable. Keep the resulting local `AGENTS.md` concise; target <= 120 lines.

```md
# AGENTS.md

## Scope

Owns:
- ...

Does not own:
- ...

## Canonical docs

- `...`

## State / contracts owned here

- ...

## Required reuse

Before creating new behaviour, inspect/reuse:
- ...

## Dependency rules

Allowed:
- ...

Forbidden:
- ...

## Domain registries

Use canonical owners such as:
- `...Events`
- `...Rules`
- `...Timers`
- `...Distances`

Do not add inline domain literals or orphan local constants.

## Refactor rules

- ...

## Tests / validation

Required:
- ...

## Local pitfalls

- ...
```

Do not copy root generic rules into the local file. Link to canonical documents instead.
