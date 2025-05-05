import json
import re
from pathlib import Path

import numpy as np
from PIL import Image


def sample_color(image: Image.Image) -> tuple[int, int, int]:
    """Sample average RGB color from a fixed region (x 70-170, y 25-80)."""
    # Ensure region within bounds
    width, height = image.size
    left = min(70, width - 1)
    right = min(170, width)
    top = min(25, height - 1)
    bottom = min(80, height)
    region = image.crop((left, top, right, bottom))
    arr = np.array(region)
    # Flatten and compute median to reduce outliers/noise
    median = np.median(arr.reshape(-1, 3), axis=0)
    return tuple(int(x) for x in median)


def main():
    keycaps_dir = Path(__file__).resolve().parent.parent / "yuzu" / "keycaps"
    registry_path = Path(__file__).resolve().parent.parent / "yuzu" / "color_registry.json"
    
    registry = {}

    # Find all image files with name pattern that looks like a color code (letters followed by digits)
    color_file_pattern = re.compile(r'^[A-Z]{1,3}[0-9]{1,3}\.jpg$')
    
    # Process each keycap file
    for img_path in sorted(keycaps_dir.glob("*.jpg")):
        if not color_file_pattern.match(img_path.name):
            print(f"[skip] {img_path.name} doesn't match color code pattern")
            continue
            
        # Extract color code from filename
        color_code = img_path.stem  # filename without extension
        
        try:
            img = Image.open(img_path)
            rgb = sample_color(img)
            
            registry[color_code] = {
                "file": str(img_path.relative_to(keycaps_dir.parent.parent)),
                "rgb": list(rgb)
            }
            print(f"[ok] {color_code} -> {rgb}")
        except Exception as e:
            print(f"[error] Failed to process {img_path.name}: {e}")
    
    # Save registry
    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2, sort_keys=True)
    
    print(f"Saved registry with {len(registry)} entries to {registry_path.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main() 