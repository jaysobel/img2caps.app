/**
 * Color mapping utilities to extract dominant colors and match them to Yuzu color palette
 */

// NEW: Pull in the colour-thief-style helpers that work directly on pixel buffers
import { getDominantColor, getPalette } from './dominantColor.js';

/**
 * Extract the dominant color from an image
 * @param {string} imageUrl - URL or data URL of the image
 * @returns {Promise<number[]>} RGB array of the dominant color
 */
export async function dominantColor(imageUrl) {
  return new Promise((resolve, reject) => {
    if (!imageUrl) return reject(new Error('No image URL provided'));

    const img = new Image();
    let timeout;

    img.onload = () => {
      clearTimeout(timeout);
      try {
        // Draw the image to an off-screen canvas so we can get raw pixel data
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Extract RGBA buffer
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const rgb = getDominantColor(data, canvas.width * canvas.height);
        if (!rgb) return resolve([128, 128, 128]); // fallback mid-grey
        resolve(rgb);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };

    // Safety timeout
    timeout = setTimeout(() => {
      reject(new Error('Image loading timed out'));
    }, 10000);

    img.src = imageUrl;
  });
}

/**
 * Extract a color palette from an image
 * @param {string} imageUrl - URL or data URL of the image
 * @param {number} colorCount - Number of colors to extract
 * @returns {Promise<number[][]>} Array of RGB colors
 */
export async function extractColorPalette(imageUrl, colorCount = 5) {
  return new Promise((resolve, reject) => {
    if (!imageUrl) return reject(new Error('No image URL provided'));

    const img = new Image();
    let timeout;

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const palette = getPalette(data, canvas.width * canvas.height, {
          colorCount,
          quality: 10,
        });
        resolve(palette);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };

    timeout = setTimeout(() => {
      reject(new Error('Image loading timed out'));
    }, 10000);

    img.src = imageUrl;
  });
}

/**
 * Convert an RGB color value to XYZ.
 * Assumes R, G, B are in [0, 255] range.
 * Conversion formula from http://www.easyrgb.com/en/math.php
 * @param {number[]} rgb - [R, G, B]
 * @returns {number[]} [X, Y, Z]
 */
function rgbToXyz(rgb) {
  let [r, g, b] = rgb.map(val => val / 255);

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  r *= 100;
  g *= 100;
  b *= 100;

  // Observer. = 2°, Illuminant = D65
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  return [x, y, z];
}

/**
 * Convert an XYZ color value to CIELAB.
 * Conversion formula from http://www.easyrgb.com/en/math.php
 * @param {number[]} xyz - [X, Y, Z]
 * @returns {number[]} [L*, a*, b*]
 */
function xyzToLab(xyz) {
  let [x, y, z] = xyz;

  // Observer= 2°, Illuminant= D65
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  x /= refX;
  y /= refY;
  z /= refZ;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

  const l = (116 * y) - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);

  return [l, a, b];
}

/**
 * Convert RGB to CIELAB.
 * @param {number[]} rgb - [R, G, B]
 * @returns {number[]} [L*, a*, b*]
 */
function rgbToLab(rgb) {
  const xyz = rgbToXyz(rgb);
  return xyzToLab(xyz);
}

/**
 * Calculate the CIELAB Delta E 1976 difference between two LAB colors.
 * This is simply the Euclidean distance in the LAB color space.
 * @param {number[]} lab1 - First LAB color [L*, a*, b*]
 * @param {number[]} lab2 - Second LAB color [L*, a*, b*]
 * @returns {number} The Delta E 76 difference.
 */
function deltaE76(lab1, lab2) {
  if (!lab1 || !lab2 || lab1.length !== 3 || lab2.length !== 3) {
    return Infinity; // Should not happen if inputs are valid LAB
  }
  return Math.sqrt(
    Math.pow(lab1[0] - lab2[0], 2) + // Diff in L*
    Math.pow(lab1[1] - lab2[1], 2) + // Diff in a*
    Math.pow(lab1[2] - lab2[2], 2)  // Diff in b*
  );
}

