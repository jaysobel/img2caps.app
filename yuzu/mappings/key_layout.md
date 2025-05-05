# Key Layout & Coordinate Systems

This document explains how the **key-position registry** ( `yuzu/key_position_registry.json` ) encodes each key's location/size and how to map those values onto an image's pixel grid when generating per-key artwork.

---
## 1. Keyboard Units (u)

Mechanical keyboards describe key sizes in **units**:

* `1u`  ≈ `19.05 mm`
* `1.25u` ≈ `23.8125 mm`
* `1.5u`  ≈ `28.575 mm`
* `2u`  ≈ `38.10 mm`
* … etc.

Every `<rect>` in `yuzu/key_layout.html` uses millimetres, but the script converts them to **unit space** so the numbers are easy to reason about ( `width_u`, `height_u` ).

---
## 2. Coordinate Systems

### 2.1 Raw coordinates ( `x_u`, `y_u` )
• These come straight from `data-key-x` and `data-key-y` attributes in the HTML.
• The origin sits roughly at the *geometric centre* of the keyboard, so most values are negative on the left/top and positive on the right/bottom.

### 2.2 Normalised coordinates ( `left_u`, `top_u`, `right_u`, `bottom_u` )
• We shift the entire board so the **top-left key's upper-left corner** becomes `(0,0)`.
• Now every key's rectangle is expressed in **positive unit space**, making overlays on an image with the same origin straightforward.

The registry keeps **both** systems:

```json
{
  "0xRd75": {
    "label": "space",
    "x_u": -4.5,
    "y_u":  2.0,
    "width_u":  6.25,
    "height_u": 1.0,
    "left_u":   3.75,
    "top_u":    5.5,
    "right_u": 10.0,
    "bottom_u": 6.5
  }
}
```

---
## 3. Mapping to Pixel Space

When you load a painting (or any image) you'll eventually crop/resize it to a *keyboard canvas* (e.g. 1000 × 380 px).  To paint each key:

1. **Compute the conversion factor** from **units → pixels**:
   ```python
   # Example: choose how wide you want the full keyboard in pixels
   KEYBOARD_WIDTH_PX = 1000
   total_width_u = max(right_u)  # rightmost key's right_u, e.g. 15.5u for TKL
   px_per_u = KEYBOARD_WIDTH_PX / total_width_u
   ```
2. **Convert a key's rectangle**:
   ```python
   x0 = int(key["left_u"]   * px_per_u)
   y0 = int(key["top_u"]    * px_per_u)   # same factor because we assume square units
   x1 = int(key["right_u"]  * px_per_u)
   y1 = int(key["bottom_u"] * px_per_u)
   bbox = (x0, y0, x1, y1)  # PIL crop box
   ```
3. **Crop the image** for that bbox, compute representative colour(s), map to nearest Yuzu colour, and assign it to `key_id`.

> ⚠️  Key units are square, but the keyboard isn't perfectly rectangular; leave some padding or clip around the board when you prepare the canvas.

---
## 4. Quick Reference
| Field | Meaning | Units |
|-------|---------|-------|
| `label` | Human-readable key legend (optional) | – |
| `x_u`, `y_u` | Raw upper-left corner in unit space (can be negative) | u |
| `width_u`, `height_u` | Key size | u |
| `left_u`, `top_u`, `right_u`, `bottom_u` | Normalised bounding box (origin = top-left of board) | u |

---
Ready for the next step: colour-mapping and image slicing. Happy hacking! 🚀 