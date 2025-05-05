#!/usr/bin/env python3
"""Generate a Yuzu key-cap colour design from an image.

Usage
-----
$ uv run scripts/generate_design_from_image.py images/starry_night.jpg output.json

The script assumes that the *entire* input image already matches the keyboard‟s
aspect ratio (i.e. it is the pre-selected region the user wants turned into
key-caps).  It will:
 1. Load `yuzu/mappings/key_position_registry.json` and `yuzu/mappings/color_registry.json`.
 2. For every key, compute its bounding box in pixel space.
 3. Extract the dominant colour of that region (avoiding simple averaging to
    preserve visually salient colours).
 4. Quantise that RGB colour to the nearest entry in the Yuzu palette.
 5. Fill `customizedColor` of the base import JSON (`yuzu/exported/yuzu_import_base.json`).
 6. Save the completed JSON to *output.json*.

Dependencies: pillow, numpy (already in requirements.txt).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
KEY_REGISTRY_PATH = ROOT / "yuzu" / "mappings" / "key_position_registry.json"
COLOR_REGISTRY_PATH = ROOT / "yuzu" / "mappings" / "color_registry.json"
BASE_JSON_PATH = ROOT / "yuzu" / "exported" / "yuzu_import_base.json"

# ───────────────────────────────────────── helper functions ──────────────────────────────

def load_key_registry() -> Dict[str, dict]:
    with open(KEY_REGISTRY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_color_registry():
    with open(COLOR_REGISTRY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def dominant_color(img: Image.Image, *, num_colors: int = 5) -> Tuple[int, int, int]:
    """Return the dominant RGB colour of *img*.

    Implementation uses Pillow's adaptive palette (median-cut algorithm) to
    quantise the image down to *num_colors* colours, then picks the most
    frequent one.
    """
    # Downsample a copy to speed up; 64×64 still captures colour composition well.
    small = img.copy().resize((64, 64))

    pal = small.convert("P", palette=Image.ADAPTIVE, colors=num_colors)
    # `getcolors` returns List[Tuple[count, palette_index]].  The max count is the dominant.
    palette = pal.getpalette()  # flat list [R0, G0, B0, R1, G1, B1, …]
    colors = pal.getcolors()
    if not colors:
        # Fallback: flat average if quantization failed (tiny image?)
        arr = np.array(small).reshape(-1, 3)
        return tuple(np.mean(arr, axis=0).astype(int))  # type: ignore[arg-type]

    dominant_index = max(colors, key=lambda t: t[0])[1]
    rgb = palette[dominant_index * 3 : dominant_index * 3 + 3]
    return tuple(rgb)  # type: ignore[return-value]


def rgb_distance(c1: Tuple[int, int, int], c2: Tuple[int, int, int]) -> float:
    """Simple Euclidean distance in RGB space."""
    return np.linalg.norm(np.array(c1, dtype=float) - c2)


def nearest_yuzu_color(rgb: Tuple[int, int, int], palette: Dict[str, dict]) -> str:
    """Return Yuzu colour code whose reference RGB is closest to *rgb*."""
    best_code = None
    best_dist = float("inf")
    for code, entry in palette.items():
        dist = rgb_distance(rgb, entry["rgb"])
        if dist < best_dist:
            best_dist = dist
            best_code = code
    assert best_code is not None
    return best_code


def build_keyboard_bbox_map(image: Image.Image, registry: Dict[str, dict]):
    """Compute pixel-space bounding boxes for every key.

    Returns dict[key_id] = (left, top, right, bottom).
    """
    # Compute conversion factor: units → pixels.
    total_width_u = max(key["right_u"] for key in registry.values())
    px_per_u: float = image.width / total_width_u

    bboxes: Dict[str, Tuple[int, int, int, int]] = {}
    for key_id, key in registry.items():
        x0 = int(key["left_u"] * px_per_u)
        y0 = int(key["top_u"] * px_per_u)  # same factor because units are square
        x1 = int(key["right_u"] * px_per_u)
        y1 = int(key["bottom_u"] * px_per_u)
        bboxes[key_id] = (x0, y0, x1, y1)
    return bboxes


# ─────────────────────────────────────────── main flow ───────────────────────────────────

def main():  # noqa: D401
    if len(sys.argv) != 3:
        print("Usage: generate_design_from_image.py <input_image> <output_json>")
        sys.exit(1)

    input_image_path = Path(sys.argv[1])
    output_json_path = Path(sys.argv[2])

    if not input_image_path.exists():
        print(f"[error] Input image '{input_image_path}' not found")
        sys.exit(1)

    # 1. Load resources.
    registry = load_key_registry()
    palette = load_color_registry()
    base_json = json.load(open(BASE_JSON_PATH, "r", encoding="utf-8"))

    # 2. Open image.
    img = Image.open(input_image_path).convert("RGB")

    # 3. Build bbox map.
    bbox_map = build_keyboard_bbox_map(img, registry)

    # 4. For every key, sample dominant colour & map to palette.
    customized_colors: Dict[str, str] = {}

    for key_id, bbox in bbox_map.items():
        crop = img.crop(bbox)
        dom_rgb = dominant_color(crop)
        yuzu_code = nearest_yuzu_color(dom_rgb, palette)
        customized_colors[key_id] = yuzu_code

    # 5. Fill base template and write.
    base_json["customizedColor"] = customized_colors

    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(base_json, f, indent=2, ensure_ascii=False)

    # Print a nice relative path if possible; fall back to absolute otherwise.
    try:
        rel_path = output_json_path.resolve().relative_to(Path.cwd().resolve())
        print(f"[ok] wrote Yuzu design to {rel_path}")
    except ValueError:
        print(f"[ok] wrote Yuzu design to {output_json_path.resolve()}")


if __name__ == "__main__":
    main() 