/**
 * Calculate the Euclidean distance between two RGB colors
 * @param {number[]} c1 - First RGB color array
 * @param {number[]} c2 - Second RGB color array
 * @returns {number} Distance between colors
 */
export function rgbDistance(c1, c2) {
  // Make sure we have valid RGB components
  if (!c1 || !c2 || c1.length !== 3 || c2.length !== 3) {
    return Infinity;
  }
  
  // Validate that all components are numbers
  for (let i = 0; i < 3; i++) {
    if (typeof c1[i] !== 'number' || isNaN(c1[i]) || 
        typeof c2[i] !== 'number' || isNaN(c2[i])) {
      return Infinity;
    }
  }
  
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) + 
    Math.pow(c1[1] - c2[1], 2) + 
    Math.pow(c1[2] - c2[2], 2)
  );
}

/**
 * Find the closest Yuzu color code to a given RGB value
 * @param {number[]} rgb - RGB color array to match
 * @param {Object} palette - Yuzu color palette
 * @returns {string} Code of the nearest Yuzu color
 */
export function nearestYuzuColor(rgb, palette) {
  // Validate input
  if (!rgb || rgb.length !== 3 || !palette || Object.keys(palette).length === 0) {
    console.warn('Invalid input to nearestYuzuColor', { rgb, hasPalette: !!palette });
    // Ensure palette exists before trying to access keys
    return palette && Object.keys(palette).length > 0 ? Object.keys(palette)[0] : 'fallback'; // Provide a generic fallback code
  }
  
  let bestCode = null;
  let bestDist = Infinity;
  
  // Make sure RGB values are within expected range
  const safeRgb = [
    Math.max(0, Math.min(255, rgb[0])),
    Math.max(0, Math.min(255, rgb[1])),
    Math.max(0, Math.min(255, rgb[2]))
  ];

  // Convert the input RGB color to LAB once
  const inputLab = rgbToLab(safeRgb);
  
  Object.entries(palette).forEach(([code, entry]) => {
    // Skip invalid entries or entries without RGB
    if (!entry || !entry.rgb || !Array.isArray(entry.rgb) || entry.rgb.length !== 3) {
      console.warn(`Skipping invalid palette entry for code: ${code}`, entry);
      return;
    }
    
    // Convert the palette entry RGB to LAB
    const entryLab = rgbToLab(entry.rgb);
    
    // Calculate perceptual distance using Delta E 76
    const dist = deltaE76(inputLab, entryLab);
    
    if (dist < bestDist) {
      bestDist = dist;
      bestCode = code;
    }
  });
  
  // If no match found (e.g., palette was empty or all entries invalid), return the first valid key if possible
  if (bestCode === null && Object.keys(palette).length > 0) {
     // Find the first valid key as a fallback
     const fallbackCode = Object.keys(palette).find(code => {
       const entry = palette[code];
       return entry && entry.rgb && Array.isArray(entry.rgb) && entry.rgb.length === 3;
     });
     bestCode = fallbackCode || 'fallback'; // Use generic fallback if no valid keys found
  } else if (bestCode === null) {
    bestCode = 'fallback'; // Fallback if palette was initially empty
  }
  
  return bestCode;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Mode A – Median-cut (quantize)  ===========================================
// -----------------------------------------------------------------------------

export function dominantColorFromRegionQuantize(imageData, x, y, width, height) {
  if (width <= 0 || height <= 0) return [128, 128, 128];
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) return [128, 128, 128];

  try {
    const sourceData = imageData.data;
    const sourceWidth = imageData.width;
    const regionPixelCount = width * height;
    const regionData = new Uint8ClampedArray(regionPixelCount * 4);

    let targetIndex = 0;
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        // Calculate the index in the source flat data array
        const sourceIndex = (row * sourceWidth + col) * 4;

        // Copy RGBA values
        regionData[targetIndex] = sourceData[sourceIndex];       // R
        regionData[targetIndex + 1] = sourceData[sourceIndex + 1]; // G
        regionData[targetIndex + 2] = sourceData[sourceIndex + 2]; // B
        regionData[targetIndex + 3] = sourceData[sourceIndex + 3]; // A
        targetIndex += 4;
      }
    }

    // Use the existing getDominantColor helper with the extracted region data
    const rgb = getDominantColor(regionData, regionPixelCount);
    return rgb || [128, 128, 128]; // Return default if extraction fails
  } catch (err) {
    console.error('Error in dominantColorFromRegionQuantize:', err); // Log error for debugging
    return [128, 128, 128]; // Return default grey on error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Mode B – Frequency histogram (legacy)  =====================================
// -----------------------------------------------------------------------------

export function dominantColorFromRegionSimple(imageData, x, y, width, height) {
  if (width <= 0 || height <= 0) return [128, 128, 128]; // Return default for invalid region size
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) return [128, 128, 128]; // Return default if imageData is invalid

  try {
    // Access the data directly from the provided imageData
    const data = imageData.data;
    const sourceWidth = imageData.width; // Width of the entire ImageData block

    if (!data || data.length === 0) return [128, 128, 128];

    const colorMap = {};
    const totalPixelsInRegion = width * height;
    // Simple heuristic: aim for around 1000 samples, but don't sample less than total pixels
    const sampleSize = Math.min(1000, totalPixelsInRegion); 
    const step = Math.max(1, Math.floor(totalPixelsInRegion / sampleSize));
    let pixelsProcessed = 0;

    // Iterate only over the pixels within the specified region (x, y, width, height)
    // inside the larger imageData
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        // Process pixel based on step count
        if (pixelsProcessed % step === 0) {
          // Calculate the index in the flat data array
          // index = (rowIndex * imageWidth + columnIndex) * 4 bytes (RGBA)
          const index = (row * sourceWidth + col) * 4;
          
          // Basic boundary check (though outer loops should prevent this)
          if (index + 3 >= data.length) continue; 

          const alpha = data[index + 3];
          if (alpha < 128) continue; // ignore mostly transparent

          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];

          // Quantize color to reduce noise
          const quantR = Math.floor(r / 8) * 8;
          const quantG = Math.floor(g / 8) * 8;
          const quantB = Math.floor(b / 8) * 8;

          const key = `${quantR},${quantG},${quantB}`;
          const entry = colorMap[key] || { count: 0, r: 0, g: 0, b: 0 };
          entry.count += 1;
          entry.r += r; // Store original sum for averaging later
          entry.g += g;
          entry.b += b;
          colorMap[key] = entry;
        }
        pixelsProcessed++;
      }
    }

    if (Object.keys(colorMap).length === 0) {
      console.warn('No valid colors found in region');
      return [128, 128, 128];
    }

    let maxCount = 0;
    let dominant = [128, 128, 128];
    Object.values(colorMap).forEach((c) => {
      if (c.count > maxCount) {
        maxCount = c.count;
        dominant = [
          Math.round(c.r / c.count),
          Math.round(c.g / c.count),
          Math.round(c.b / c.count),
        ];
      }
    });

    return dominant;
  } catch (err) {
    console.warn('Legacy color extraction error:', err);
    return [128, 128, 128];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Unified wrapper (kept for backward compatibility)  ------------------------
// -----------------------------------------------------------------------------

export function dominantColorFromRegion(imageData, x, y, width, height, mode = 'quantize') {
  // Basic validation
  if (width <= 0 || height <= 0) return [128, 128, 128];
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) return [128, 128, 128];

  // Ensure coordinates are within bounds
  x = Math.max(0, Math.floor(x));
  y = Math.max(0, Math.floor(y));
  width = Math.max(1, Math.floor(width));
  height = Math.max(1, Math.floor(height));

  // Adjust width/height if they exceed image boundaries from the starting x/y
  width = Math.min(width, imageData.width - x);
  height = Math.min(height, imageData.height - y);

  // Final check after adjustments
  if (width <= 0 || height <= 0) return [128, 128, 128];

  if (mode === 'quantize') {
    return dominantColorFromRegionQuantize(imageData, x, y, width, height);
  } else {
    return dominantColorFromRegionSimple(imageData, x, y, width, height);
  }
} 