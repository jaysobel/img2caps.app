import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

# One keyboard "unit" is 19.05 mm (standard Cherry MX spacing)
UNIT_MM = 19.05


def parse_key_layout(html_path: Path) -> dict[str, dict]:
    """Parse Yuzu's key_layout.html and return registry mapping.

    The returned dict maps key_id -> metadata with x/y (units), width/height (units),
    and human-readable label.
    """
    with open(html_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    # First pass: gather raw key info to compute min x/y.
    raw: list[tuple[str, float, float, float, float, str | None]] = []
    min_x = float("inf")
    min_y = float("inf")

    # Elements representing keys have a `data-key-id` attribute.
    for elem in soup.find_all(attrs={"data-key-id": True}):
        key_id: str = elem["data-key-id"]
        try:
            x_u = float(elem.get("data-key-x", 0))
            y_u = float(elem.get("data-key-y", 0))
        except ValueError:
            x_u = float(re.findall(r"-?\d+\.\d+|-?\d+", elem.get("data-key-x", "0"))[0])
            y_u = float(re.findall(r"-?\d+\.\d+|-?\d+", elem.get("data-key-y", "0"))[0])

        # Track min for normalization later
        min_x = min(min_x, x_u)
        min_y = min(min_y, y_u)

        label = elem.get("data-key-labelid")

        rect = elem.find("rect")
        if rect is None:
            continue
        width_mm = float(rect["width"])
        height_mm = float(rect["height"])

        width_u = round(width_mm / UNIT_MM, 4)
        height_u = round(height_mm / UNIT_MM, 4)

        raw.append((key_id, x_u, y_u, width_u, height_u, label))

    # Second pass: build normalized registry
    registry: dict[str, dict] = {}

    for key_id, x_u, y_u, width_u, height_u, label in raw:
        # Offset so that top-left key starts at (0,0)
        norm_x = x_u - min_x
        norm_y = y_u - min_y

        entry = {
            "label": label,
            "x_u": x_u,
            "y_u": y_u,
            "width_u": width_u,
            "height_u": height_u,
            # Normalized (0,0) origin for imaging purposes
            "left_u": round(norm_x, 4),
            "top_u": round(norm_y, 4),
            "right_u": round(norm_x + width_u, 4),
            "bottom_u": round(norm_y + height_u, 4),
        }

        registry[key_id] = entry

    return registry


def validate_against_sample(registry: dict[str, dict], sample_json_path: Path) -> None:
    """Compare extracted keys with those referenced in sample_json.json and warn for missing."""
    if not sample_json_path.exists():
        print("[warn] sample_json.json not found – skipping validation.")
        return

    with open(sample_json_path, "r", encoding="utf-8") as f:
        sample = json.load(f)

    referenced_ids = set()
    for section in ("customizedColor", "customizedTemplate", "customizedContent"):
        referenced_ids.update(sample.get(section, {}).keys())

    missing = referenced_ids.difference(registry.keys())
    extra = set(registry.keys()).difference(referenced_ids)

    if missing:
        print(f"[error] {len(missing)} key IDs referenced in sample_json but not found in layout:")
        print(", ".join(sorted(missing)))
    else:
        print("[ok] All sample_json keys present in registry.")

    if extra:
        print(f"[info] {len(extra)} additional keys present in layout not referenced in sample_json.")


def main() -> None:
    base_dir = Path(__file__).resolve().parent.parent
    html_path = base_dir / "yuzu" / "key_layout.html"
    output_path = base_dir / "yuzu" / "key_position_registry.json"
    sample_json_path = base_dir / "yuzu" / "sample_json.json"

    registry = parse_key_layout(html_path)

    # Write registry JSON (sorted for stable diffs)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2, sort_keys=True)

    print(f"Saved {len(registry)} key positions to {output_path.relative_to(base_dir)}")

    # Validation step
    validate_against_sample(registry, sample_json_path)


if __name__ == "__main__":
    main() 