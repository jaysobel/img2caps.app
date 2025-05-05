import base64
import re
from pathlib import Path
import argparse
import io

from PIL import Image
from openai import OpenAI
import dotenv
import os

dotenv.load_dotenv()

client = OpenAI(
    api_key=os.getenv("openai_api_key"),
    organization=os.getenv("openai_organization_id"),
)


def extract_code(image: Image.Image) -> str | None:
    """Return alphanumeric keycap code via OCR, trying multiple configs."""        
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    base64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that extracts alphanumeric keycap codes from images."},
            {
                "role": "user",
                "content": [
                    { "type": "text", "text": "The following image shows a keycap from a keyboard with a code printed on it. Read the code and return it as a string. Do not say anything else. Image: " },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}",
                        },
                    },
                ],
            }
        ],
    )
    return completion.choices[0].message.content.strip().upper()


def main():
    parser = argparse.ArgumentParser(description="Process Yuzu keycap images - performs OCR and renames files")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N images (for testing).")
    args = parser.parse_args()

    keycaps_dir = Path(__file__).resolve().parent.parent / "yuzu" / "keycaps"

    # Get all numeric-named images to process
    images = [img for img in sorted(keycaps_dir.glob("*.jpg")) 
              if img.stem.isdigit() or img.stem.startswith("172")]
    
    if args.limit is not None:
        images = images[: args.limit]

    print(f"Found {len(images)} numeric-named images to process")

    for img_path in images:
        try:
            img = Image.open(img_path)
        except Exception as e:
            print(f"[skip] Could not open {img_path.name}: {e}")
            continue

        code = extract_code(img)
        if code is None:
            print(f"[warn] No code detected in {img_path.name}")
            continue

        new_filename = f"{code}.jpg"
        new_path = img_path.with_name(new_filename)

        if not new_path.exists():
            print(f"[rename] {img_path.name} -> {new_filename}")
            img_path.rename(new_path)
        else:
            if img_path != new_path:
                print(f"[cleanup] Removing duplicate {img_path.name} (already have {new_filename})")
                img_path.unlink()


if __name__ == "__main__":
    main() 