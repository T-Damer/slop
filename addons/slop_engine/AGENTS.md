# AGENTS.md

## Scope
Owns the reusable Godot runtime package: plugin registry, lightweight ECS projection, client session gateway, and engine metadata.

## Rules
- Web Compatibility and GDScript are mandatory for runtime code.
- This addon does not contain concrete game rules or hub behavior.
- Components remain data-only; systems own projection/presentation behavior.
- Network/local gateways expose the same command/snapshot contract.
- All identifiers, UI-independent timings, and messages come from registry owners.
- Keep APIs small; a game requests capabilities instead of importing internals opportunistically.
