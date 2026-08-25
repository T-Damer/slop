# Repository workflow policy

## Hard rules

- At most five branches exist at once.
- `main` and `stable` are permanent.
- At most three feature branches exist.
- At most three pull requests are open.
- Feature branches must own disjoint path/responsibility zones.
- Overlapping work belongs to one broader branch and one coordinated task plan.
- `main` contains reviewed code; it does not automatically publish.
- only `stable` automatically publishes/deploys.

The machine-readable source is `.slop/repository-policy.json`.

## Before creating a branch or PR

1. list live branches and open PRs;
2. read the policy file;
3. identify the exact responsibility and allowed paths;
4. compare it with every active feature zone;
5. reuse/expand the existing branch when responsibilities overlap;
6. reject creation when a limit would be exceeded.

## Feature-zone examples

Independent:

```text
foundation/runtime -> addons, packages, server, tools
social-shell       -> web shell, chat, activity routing
content-factory    -> reference lab, asset generation and validation
```

Not independent:

```text
traffic-rules
turn-engine-refactor
server-command-validation
```

All three modify one deterministic-session responsibility and should be planned
on one branch.

## Stable promotion

Promotion is an explicit merge/update from reviewed `main` to `stable`. The
stable workflow runs all checks again before publishing. Do not push experimental
work directly to `stable`.
