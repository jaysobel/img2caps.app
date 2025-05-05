#!/usr/bin/env python3
"""Flatten Yuzu keyboard SVG.

This helper converts the heavy, pattern-based keyboard SVG that ships with
Img2Caps into a lightweight variant that has no external `<image>`
dependencies.  It removes the `<defs>` block (which defines the photo
patterns) and replaces all `fill="url(#...)"` attributes with a flat colour
so the file can be embedded inline without triggering extra HTTP requests.

Usage
-----
    python scripts/flatten_keyboard_svg.py source.svg [dest.svg] [--fill "#cccccc"]

If *dest.svg* is omitted the script writes ``<source>_flat.svg`` next to the
input file.  The default replacement colour is ``#dddddd``.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path


def flatten_svg(input_svg: Path, output_svg: Path, fill: str = "#dddddd") -> None:
    """Convert *input_svg* to flat-coloured version at *output_svg*."""

    if not input_svg.exists():
        raise FileNotFoundError(input_svg)

    text = input_svg.read_text(encoding="utf-8")

    # 1. Remove the entire <defs>…</defs> section (patterns & masks).
    text = re.sub(r"<defs[\s\S]*?</defs>", "", text, count=1, flags=re.IGNORECASE)

    # 2. Replace any pattern fills with a solid placeholder colour.
    text = re.sub(r'fill="url\(#.*?\)"', f'fill="{fill}"', text)

    output_svg.write_text(text, encoding="utf-8")
    print(f"Flattened SVG saved to {output_svg}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Flatten Yuzu keyboard SVG.")
    parser.add_argument("input_svg", type=Path, help="Path to the source SVG with patterns")
    parser.add_argument(
        "output_svg",
        type=Path,
        nargs="?",
        help="Destination path for the flat SVG (defaults to <input>_flat.svg)",
    )
    parser.add_argument(
        "--fill",
        default="#dddddd",
        help="Hex colour to use for the base of each key (default: #dddddd)",
    )

    args = parser.parse_args()
    output = args.output_svg or args.input_svg.with_name(args.input_svg.stem + "_flat.svg")
    flatten_svg(args.input_svg, output, args.fill)


if __name__ == "__main__":  # pragma: no cover
    main() 