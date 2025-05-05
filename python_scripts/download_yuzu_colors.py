import os
import re
import requests
from pathlib import Path


# Paths
HTML_FILE = Path(__file__).resolve().parent.parent / "yuzu" / "sample_colors.html"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "yuzu" / "keycaps"

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Read HTML content
with open(HTML_FILE, "r", encoding="utf-8", errors="ignore") as f:
    html = f.read()

# Regex to capture img src URLs
img_urls = re.findall(r'<img[^>]+src="([^"]+)"', html)
print(f"Found {len(img_urls)} <img> tags.")

unique_urls = sorted(set(img_urls))
print(f"Unique image URLs: {len(unique_urls)}")

for url in unique_urls:
    filename = url.split("/")[-1].split("?")[0]  # remove query params if any
    output_path = OUTPUT_DIR / filename

    if output_path.exists():
        print(f"[skip] {filename} already exists")
        continue

    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        with open(output_path, "wb") as out_file:
            out_file.write(resp.content)
        print(f"[done] {filename}")
    except Exception as e:
        print(f"[error] Failed to download {url}: {e}") 