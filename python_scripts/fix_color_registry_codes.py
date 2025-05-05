#!/usr/bin/env python3
"""Fix Yuzu colour registry keys by padding numeric part to 3 digits.

Problem
-------
Colour codes extracted via OCR sometimes drop leading zeroes – e.g. *GR027*
may appear as *GR27*.  This script loads `yuzu/mappings/color_registry.json`,
renames any keys whose numeric suffix is 1–2 digits to a 3-digit form, and
writes the corrected mapping back **in-place** (or to a new file if you pass
`--out`).

It does *not* attempt to rename the JPEG files on disk; the `file` path inside
each entry is preserved so existing filenames continue to work.

Usage
-----
$ uv run scripts/fix_color_registry_codes.py            # overwrite registry
$ uv run scripts/fix_color_registry_codes.py --dry-run  # just preview changes
$ uv run scripts/fix_color_registry_codes.py --out yuzu/mappings/color_registry_fixed.json
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = ROOT / "yuzu" / "mappings" / "color_registry.json"

CODE_RE = re.compile(r"^([A-Z]{2})(\d+)$")
I_MIS_OCR_RE = re.compile(r"^([A-Z]{2})I(\d+)$")


def normalize_code(code: str) -> str:
    """Return canonicalised code: fix 'I'→'1' error then pad digits."""
    # Step 1: Correct mis-OCR: two letters + 'I' mistaken for '1'.
    m_i = I_MIS_OCR_RE.match(code)
    if m_i:
        prefix, digits = m_i.groups()
        code = f"{prefix}1{digits}"

    # Step 2: Pad numeric part to 3 digits where applicable.
    m = CODE_RE.match(code)
    if not m:
        return code  # leave unchanged if not matching expected pattern
    prefix, digits = m.groups()
    if len(digits) >= 3:
        return code
    return f"{prefix}{int(digits):03d}"


def pad_code(code: str) -> str:
    """Return code with numeric suffix left-padded to 3 digits (if matched)."""
    m = CODE_RE.match(code)
    if not m:
        return code  # leave unchanged if pattern not matched
    prefix, num = m.groups()
    # Only pad if <3 digits; else leave as is.
    if len(num) >= 3:
        return code
    return f"{prefix}{int(num):03d}"


def main() -> None:  # noqa: D401
    parser = argparse.ArgumentParser(description="Pad numeric part of colour codes to 3 digits.")
    parser.add_argument("--out", type=Path, default=REGISTRY_PATH, help="Output JSON path (default: overwrite input)")
    parser.add_argument("--dry-run", action="store_true", help="Print remappings without writing file")
    args = parser.parse_args()

    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        registry: dict[str, dict] = json.load(f)

    remapped: dict[str, dict] = {}
    changed: list[tuple[str, str]] = []

    for code, entry in registry.items():
        new_code = normalize_code(code)
        if new_code in remapped:
            print(f"[warn] duplicate after padding: {code} -> {new_code}; keeping first occurrence")
            continue
        if new_code != code:
            changed.append((code, new_code))
        remapped[new_code] = entry

    changed.sort()

    if args.dry_run:
        print(f"Would rename {len(changed)} codes:")
        for old, new in changed:
            print(f"  {old} -> {new}")
        print("Dry-run complete; no file written.")
        return

    with open(args.out, "w", encoding="utf-8") as f_out:
        json.dump(remapped, f_out, indent=2, sort_keys=True)

    if args.out == REGISTRY_PATH:
        print(f"[ok] registry overwritten – {len(changed)} codes padded.")
    else:
        print(f"[ok] wrote fixed registry to {args.out.relative_to(ROOT)} – {len(changed)} codes padded.")


if __name__ == "__main__":
    main() 