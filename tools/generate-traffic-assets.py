#!/usr/bin/env python3
"""Generate compact Blender-compatible GLB placeholders without Blender.

The execution environment does not ship Blender/bpy, so this script uses trimesh
for deterministic geometry generation. The exported GLBs can be opened and
edited in Blender and are intended to be replaced or refined through Blender MCP.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "games/traffic-jam/runtime/assets/models"
PROVENANCE_PATH = ROOT / "games/traffic-jam/runtime/assets/provenance.json"

COLORS = {
    "body": [255, 111, 97, 255],
    "body_dark": [182, 68, 61, 255],
    "glass": [42, 81, 94, 255],
    "tire": [29, 34, 35, 255],
    "rim": [188, 198, 197, 255],
    "light": [255, 244, 203, 255],
    "shirt": [59, 130, 246, 255],
    "pants": [38, 55, 77, 255],
    "skin": [230, 173, 128, 255],
    "hair": [87, 61, 43, 255],
}


def material(name: str, rgba: Iterable[int], *, metallic: float = 0.0, roughness: float = 0.7) -> trimesh.visual.material.PBRMaterial:
    return trimesh.visual.material.PBRMaterial(
        name=name,
        baseColorFactor=np.asarray(tuple(rgba), dtype=np.uint8),
        metallicFactor=metallic,
        roughnessFactor=roughness,
    )


def add_mesh(
    scene: trimesh.Scene,
    mesh: trimesh.Trimesh,
    *,
    name: str,
    rgba: Iterable[int],
    transform: np.ndarray | None = None,
    metallic: float = 0.0,
    roughness: float = 0.7,
) -> None:
    mesh.visual = trimesh.visual.TextureVisuals(
        material=material(name, rgba, metallic=metallic, roughness=roughness),
    )
    scene.add_geometry(mesh, node_name=name, geom_name=name, transform=transform)


def translation(x: float, y: float, z: float) -> np.ndarray:
    matrix = np.eye(4)
    matrix[:3, 3] = (x, y, z)
    return matrix


def rotation_x(angle: float) -> np.ndarray:
    matrix = np.eye(4)
    matrix[:3, :3] = trimesh.transformations.rotation_matrix(angle, (1, 0, 0))[:3, :3]
    return matrix


def compose(*matrices: np.ndarray) -> np.ndarray:
    result = np.eye(4)
    for matrix in matrices:
        result = result @ matrix
    return result


def create_compact_car() -> trimesh.Scene:
    scene = trimesh.Scene(base_frame="compact_car")

    add_mesh(
        scene,
        trimesh.creation.box(extents=(1.5, 3.2, 0.55)),
        name="car_body",
        rgba=COLORS["body"],
        transform=translation(0, 0, 0.62),
        roughness=0.52,
        metallic=0.06,
    )
    add_mesh(
        scene,
        trimesh.creation.box(extents=(1.32, 1.55, 0.52)),
        name="car_cabin",
        rgba=COLORS["glass"],
        transform=translation(0, -0.18, 1.04),
        roughness=0.2,
        metallic=0.15,
    )
    add_mesh(
        scene,
        trimesh.creation.box(extents=(1.18, 1.28, 0.11)),
        name="car_roof",
        rgba=COLORS["body"],
        transform=translation(0, -0.18, 1.35),
        roughness=0.52,
        metallic=0.06,
    )
    add_mesh(
        scene,
        trimesh.creation.box(extents=(1.28, 0.75, 0.12)),
        name="car_hood",
        rgba=COLORS["body_dark"],
        transform=translation(0, 1.08, 0.93),
        roughness=0.6,
        metallic=0.04,
    )

    wheel_positions = (
        (-0.78, -1.03, 0.4),
        (0.78, -1.03, 0.4),
        (-0.78, 1.03, 0.4),
        (0.78, 1.03, 0.4),
    )
    for index, (x, y, z) in enumerate(wheel_positions):
        wheel_transform = compose(translation(x, y, z), rotation_x(np.pi / 2))
        add_mesh(
            scene,
            trimesh.creation.cylinder(radius=0.31, height=0.18, sections=16),
            name=f"wheel_{index}",
            rgba=COLORS["tire"],
            transform=wheel_transform,
            roughness=0.86,
        )
        add_mesh(
            scene,
            trimesh.creation.cylinder(radius=0.14, height=0.19, sections=16),
            name=f"rim_{index}",
            rgba=COLORS["rim"],
            transform=wheel_transform,
            roughness=0.35,
            metallic=0.55,
        )

    for index, x in enumerate((-0.42, 0.42)):
        add_mesh(
            scene,
            trimesh.creation.box(extents=(0.28, 0.09, 0.12)),
            name=f"headlight_{index}",
            rgba=COLORS["light"],
            transform=translation(x, 1.64, 0.71),
            roughness=0.3,
        )
    return scene


def create_passenger() -> trimesh.Scene:
    scene = trimesh.Scene(base_frame="passenger")

    add_mesh(
        scene,
        trimesh.creation.cylinder(radius=0.27, height=0.72, sections=12),
        name="passenger_torso",
        rgba=COLORS["shirt"],
        transform=translation(0, 0, 1.05),
        roughness=0.68,
    )
    add_mesh(
        scene,
        trimesh.creation.icosphere(subdivisions=2, radius=0.25),
        name="passenger_head",
        rgba=COLORS["skin"],
        transform=translation(0, 0, 1.62),
        roughness=0.82,
    )
    add_mesh(
        scene,
        trimesh.creation.uv_sphere(radius=0.255, count=(12, 8)),
        name="passenger_hair",
        rgba=COLORS["hair"],
        transform=compose(translation(0, 0, 1.71), np.diag((1.0, 1.0, 0.46, 1.0))),
        roughness=0.9,
    )

    for index, x in enumerate((-0.13, 0.13)):
        add_mesh(
            scene,
            trimesh.creation.cylinder(radius=0.085, height=0.62, sections=10),
            name=f"leg_{index}",
            rgba=COLORS["pants"],
            transform=translation(x, 0, 0.41),
            roughness=0.78,
        )
    for index, x in enumerate((-0.36, 0.36)):
        arm = trimesh.creation.cylinder(radius=0.065, height=0.58, sections=10)
        transform = compose(
            translation(x, 0, 1.08),
            trimesh.transformations.rotation_matrix(
                (-0.12 if x < 0 else 0.12),
                (0, 1, 0),
            ),
        )
        add_mesh(
            scene,
            arm,
            name=f"arm_{index}",
            rgba=COLORS["shirt"],
            transform=transform,
            roughness=0.68,
        )
    return scene


def export_scene(scene: trimesh.Scene, filename: str) -> dict[str, object]:
    output_path = OUTPUT_DIR / filename
    output_path.write_bytes(scene.export(file_type="glb"))
    loaded = trimesh.load(output_path, force="scene")
    mesh_count = len(loaded.geometry)
    triangle_count = sum(len(mesh.faces) for mesh in loaded.geometry.values())
    bounds = loaded.bounds.tolist()
    return {
        "path": str(output_path.relative_to(ROOT)),
        "generator": "trimesh procedural GLB generator",
        "blender_compatible": True,
        "mesh_count": mesh_count,
        "triangle_count": triangle_count,
        "bounds": bounds,
        "license": "project-authored",
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    assets = [
        export_scene(create_compact_car(), "compact-car.glb"),
        export_scene(create_passenger(), "passenger.glb"),
    ]
    PROVENANCE_PATH.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "note": "Blender is not installed in the execution container; these GLBs were generated with trimesh and can be opened/refined in Blender.",
                "assets": assets,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    for asset in assets:
        print(json.dumps(asset, ensure_ascii=False))


if __name__ == "__main__":
    main()
