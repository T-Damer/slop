# Parking Jam source assets

`models/compact-car.glb` and `models/passenger.glb` are project-authored low-poly source models.

The current execution container does not include Blender or `bpy`. They were generated deterministically with `tools/generate-traffic-assets.py` through `trimesh`, exported as standard GLB, and can be opened or refined in Blender or Blender MCP later.

Regenerate them with:

```bash
python tools/generate-traffic-assets.py
```

`provenance.json` records bounds, mesh count, triangle count, generator, and origin. Runtime code keeps the existing procedural models as a validated fallback until the authored-model loader is proven across web builds.
