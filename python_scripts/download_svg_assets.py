#!/usr/bin/env python3
"""Download `/preview/*.webp` assets referenced in Yuzu keyboard SVG.

The Yuzu keyboard SVG embeds photographic keycap textures via patterns such as

    <image href="/preview/kam-white.webp" />

When we self-host the SVG we must also self-host those WebP files so the
browser doesn't request them from yuzukeycaps.com.

This script parses a given SVG, extracts every relative path that starts with
`/preview/`, downloads each file from `https://yuzukeycaps.com`, and saves it
into the project's local `preview/` directory (creating it if necessary).

Usage
-----
    python scripts/download_svg_assets.py yuzu/exported/yuzu_keyboard.svg

You can override the destination directory and base URL if needed:

    python scripts/download_svg_assets.py svg --dst static/preview --base https://example.com
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import requests


DEFAULT_BASE = "https://yuzukeycaps.com"


def find_preview_urls(svg_text: str) -> set[str]:
    """Return unique `/preview/*.webp` href paths in *svg_text*."""
    pattern = re.compile(r'href="(/preview/[^"\s]+)"')
    return set(match.group(1) for match in pattern.finditer(svg_text))


def download_assets(url_paths: set[str], base_url: str, dest_dir: Path) -> None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    for rel_path in sorted(url_paths):
        filename = Path(rel_path).name  # e.g. kam-white.webp
        dest_file = dest_dir / filename
        if dest_file.exists():
            print(f"✓ {filename} already present, skipping")
            continue
        full_url = urljoin(base_url, rel_path)
        print(f"⇣ Downloading {full_url} -> {dest_file}")
        resp = session.get(full_url, timeout=20)
        if resp.status_code != 200:
            print(f"  !! HTTP {resp.status_code} for {full_url}", file=sys.stderr)
            continue
        dest_file.write_bytes(resp.content)
        print(f"  saved {len(resp.content):,} bytes")


def main() -> None:
    p = argparse.ArgumentParser(description="Download /preview assets from keyboard SVG")
    p.add_argument("svg", type=Path, help="Path to the SVG to scan")
    p.add_argument("--dst", type=Path, default=Path("preview"), help="Local output directory (default: ./preview)")
    p.add_argument("--base", default=DEFAULT_BASE, help="Base URL to prepend to /preview paths")
    args = p.parse_args()

    if not args.svg.exists():
        p.error(f"SVG not found: {args.svg}")

    text = args.svg.read_text(encoding="utf-8")
    urls = find_preview_urls(text)
    if not urls:
        print("No /preview/ URLs found – nothing to do.")
        return

    print(f"Found {len(urls)} unique /preview assets.")
    download_assets(urls, args.base, args.dst)


if __name__ == "__main__":  # pragma: no cover
    main() 