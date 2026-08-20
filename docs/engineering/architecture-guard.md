# Architecture Guard

## Purpose

`AGENTS.md` is not enough. AI agents can forget rules, interpret them differently, or optimize for a local task. The repository therefore intends to convert important architecture rules into machine-enforced checks.

This document describes the target enforcement model. Tooling mentioned here is **planned until the corresponding configuration/scripts exist in the repository**.

## 1. Guard layers

The intended guard stack is:

```text
Biome / formatter + generic lint
        ↓
project-specific structural lint
        ↓
dependency graph validation
        ↓
dead-code / unused export validation
        ↓
slop-specific AST/domain guard
        ↓
tests / typecheck
        ↓
independent reviewer
```

No single tool is expected to understand the whole architecture.

## 2. Why a domain guard is needed

Generic lint can detect syntax/style problems, but it cannot reliably answer questions such as:

- did a system declare a component it writes?
- did a game reimplement an existing capability?
- is a raw string actually a platform event identifier?
- did shared runtime branch on a game ID?
- is authoritative simulation calling a forbidden side-effect API?
- did a UI component accumulate workflow state that should have another owner?

The project should eventually provide a small `game-guard`/`slop-guard` tool that understands repository conventions.

Do not build a new programming language. Operate on TypeScript/project metadata/AST and dependency information.

## 3. Proposed tooling responsibilities

### Biome

Use for:

- formatting;
- standard linting;
- import/style consistency;
- complexity/size rules where supported;
- custom structural lint rules where practical.

Custom plugin/rule support may be used for patterns that are syntactic and do not require whole-repository semantic analysis.

### Dependency graph tool

Use a dependency graph validator such as `dependency-cruiser` or an equivalent tool for rules such as:

```text
games/* !-> games/*
engine/simulation !-> presentation
shared packages !-> concrete games
contracts !-> implementation packages
no circular dependencies
```

The exact package should be selected when the initial project structure exists.

### Dead-code analysis

Use a tool such as Knip or an equivalent for:

- unused files;
- unused exports;
- unused dependencies;
- obsolete entrypoints after refactors.

### `slop-guard`

Custom TypeScript-aware validator for domain-specific rules that generic tools cannot express safely.

## 4. Guard principles

Rules should be:

- deterministic;
- fast enough for local use;
- explicit about why they failed;
- linked to canonical docs;
- narrow enough to avoid constant false positives;
- suppressible only through explicit documented exceptions.

A guard that developers/agents routinely disable is a failed guard.

## 5. Proposed rule catalogue

Rule IDs are provisional but should remain stable once implemented.

### `SLOP001` — forbidden cross-game import

A game implementation imports another game implementation.

```text
games/fishing → games/pool
```

Action: move genuinely shared behaviour into an approved shared capability or keep implementations independent.

### `SLOP002` — shared package imports concrete game

Shared runtime/SDK/platform contracts cannot depend on concrete game implementations.

### `SLOP003` — simulation imports presentation/UI

Authoritative/deterministic simulation cannot import UI, rendering, browser presentation, or framework component modules.

### `SLOP010` — forbidden simulation side effect

Simulation directly accesses APIs such as:

```text
Date.now
performance.now
Math.random
fetch
WebSocket
localStorage
IndexedDB
DOM APIs
analytics/payment SDKs
```

Approved runtime adapters/context are required.

### `SLOP011` — raw random source

Gameplay-affecting random generation bypasses the controlled RNG API.

### `SLOP012` — raw wall-clock timer

Authoritative simulation uses `setTimeout`/`setInterval` or raw wall-clock time for gameplay timing.

### `SLOP020` — component contains behaviour

An ECS component module contains methods/side-effectful behaviour instead of data/schema definitions.

The rule should be carefully defined to avoid rejecting harmless constructors/schema helpers.

### `SLOP021` — undeclared system read/write

A system accesses a component not declared in its metadata contract, once the runtime API supports static analysis of this pattern.

### `SLOP022` — shared system branches on game identity

Shared runtime code compares/switches on concrete game IDs to implement game-specific behaviour.

### `SLOP030` — raw domain identifier

An identifier category that must come from a typed registry appears as an inline string.

Candidate categories:

```text
events
commands
moments
network messages
game IDs
component IDs
system IDs
asset IDs
route IDs
storage keys
```

This rule should be context-aware. It must not reject arbitrary user-facing text/import paths.

### `SLOP031` — magic gameplay/config number

A domain-significant numeric value appears inline in a known gameplay/configuration context.

This rule should begin conservatively. Excessive false positives would encourage useless constant extraction.

### `SLOP040` — boolean workflow soup

A UI/controller unit has several related boolean states that appear to encode mutually exclusive workflow modes.

Initially this may be a warning/reviewer signal rather than a hard CI failure.

### `SLOP041` — component state complexity

A UI component exceeds the project threshold for coordinated local state/effects without a documented exception.

Suggested first heuristic:

```text
> 3 related local state hooks → warning/review required
```

Do not hard-fail solely on raw hook count until false-positive behaviour is understood.

### `SLOP042` — oversized semantic unit

Function/file complexity exceeds configured review budgets.

Initially warning-level:

```text
function > 40 lines
file > 250 lines
nesting > 3
cyclomatic complexity > 8
```

Potential hard-review thresholds:

```text
function > 80 lines
file > 500 lines
cyclomatic complexity > 12
```

Generated files are exempt.

### `SLOP050` — duplicate capability candidate

New helper/hook/system appears semantically or structurally similar to an existing registered capability.

