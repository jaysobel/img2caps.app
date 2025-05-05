import argparse
from pathlib import Path
from PIL import Image, ImageOps
import os  # Import os for path operations

# --- Constants -------------------------------------------------------------
# Get the workspace root assuming the script is in python_scripts/
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = WORKSPACE_ROOT / "public" / "images"
DEFAULT_DEST = WORKSPACE_ROOT / "public" / "images"
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
SIZE_THRESHOLD_KB = 800


# --- Helpers ---------------------------------------------------------------

def optimise_image(src_path: Path, dest_dir: Path, max_width: int) -> None:
    """Resize *and* optimise a single image file.

    The resulting file uses the same filename & extension, written to *dest_dir*.
    Only processes if the image is larger than SIZE_THRESHOLD_KB *and* wider
    than *max_width*. Otherwise, skips the file.
    """
    if src_path.suffix.lower() not in ALLOWED_EXTS:
        print(f"[SKIP] Unsupported extension: {src_path.name}")
        return

    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / src_path.name

    try:
        file_size = src_path.stat().st_size
    except FileNotFoundError:
        print(f"[ERROR] File not found: {src_path}")
        return

    with Image.open(src_path) as im:
        im_copy = im.copy() # Keep original metadata by working on a copy initially

    im_copy = ImageOps.exif_transpose(im_copy)  # honour EXIF orientation
    orig_w, orig_h = im_copy.size

    # Skip if already optimized (size and width below thresholds)
    size_kb = file_size / 1024
    if size_kb < SIZE_THRESHOLD_KB and orig_w <= max_width:
        print(
            f"[SKIP]   Already optimized: {src_path.name} "
            f"({size_kb:.0f} KB, {orig_w}px)"
        )
        return

    im_to_save = im_copy # Use the potentially orientation-corrected image

    # Resize if necessary
    resized = False
    if orig_w > max_width:
        new_h = int(orig_h * max_width / orig_w)
        im_to_save = im_to_save.resize((max_width, new_h), Image.LANCZOS)
        print(f"[RESIZE] {src_path.name}: {orig_w}→{max_width}px ({size_kb:.0f} KB)")
        resized = True
    else:
        print(f"[RETAIN] {src_path.name}: width {orig_w}px ({size_kb:.0f} KB)")


    # Choose save params based on format
    suffix = dest_path.suffix.lower()
    save_kwargs = {"optimize": True}

    if suffix in {".jpg", ".jpeg", ".webp"}:
        save_kwargs["quality"] = 85  # good quality/size trade-off

    # Ensure RGB for formats that don't support alpha
    if suffix in {".jpg", ".jpeg", ".webp"} and im_to_save.mode in {"RGBA", "P"}:
        im_to_save = im_to_save.convert("RGB")

    # Only save if we actually resized or if the format needed conversion/optimization pass
    # This avoids unnecessary writes if the image was only skipped due to size/width but needed no changes
    if resized or (im_to_save.mode != im.mode) or (suffix not in {".jpg", ".jpeg", ".webp"}): # Save PNGs too for optimize=True
        # Let Pillow infer the format from the file extension to avoid KeyError
        im_to_save.save(dest_path, **save_kwargs)
        new_size_kb = dest_path.stat().st_size / 1024
        print(f"[SAVE]   → {dest_path.relative_to(WORKSPACE_ROOT)} ({new_size_kb:.0f} KB)")
    elif not resized:
         print(f"[SKIP]   No changes needed for {src_path.name}")


# --- CLI -------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Resize and optimise sample images for the web.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="Source images directory")
    parser.add_argument("--dest", type=Path, default=DEFAULT_DEST, help="Destination directory")
    parser.add_argument("--max-width", type=int, default=1000, help="Maximum width in pixels")
    args = parser.parse_args()

    # Ensure paths are absolute for consistency
    source_dir = args.source.resolve()
    dest_dir = args.dest.resolve()

    if not source_dir.is_dir():
        # Use exists() for flexibility, is_dir() ensures it's a directory
        parser.error(f"Source directory does not exist or is not a directory: {source_dir}")

    print(f"Source: {source_dir.relative_to(WORKSPACE_ROOT)}")
    print(f"Dest:   {dest_dir.relative_to(WORKSPACE_ROOT)}")
    print(f"Max W:  {args.max_width}px, Size Threshold: {SIZE_THRESHOLD_KB}KB")
    print("-" * 20)

    total = 0
    for file_path in source_dir.iterdir():
         if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTS:
            total += 1
            try:
                 # Pass resolved absolute paths
                 optimise_image(file_path, dest_dir, args.max_width)
            except Exception as e:
                 print(f"[ERROR] Processing {file_path.name}: {e}")

    print("-" * 20)
    print(f"\nChecked {total} image file(s) in the source directory.")


if __name__ == "__main__":
    main() 