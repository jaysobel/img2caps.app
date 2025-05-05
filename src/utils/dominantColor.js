import quantize from 'quantize';

/**
 * Generate an array with `[r, g, b]` values for each pixel we want to sample.
 *
 * @param {Uint8ClampedArray|Uint8Array} pixels - RGBA pixel buffer.
 * @param {number} pixelCount              - Total number of pixels in the image (width × height).
 * @param {number} quality                 - How many pixels to skip while sampling (1 = every pixel).
 * @returns {number[][]} An array of sampled RGB triplets.
 */
function createPixelArray(pixels, pixelCount, quality) {
  const pixelArray = [];

  for (let i = 0; i < pixelCount; i += quality) {
    const offset = i * 4;
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    const a = pixels[offset + 3];

    // Ignore fully transparent pixels (alpha < 125). Whites are now retained.
    if (typeof a === 'undefined' || a >= 125) {
      pixelArray.push([r, g, b]);
    }
  }

  return pixelArray;
}

/**
 * Validate and normalise `colorCount` and `quality` options so they fall inside
 * the same bounds as the original Color Thief implementation.
 */
function validateOptions({ colorCount = 10, quality = 10 }) {
  if (!Number.isInteger(colorCount)) {
    colorCount = 10;
  } else if (colorCount === 1) {
    throw new Error(
      'colorCount should be between 2 and 20. To get one color use getDominantColor() instead.'
    );
  } else {
    colorCount = Math.max(2, Math.min(20, colorCount));
  }

  if (!Number.isInteger(quality) || quality < 1) {
    quality = 10;
  }

  return { colorCount, quality };
}

/**
 * Extract the dominant colour from raw canvas pixel data.
 *
 * @param {Uint8ClampedArray|Uint8Array} imgData - RGBA buffer straight from `ctx.getImageData().data`.
 * @param {number} pixelCount                    - `width * height` of the image.
 * @param {number} [quality=10]                  - Sampling quality (1 = highest quality, slower). NOTE: For dominant color, we now force quality=1.
 * @returns {number[] | null} `[r, g, b]` triplet representing the dominant colour or `null`.
 */
export function getDominantColor(imgData, pixelCount, quality = 10) {
  // Always use highest quality (quality=1) for dominant color extraction,
  // especially relevant for small regions where every pixel matters.
  const effectiveQuality = 1;
  const pixelArray = createPixelArray(imgData, pixelCount, effectiveQuality);
  if (!pixelArray.length) return null;

  // Ask for a small number of clusters (2-4) as recommended for small regions.
  // Use Math.max(2, ...) because quantize requires at least 2 clusters.
  const clusterCount = Math.max(2, Math.min(4, pixelArray.length));
  const cmap = quantize(pixelArray, clusterCount);
  const palette = cmap ? cmap.palette() : null;

  // The first color in the palette from the quantized map is the dominant one.
  return palette ? palette[0] : null;
}

/**
 * Generate a representative colour palette from raw canvas pixel data.
 *
 * @param {Uint8ClampedArray|Uint8Array} imgData - RGBA buffer straight from `ctx.getImageData().data`.
 * @param {number} pixelCount                    - `width * height` of the image.
 * @param {object} [opts]                        - Options `{ colorCount, quality }`.
 * @param {number} [opts.colorCount=10]          - Number of colours to return (2-20).
 * @param {number} [opts.quality=10]             - Sampling quality (1 = highest quality, slower).
 * @returns {number[][]} Array of `[r, g, b]` colour triplets.
 */
export function getPalette(imgData, pixelCount, opts = {}) {
  const { colorCount, quality } = validateOptions(opts);
  const pixelArray = createPixelArray(imgData, pixelCount, quality);
  if (!pixelArray.length) return [];

  const cmap = quantize(pixelArray, colorCount);
  return cmap ? cmap.palette() : [];
}

// The functions are exported above for ES module usage. No CommonJS export.