This is difficult to enforce perfectly and may combine:

- capability metadata;
- names/imports;
- AST signatures;
- optional similarity reports for reviewer agents.

Treat false-positive-prone detection as reviewer evidence, not automatic rejection, until mature.

### `SLOP051` — third equivalent local implementation

A capability already appears in multiple locations and another equivalent implementation is added without a documented reason.

Hard failure once capability metadata is mature enough.

### `SLOP060` — untracked suppression

Broad lint/type/architecture suppression lacks the required structured exception comment/record.

### `SLOP061` — expired architecture exception

An exception with an expiry condition/date remains active after expiry.

### `SLOP070` — direct external data trust

Unvalidated external/network/persisted data enters trusted domain state through designated boundaries.

Likely requires schema conventions before implementation.

### `SLOP080` — unused replacement path

A refactor leaves obsolete exports/dependencies/old implementation paths detectable by dead-code tooling.

## 6. Magic-literal enforcement strategy

Do not implement the naive rule:

> every string and every number must be a constant.

That produces code such as:

```ts
const ZERO = 0;
const ONE = 1;
const DIV = "div";
```

which reduces readability and teaches agents to satisfy the checker instead of architecture.

Instead, enforce known semantic contexts.

Examples:

```ts
emit("fish.caught")             // reject: event identifier
send("activity:join")           // reject: protocol identifier
loadAsset("fish-blue")          // reject: asset identifier
setTimeout(retry, 3000)          // reject/review: timeout literal
if (distance < 2.5)              // reject/review in gameplay system
array[0]                         // allowed structural literal
count += 1                       // allowed structural arithmetic
```

The goal is named behaviour, not constant ceremony.

## 7. Capability metadata

To make reuse machine-checkable, shared capabilities should eventually expose canonical metadata.

Conceptual example:

```ts
export const CARRY_CAPABILITY = defineCapability({
  id: CAPABILITY_IDS.CARRY_OBJECT,
  components: [COMPONENT_IDS.CARRIER, COMPONENT_IDS.CARRYABLE],
  systems: [SYSTEM_IDS.CARRY],
  keywords: ["carry", "pickup", "held item", "attach"],
});
```

A generated registry can then help:

- agents search before implementation;
- reviewers discover nearby concepts;
- guard tools detect duplicate registrations;
- docs stay synchronized with code.

Avoid maintaining the same registry manually in multiple formats.

## 8. Architecture exceptions

A guard suppression must be structured and local.

Conceptual format:

```ts
// slop-allow SLOP010
// reason: external tournament clock is the authoritative source
// issue: #182
// expires: 2026-10-01
```

Exact syntax will be standardized when the guard exists.

Required fields should include:

- rule ID;
- reason;
- tracking issue/ADR for non-trivial exceptions;
- expiration/removal condition where practical.

Forbidden:

```text
eslint-disable
@ts-ignore
architecture-ignore-all
```

without the approved exception mechanism.

## 9. CI levels

Suggested stages:

### Fast local gate

Runs frequently:

```text
format check
lint
typecheck
architecture dependency rules
focused tests
```

### Full PR gate

Runs before acceptance:

```text
all fast checks
full tests
slop-guard
dead-code analysis
build
integration/e2e where applicable
```

### Optional expensive analysis

May run on shared-runtime changes or scheduled CI:

```text
duplicate/similarity report
bundle/performance checks
replay determinism suites
asset validation
```

## 10. Severity model

Rules should support at least:

- `error` — cannot be accepted;
- `warning` — requires reviewer inspection;
- `info` — discovery/reporting only.

Start uncertain heuristics as warnings. Promote them to errors only after they are reliable.

## 11. Error messages must teach the fix

Bad guard output:

```text
SLOP030 failed
```

Good:

```text
SLOP030: raw event identifier "fish.caught" in games/fishing/catch.system.ts.
Use the canonical GAME_EVENTS registry or register a new typed event if this is a new contract.
See docs/engineering/code-standards.md#3-no-magic-domain-strings-or-numbers
```

The guard should make the correct path easier than bypassing it.

## 12. Agent preflight integration

Once tooling exists, agents should be able to run a discovery command before coding, conceptually:

```text
pnpm guard:capability "carry item"
```

Output might include:

```text
Existing capability: carry-object
Components: Carrier, Carryable
System: CarrySystem
Docs: ...
Consumers: fishing, salvage
```

This is a target feature, not currently implemented.

## 13. Agent review integration

A review-oriented command may eventually produce a compact architecture report for a diff:

```text
pnpm guard:diff origin/main...HEAD
```

Potential output:

```text
new capabilities: 1
shared API changes: 0
new domain literals: 0
dependency violations: 0
duplicate candidates: 1 warning
architecture exceptions: 0
```

Reviewer agents can use this as evidence but should still inspect the diff.

## 14. Do not overbuild the guard first

Implementation order should follow real failures observed during prototypes.

Recommended starting enforcement:

1. strict TypeScript;
2. Biome/lint/format;
3. dependency boundaries/cycles;
4. dead-code analysis;
5. raw event/ID registries;
6. forbidden simulation side effects;
7. component/system metadata validation;
8. state/component complexity warnings;
9. capability duplication heuristics.

Do not spend months building a perfect static analyzer before the first vertical game slice exists.

## 15. Success criterion

The Architecture Guard succeeds when an implementation agent trying to create a convenient local patch receives a precise failure that points it toward the canonical reusable architecture.

It should make good code the path of least resistance.
