# AGENTS.md

## Scope
Owns fast repository/domain architecture checks that generic lint cannot express safely.

## Rules
- Prefer deterministic, narrow rules with actionable diagnostics.
- Hard-fail ownership/dependency violations; keep uncertain heuristics as warnings until calibrated.
- Never auto-suppress or silently rewrite product code.
- Every rule links to a stable code and canonical document.
- Ignore generated/test/reference material only through explicit path policy.
