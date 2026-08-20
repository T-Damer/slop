# Code standards

## Purpose

These rules are optimized for a codebase written mostly by AI agents. They favor explicit ownership, discoverability, small coherent units, typed contracts, and mechanical validation over cleverness.

## 1. TypeScript baseline

Use TypeScript in strict mode.

Target rules:

- no implicit `any`;
- avoid explicit `any`; use `unknown` + validation/narrowing when the type is not known;
- no unchecked type assertions to bypass compiler errors;
- no `@ts-ignore` without a documented architecture exception;
- prefer discriminated unions for state variants;
- use exhaustive checks for closed unions;
- external/untrusted data is parsed/validated at the boundary.

Do not weaken global compiler settings to make a local change compile.

## 2. `const` and `let`

Use `const` by default.

Use `let` only when reassignment is intentional and local.

Do not use `var`.

A mutable object does not require `let` unless the binding itself is reassigned.

## 3. No magic domain strings or numbers

Meaningful literals must have names and owners.

Values that should normally be named/configured include:

- gameplay tuning values;
- timeouts/durations;
- distances/speeds/limits;
- thresholds/probabilities;
- event/command/moment identifiers;
- game/component/system IDs;
- asset IDs;
- route IDs;
- storage/cache keys;
- protocol message names;
- feature flags;
- analytics event identifiers;
- permission names.

Bad:

```ts
if (score >= 100 && room.state === "waiting") {
  send("round:start");
}
```

Preferred:

```ts
const WIN_SCORE = POOL_RULES.WIN_SCORE;
const WAITING_STATE = ACTIVITY_STATES.WAITING;
const ROUND_START_MESSAGE = NETWORK_MESSAGES.ROUND_START;

if (score >= WIN_SCORE && room.state === WAITING_STATE) {
  send(ROUND_START_MESSAGE);
}
```

### Narrow exceptions

Do not create meaningless constants for literals whose meaning is already structural and obvious, for example:

- `0` as an initial array index;
- `1` in a simple increment;
- mathematical identities;
- local test fixture data;
- import/module paths;
- short user-facing copy owned by a presentation component;
- standard syntax/options where extracting a constant would obscure intent.

If a literal changes product/game behaviour, crosses a boundary, or is repeated semantically, it is not a structural exception.

## 4. Constants belong to domains

Avoid a repository-wide junk drawer:

```text
src/constants.ts
```

Prefer:

```text
activity/activity.constants.ts
fishing/fishing.config.ts
runtime/runtime-events.ts
assets/asset-ids.ts
```

Shared semantic identifiers should use typed registries/`as const` objects or another type-safe mechanism chosen by the architecture.

## 5. UI component responsibility

A UI component should primarily:

- receive/select data;
- compose smaller UI units;
- bind event handlers to explicit actions;
- render presentation.

A component should not quietly become the owner of domain workflows, networking, persistence, gameplay rules, or complex derived state.

## 6. Local state and hooks

Local presentation state is allowed.

Extract a dedicated hook/controller when state is a coherent behaviour rather than a trivial visual toggle.

Default review triggers:

- more than 3 related `useState`/equivalent local states;
- multiple booleans that encode mutually exclusive modes;
- effects coordinating multiple state values;
- async lifecycle logic;
- retry/loading/error orchestration;
- subscriptions;
- data transformations reused across renders/components;
- same behaviour appears in another component.

Example smell:

```ts
const [isLoading, setLoading] = useState(false);
const [isJoining, setJoining] = useState(false);
const [isSpectating, setSpectating] = useState(false);
const [hasFailed, setFailed] = useState(false);
```

Prefer a coherent model:

```ts
type JoinFlowState =
  | { kind: "idle" }
  | { kind: "joining" }
  | { kind: "spectating" }
  | { kind: "failed"; reason: JoinFailure };
```

and move orchestration into a focused hook/service when appropriate.

## 7. Do not abuse hooks

Extracting a 100-line hook from a 150-line component does not automatically improve architecture.

A hook must have:

- one coherent responsibility;
- a small explicit API;
- ownership of related state/effects;
- a name matching domain intent;
- tests when behaviour is non-trivial.

Avoid mega-hooks that become hidden controllers for whole screens.

## 8. Helpers

Extract non-trivial reusable transformations/logic into named helpers when that creates a coherent unit.

Prefer pure functions.

Bad:

```ts
function helper(data: any) { ... }
```

Preferred:

```ts
function calculateAvailablePartySlots(
  memberCount: number,
  maxPlayerCount: number,
): number { ... }
```

Search before creating helpers. Follow [`../architecture/capabilities-and-reuse.md`](../architecture/capabilities-and-reuse.md).

## 9. Avoid generic dump files

Do not accumulate unrelated exports in:

```text
utils.ts
helpers.ts
common.ts
misc.ts
shared.ts
```

A cohesive domain module is acceptable. A miscellaneous bucket is not.

## 10. State ownership

Every state value must have one canonical owner.

Before adding state, identify whether it belongs to:

- authoritative simulation;
- platform/server domain;
- client application state;
- UI presentation state;
- persisted configuration/preferences;
- derived/computed state.

Derived values should usually be computed from canonical state rather than separately synchronized.

Bad:

