# AGENTS.md

## Scope
Owns reusable Godot presentation primitives shared by games: shell, status, action bar, loading/error/result patterns, and common layout tokens.

## Rules
- No concrete game rules or game-specific identifiers.
- Layout/copy/node identifiers come from `ui_registry.gd` or the calling game registry.
- Components render and emit explicit actions; controllers/gateways own workflows.
- Keep controls keyboard, pointer, and touch accessible.
- Avoid binary assets and heavy themes in the base package.
