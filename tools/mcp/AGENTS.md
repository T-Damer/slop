# AGENTS.md

## Scope

Developer-only MCP installation and configuration for Godot and Blender.

## Hard rules

- MCP code is tooling, never a runtime dependency of games or the server.
- Versions and source commits are pinned in `.slop/mcp-tools.json`.
- Do not place credentials, tokens, or private endpoints in repository config.
- Do not edit installed third-party addon code to patch project behavior.
- Generated meshes, scenes, materials, and audio still pass project validation.
- Product builds must remain reproducible when neither MCP server is running.

## Validation

- Keep `.mcp.json`, the installer, and `.slop/mcp-tools.json` consistent.
- Re-review license, release notes, and compatibility before changing a pin.
- Godot MCP owns editor/scene/playtest automation.
- Blender MCP owns mesh/material/rig/export automation.