```ts
const [players, setPlayers] = useState(...);
const [playerCount, setPlayerCount] = useState(players.length);
```

Prefer deriving `playerCount` from `players` unless there is an independent domain meaning.

## 11. State machines over boolean soup

If several booleans define mutually exclusive workflow states, replace them with a discriminated union/state machine.

Bad:

```text
isLoading
isReady
isFailed
isDisconnected
isReconnecting
```

when only one can be true.

Prefer one explicit state whose legal transitions can be reviewed and tested.

## 12. Functions

Functions should have one coherent responsibility.

Starting review budgets, to be enforced only when tooling exists:

```text
function length: warning > 40 lines, hard review > 80
nesting depth: target <= 3
cyclomatic complexity: warning > 8, hard review > 12
positional parameters: target <= 3
```

These are signals, not reasons to split code arbitrarily.

Prefer an options object/context when many parameters represent one operation.

## 13. Files/modules

Starting review budgets:

```text
file length: warning > 250 lines, hard review > 500
```

Generated files are exempt.

A long cohesive file can occasionally be better than five fragments. The reviewer should optimize for semantic boundaries and discoverability rather than chasing line metrics.

## 14. Naming

Names should reveal domain intent.

Avoid vague names:

```text
data
info
manager
handler
helper
thing
item2
process
```

unless the surrounding domain makes the meaning genuinely obvious.

Use consistent suffixes where they carry architectural meaning:

```text
*.system.ts
*.component.ts
*.hook.ts / use-*.ts
*.service.ts
*.adapter.ts
*.schema.ts
*.config.ts
*.constants.ts
```

The exact repository convention should be automated once the project layout is implemented.

## 15. Events and callbacks

Prefer typed domain actions/events over anonymous chains of callbacks crossing layers.

Do not create arbitrary string event names inline.

Event payloads have explicit types.

Listeners/subscriptions must have clear lifecycle cleanup.

## 16. Async code

All promises must be intentionally handled.

Do not silently swallow errors.

At a boundary, choose one:

- recover;
- convert to a typed/domain error;
- report and rethrow;
- propagate to an owner that is documented to handle it.

Avoid broad `catch {}`.

Retry policies, backoff, and timeouts are configuration with named values, not repeated literals.

## 17. Errors

Use domain-specific errors/results when callers need to branch on failure reason.

Do not make callers parse human-readable error messages.

Bad:

```ts
if (error.message.includes("room full")) { ... }
```

Prefer:

```ts
if (error.code === ACTIVITY_ERROR_CODES.ROOM_FULL) { ... }
```

User-facing copy is presentation responsibility.

## 18. Side effects

Keep side effects at boundaries.

Pure domain logic should not directly:

- fetch;
- mutate storage;
- send analytics;
- access DOM;
- read uncontrolled clocks/randomness.

Use explicit services/adapters/context boundaries.

## 19. Logging

Do not leave ad-hoc `console.log` debugging in committed code.

Use the platform logger once defined.

Log events should use stable fields/categories rather than interpolated prose where structured querying matters.

Never log secrets/auth tokens/private payloads.

## 20. Comments

Prefer code that expresses intent without commentary.

Useful comments explain:

- why a non-obvious constraint exists;
- protocol/spec quirks;
- performance trade-offs;
- temporary architecture exceptions with a follow-up.

Bad comments merely restate syntax.

Do not use comments to excuse unclear architecture.

## 21. TODO/FIXME policy

Do not introduce an untracked `TODO`/`FIXME` as a substitute for completing the requested change.

If deferred work is legitimate, associate it with an issue/explicit follow-up and explain why it is outside the current scope.

## 22. Dependencies

Before adding a dependency:

1. search for existing project capability;
2. confirm the standard library/current dependencies do not solve it adequately;
3. document why the dependency is preferable;
4. consider bundle/runtime/server impact;
5. verify license/security/maintenance suitability.

Do not add an npm package for a tiny helper that is simpler and safer to implement locally.

## 23. Public APIs

Minimize public exports.

Do not export internals “in case another module needs them later”.

If an API is shared, document its semantics and test its contract.

Changing a shared public contract is an architecture-significant change and requires reviewer attention.

## 24. Tests

Prefer behavioural tests with named fixtures/builders over opaque literal setup.

Tests may use convenient explicit fixture literals when they improve readability; do not mirror production constant extraction mechanically.

Avoid snapshot tests as the sole verification of important gameplay/domain behaviour.

## 25. No copy-paste variants

When tempted to duplicate a block and edit it:

- stop;
- determine whether there is a shared semantic operation;
- search the repo;
- extract/extend only if the abstraction is coherent.

Copy-paste is allowed only for intentionally independent data/examples/tests where abstraction would reduce clarity.

## 26. Final self-review questions

Before handoff, the implementation agent asks:

- Did I introduce any domain-significant raw strings/numbers?
- Did I create state that already has another owner?
- Did I create a helper/hook/system that already exists semantically?
- Did a component become an orchestrator instead of presentation?
- Did I use boolean flags where a state machine is clearer?
- Did I weaken types to make the task easier?
- Did I add a dependency or public API unnecessarily?
- Is any side effect happening in the wrong layer?
- Can the next agent discover and reuse what I added?
