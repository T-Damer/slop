# MCP tooling

The project pins two developer-only MCP integrations:

- Godot MCP Toolkit for scene, node, script, editor, and playtest operations;
- Blender MCP for mesh, material, rigging, scene, and GLB export operations.

Pins and source provenance live in `.slop/mcp-tools.json`; client commands live in `.mcp.json`.

## Install

```bash
npm run mcp:install
```

Install only one side:

```bash
npm run mcp:install:godot
npm run mcp:install:blender
```

The Godot command copies the pinned editor addon into the ignored `addons/godot_mcp_toolkit/` directory. Enable it from **Project Settings → Plugins** after opening the editor. Do not commit the installed addon.

The Blender command requires `uv` and asks the pinned `blender-mcp` package to install its Blender addon. Enable the addon in Blender and start its server from the Blender MCP panel.

MCP tools are authoring helpers. Games, tests, exports, and server builds must work without them running.
