# Capabilities and reuse

## Hard rules

1. Search before creating any helper/hook/system/service/component/schema/event/config/adapter/UI primitive.
2. Search by semantics and synonyms, not only the intended name.
3. Prefer: reuse → extend → compose → game-local implementation → shared abstraction.
4. Shared abstractions represent shared **semantics**, not merely similar syntax.
5. First occurrence may stay local; second independent occurrence requires an explicit reuse decision; a third equivalent implementation is an architecture defect without exception.
6. Copy-paste-and-modify variants are not an acceptable reuse strategy.
7. Shared code never gains concrete game special cases to satisfy one caller.
8. New reusable capabilities need a discoverable owner, public contract, tests, and eventually registry metadata.
9. Refactoring to create/change shared capabilities follows `../engineering/refactoring.md`.
10. Domain values/IDs belonging to a capability live in that capability's typed registries/config, not in callers.

## 1. Mandatory search protocol

Before creating:

```text
ECS component/system
hook/helper/service/controller
adapter/schema/event/command
config/registry
UI primitive
network message/API
```

search:

- intended name;
- synonyms;
- domain concept;
- neighbouring imports/exports;
- tests/call sites;
- capability metadata when available.

Example: before implementing “player holds fish”, search:

```text
carry
carrier
carryable
pickup
held item
attach
inventory
```

A missing exact identifier is not evidence that the capability is missing.

## 2. Decision order

```text
1. reuse existing capability unchanged
2. extend its contract when it already owns the semantics
3. compose existing lower-level capabilities
4. keep genuinely game-specific behaviour local
5. create/promote a shared capability only when semantics are demonstrated as shared
```

Do not jump to generic abstraction because code “looks reusable”.

## 3. Semantic reuse

Good candidate:

```text
Carrier + Carryable + CarrySystem
```

used consistently by fish, boxes, loot, groceries, tools.

Weak candidate:

```text
GenericThingThatMovesBetweenTwoPlaces
```

created because two code blocks happen to look similar.

The question is:

> Are callers participating in the same domain operation with the same invariants/lifecycle?

not:

> Can these lines be parameterized?

## 4. First / second / third occurrence

### First

Keep behaviour local when shared semantics are not proven.

### Second independent occurrence

The agent/reviewer must explicitly choose:

- reuse/extend an existing capability;
- promote both to one shared capability;
- document why they are semantically different.

### Third equivalent occurrence

Reject without an architecture exception. The repository should not accumulate a third competing owner for the same semantic operation.

## 5. Capability ownership

A shared capability owns a coherent contract such as:

```text
components/state
systems/behaviour
commands/events
configuration/registries
public entrypoint
contract tests
```

Example values should be owned by the capability/domain:

```ts
carryEvents.started
carryEvents.completed
carryRules.maxCarryDistanceMeters
```

Callers do not redefine them locally.

## 6. Capability registry

The project should eventually expose machine-readable capability metadata.

Conceptual entry:

```json
{
  "carry-object": {
    "entrypoint": "game-sdk/carry",
    "components": ["Carrier", "Carryable"],
    "systems": ["CarrySystem"],
    "summary": "Attach, transport and release carryable entities"
  }
}
```

The exact format is deferred until runtime/package structure exists.

The registry should let agents answer:

- does this capability already exist?
- where is its canonical entrypoint?
- what systems/components/config own it?
- which games use it?
- what contract/tests define it?

Do not create speculative registry entries for capabilities with no implementation/contract.

## 7. Game-local vs shared

Game-local behaviour stays under the game boundary when its rules are genuinely specific.

Example:

```text
shared: CarrySystem
fishing-local: FishCatchEligibilitySystem
```

Fishing can decide **which fish may be picked up** without teaching `CarrySystem` about fishing.

Promotion to shared code requires semantic evidence from another consumer, not prediction that one may exist later.

## 8. Extending existing capabilities

Extend when:

- the capability already owns the semantic operation;
- the new case preserves coherent invariants;
- API growth benefits/represents the capability rather than one caller.

Do not extend shared code with:

```ts
if (gameId === gameIds.fishing) { ... }
```

or options whose only purpose is to emulate one game-specific branch.

Prefer composition/game-local systems when semantics differ.

## 9. Helpers/hooks

A reusable helper/hook must have:

- a coherent responsibility;
- semantic naming;
- stable input/output contract;
- appropriate tests when non-trivial;
- an owner where agents can discover it.

Do not create generic dumping grounds such as unrelated `utils.ts`/`helpers.ts` exports.

Do not move a 200-line workflow into a “shared hook” merely to hide component complexity.

## 10. Events/config/schemas are capabilities too

Duplicate code is not the only duplication problem.

Do not create parallel:

- event identifiers for the same occurrence;
- schemas representing the same canonical state;
- configs with overlapping ownership;
- network commands with equivalent semantics;
- UI flows that become competing domain owners.

Reuse policy applies to contracts/data ownership as strongly as implementation code.

## 11. Refactor boundary

If reuse requires moving/changing an existing owner:

1. read `../engineering/refactoring.md`;
2. identify callers/behaviour to preserve;
3. define target ownership;
4. avoid dual paths unless migration is explicitly bounded;
5. update capability/local `AGENTS.md`/docs/tests together;
6. run `grill-me`/adversarial review for a non-trivial shared refactor.

## 12. Review questions

Before accepting a new reusable concept:

- What exact existing terms/capabilities were searched?
- Why is this not an extension/composition of one of them?
- Who owns the new semantics?
- Is there a real second consumer or only a hypothetical future one?
- Does the API encode one caller's special case?
- Are config/events/state also centralized under the owner?
- Will the next agent find this before reimplementing it?

If discoverability is poor, the capability is not finished.
