# AGENTS.md

## Scope
Owns stable cross-runtime types, identifiers, errors, and schemas. No game rules or I/O.

## Rules
- Add only contracts used across a real boundary.
- Domain identifiers live in cohesive typed registries.
- No dependency on games, Godot presentation, Nakama, storage, or network code.
- Public changes require consumer/migration review and contract tests.
- Search existing contracts before adding another type or identifier.
