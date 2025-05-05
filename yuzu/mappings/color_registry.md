# Yuzu Color Registry

This file documents **what the color registry is**, **how it is produced**, and **how to use it** when converting arbitrary artwork into a set of Yuzu–compatible key-cap colours.

---

## 1. What is the registry?

`yuzu/color_registry.json` is a machine-readable catalogue of every colour that the YuzuKeyCaps designer recognises.

```jsonc
{
  "BL31": {
    "file": "yuzu/keycaps/BL31.jpg",  // 256×256 JPEG photograph of the key-cap
    "rgb":  [101, 182, 234]            // Reference colour sampled from the cap‟s top face
  },
  "GR001": {
    "file": "yuzu/keycaps/GR001.jpg",
    "rgb":  [ 39,  39,  39]
  },
  …
}
```

Each top-level key is the **official Yuzu colour code** printed on the physical cap (e.g. `BL31`, `GR001`).  The JSON object contains:

| Field | Description |
|-------|-------------|
| `file` | Relative path to the original JPEG picture – handy for previewing the swatch or re-sampling if needed. |
| `rgb`  | A three-element list `[R, G, B]` giving the representative colour of the cap (see §2). |

The file currently lists **315 colours**, covering the entire palette exposed by the web designer.

---

## 2. How is it built?

1. **OCR & rename** – `scripts/process_yuzu_colors.py`
   * Takes the raw image dump (whose filenames were random numeric IDs) and, using Tesseract/GPT-4o OCR, renames them to `<COLORCODE>.jpg`.

2. **Sampling & registry** – `scripts/build_color_registry.py`
   * Scans every `*.jpg` whose filename matches the regex `/^[A-Z]{1,3}[0-9]{1,3}$/`.
   * Samples the *median* RGB value inside the rectangle **x ∈ [70‥170], y ∈ [25‥80]**.  This window lies on the flat top surface of the photographed key-cap, avoiding shadows and legends.
   * Writes the mapping to `yuzu/color_registry.json`.

Re-building after adding newer photos is just:

```bash
uv run scripts/build_color_registry.py   # regenerates the JSON
```

---

## 3. Using the registry in the image-to-key-cap pipeline

When an agent receives a user-supplied picture, it must quantise each pixel (or averaged key-cap region) onto the discrete Yuzu palette.  The steps are:

1. **Load the palette**

```python
import json, numpy as np

with open("yuzu/color_registry.json") as f:
    palette = json.load(f)

codes  = list(palette.keys())                      # ["BL31", "GR001", …]
colors = np.array([palette[c]["rgb"] for c in codes])  # shape (315, 3)
```

2. **Convert to perceptual colour space (recommended)**
   RGB Euclidean distance is *okay* but perceptually uneven.  Converting to CIELab or OKLab gives better nearest-neighbour matches.

```python
from skimage import color  # or use colourscience / coloursys
lab_palette = color.rgb2lab(colors[np.newaxis]/255.0)[0]
```

3. **For each key-cap region of the user image**
   * Compute the average colour.
   * Convert it to the same colour space (`lab_target`).
   * Find the index of the nearest palette entry:

```python
idx = np.linalg.norm(lab_palette - lab_target, axis=1).argmin()
nearest_code  = codes[idx]
nearest_color = palette[nearest_code]["rgb"]
```

4. **Produce Yuzu JSON**
   Use the `nearest_code` when filling the `customizedColor` section of Yuzu's import format.

---

## 4. Tips & extensions

* **Cache conversions** for speed – pre-compute the Lab palette once.
* **Tie-breakers** – if two colours are very close, favour the one already used in the same row to create visually coherent sets.
* **Custom colours** – Yuzu allows a limited number of user-defined colours; unused registry slots can be repurposed if you decide to synthesise custom dyes.

---

Happy colour-mapping! Feel free to update the registry whenever Yuzu introduces new swatches – just drop the new cap photos into `yuzu/keycaps/` and rerun the builder script. 