/**
 * Image processing utilities to extract colors from images and generate keycap designs
 */
import { dominantColorFromRegion, nearestYuzuColor } from './colorMapping';
import { buildKeyboardBboxMap } from './keyboardMapping';

// --- Interfaces (Matching Editor.tsx or defining locally) ---
interface KeyPositionRegistry { [key: string]: any; } // Or more specific type
interface ColorRegistry { [key: string]: { rgb: [number, number, number], name: string }; } // Assuming structure
interface BaseJson { [key: string]: any; } // Or more specific type
interface PreviewColorData { code: string; rgb: string; } // Hex RGB
interface PreviewData { customized: { [keyId: string]: PreviewColorData }; }
interface ExportJson extends BaseJson { customizedColor: { [keyId: string]: string }; } // Yuzu codes

interface ProcessImageArgs {
    canvas: HTMLCanvasElement;
    keyPositionRegistry: KeyPositionRegistry;
    colorRegistry: ColorRegistry;
    baseJson: BaseJson;
    overlayCanvasX: number;        // Overlay top-left X relative to canvas
    overlayCanvasY: number;        // Overlay top-left Y relative to canvas
    overlayCanvasWidth: number;    // Overlay width on canvas
    overlayCanvasHeight: number;   // Overlay height on canvas
    algorithm: string;
}

interface ProcessResult {
  preview: PreviewData;
  json: ExportJson;
}

// Define return type for buildKeyboardBboxMap if possible, otherwise use 'any' or index signature
type BboxMap = { [keyId: string]: [number, number, number, number] }; // [x0, y0, x1, y1] relative to overlay dims

/**
 * Convert RGB array to hex color string (e.g., #RRGGBB)
 */
function rgbToHex(rgb: [number, number, number]): string {
  if (!rgb || rgb.length !== 3) {
    console.warn("Invalid RGB array in rgbToHex:", rgb);
    return "#000000"; // Return black for invalid input
  }
  // Ensure values are integers within 0-255 range
  const r = Math.max(0, Math.min(255, Math.round(rgb[0])));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1])));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2])));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Process image data drawn on a canvas and generate a keycap design based on overlay position.
 * Samples colors directly from the canvas based on calculated key regions.
 */
export async function processImage(args: ProcessImageArgs): Promise<ProcessResult | null> {
  const {
    canvas,
    keyPositionRegistry,
    colorRegistry,
    baseJson,
    overlayCanvasX,
    overlayCanvasY,
    overlayCanvasWidth,
    overlayCanvasHeight,
    algorithm = 'simple', // Default algorithm
  } = args;

  // --- Input Validation ---
  if (!canvas) {
    console.error("Canvas element is missing");
    throw new Error("Canvas element is missing");
  }
  if (!keyPositionRegistry) {
    console.error("Key position registry is missing");
    throw new Error("Key position registry is missing");
  }
  if (!colorRegistry) {
    console.error("Color registry is missing");
    throw new Error("Color registry is missing");
  }
   if (!baseJson) {
     console.error("Base JSON template is missing");
     throw new Error("Base JSON template is missing");
   }
   if (overlayCanvasWidth <= 0 || overlayCanvasHeight <= 0) {
       console.error(`Invalid overlay dimensions on canvas: ${overlayCanvasWidth}x${overlayCanvasHeight}`);
     // Return null instead of throwing, allows Editor to handle gracefully
     return null;
     // throw new Error(`Invalid overlay dimensions on canvas: ${overlayCanvasWidth}x${overlayCanvasHeight}`);
   }
   const canvasWidth = canvas.width;
   const canvasHeight = canvas.height;
   if (canvasWidth <= 0 || canvasHeight <= 0) {
       console.error(`Invalid canvas dimensions: ${canvasWidth}x${canvasHeight}`);
       // Return null instead of throwing
       return null;
      // throw new Error(`Invalid canvas dimensions: ${canvasWidth}x${canvasHeight}`);
   }


  // --- Canvas Context ---
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Hint for optimization
  if (!ctx) {
    console.error("Failed to get 2D context from canvas");
    throw new Error("Failed to get 2D context from canvas");
  }

  try {
    // --- Keyboard Layout Mapping ---
    // Map the keyboard keys to regions relative to the *overlay* dimensions provided
    const bboxMap = buildKeyboardBboxMap(overlayCanvasWidth, overlayCanvasHeight, keyPositionRegistry) as BboxMap; // Use type assertion

    // --- Result Objects ---
    const customizedColorCodes: { [keyId: string]: string } = {};
    const customizedPreviewColors: { [keyId: string]: PreviewColorData } = {};

    // Default color fallback (first color in registry)
    const defaultColorCode = Object.keys(colorRegistry)[0];
    if (!defaultColorCode) {
        console.error("Color registry is empty or invalid.");
        throw new Error("Color registry is empty or invalid.");
    }
    const defaultColorRgb = colorRegistry[defaultColorCode]?.rgb;
    const defaultPreviewColor: PreviewColorData | null = defaultColorRgb
        ? { code: defaultColorCode, rgb: rgbToHex(defaultColorRgb) }
        : null;


    // --- Process Each Key ---
    for (const [keyId, keyOverlayBbox] of Object.entries(bboxMap)) {
      try {
        // keyOverlayBbox = [x0, y0, x1, y1] relative to the OVERLAY's top-left corner
        const [keyOverlayX0, keyOverlayY0, keyOverlayX1, keyOverlayY1] = keyOverlayBbox;
        const keyOverlayWidth = keyOverlayX1 - keyOverlayX0;
        const keyOverlayHeight = keyOverlayY1 - keyOverlayY0;

        if (keyOverlayWidth <= 0 || keyOverlayHeight <= 0) {
          console.warn(`Skipping key ${keyId} due to zero/negative dimensions in bboxMap.`);
          continue; // Skip keys with zero or negative dimensions
        }

        // --- Calculate Key's Absolute Position on Canvas ---
        const keyCanvasX0 = overlayCanvasX + keyOverlayX0;
        const keyCanvasY0 = overlayCanvasY + keyOverlayY0;
        // No need for keyCanvasX1/Y1, we use width/height

        // --- Clip Key Region Against Canvas Boundaries ---
        const clipX0 = Math.max(0, keyCanvasX0);
        const clipY0 = Math.max(0, keyCanvasY0);
        const clipX1 = Math.min(canvasWidth, keyCanvasX0 + keyOverlayWidth);
        const clipY1 = Math.min(canvasHeight, keyCanvasY0 + keyOverlayHeight);

        // Calculate the width and height of the *clipped* region on the canvas
        const clippedWidth = clipX1 - clipX0;
        const clippedHeight = clipY1 - clipY0;

        // Check if the clipped region has valid dimensions (i.e., if the key is at all visible on the canvas)
        if (clippedWidth <= 0 || clippedHeight <= 0) {
          // This key's bounding box falls entirely outside the visible canvas area
          // Or is clipped away entirely if overlay is partially off-canvas
          // console.log(`Key ${keyId} clipped out.`); // Optional debug log
           if (defaultPreviewColor) {
               customizedColorCodes[keyId] = defaultColorCode;
               customizedPreviewColors[keyId] = defaultPreviewColor;
           }
          continue;
        }
        // ----------------------------------------------------

        // --- Extract ImageData for the Clipped Key Region ---
        let keyImageData: ImageData | null = null;
        try {
             // Use integers for getImageData arguments
             const intX = Math.round(clipX0);
             const intY = Math.round(clipY0);
             const intWidth = Math.round(clippedWidth);
             const intHeight = Math.round(clippedHeight);

              // Ensure width/height are at least 1 after rounding
              if (intWidth < 1 || intHeight < 1) {
                 console.warn(`Skipping key ${keyId}: Clipped region too small after rounding (${intWidth}x${intHeight}).`);
                 if (defaultPreviewColor) {
                    customizedColorCodes[keyId] = defaultColorCode;
                    customizedPreviewColors[keyId] = defaultPreviewColor;
                 }
                 continue;
              }

              keyImageData = ctx.getImageData(intX, intY, intWidth, intHeight);
        } catch (getImageDataError) {
            // This can happen due to CORS issues (tainted canvas) or potentially invalid arguments
             console.error(`Failed to getImageData for key ${keyId} at (${clipX0.toFixed(1)}, ${clipY0.toFixed(1)}) size (${clippedWidth.toFixed(1)}x${clippedHeight.toFixed(1)}):`, getImageDataError);
             // Use default color as fallback if extraction fails
             if (defaultPreviewColor) {
                customizedColorCodes[keyId] = defaultColorCode;
                customizedPreviewColors[keyId] = defaultPreviewColor;
             }
             continue; // Skip to the next key
        }

        if (!keyImageData) {
            // Should not happen if getImageData didn't throw, but check anyway
             console.warn(`keyImageData is null for key ${keyId} after try-catch.`);
             if (defaultPreviewColor) {
                customizedColorCodes[keyId] = defaultColorCode;
                customizedPreviewColors[keyId] = defaultPreviewColor;
             }
             continue;
        }
        // ------------------------------------------------------

        // --- Get Dominant Color from Key's ImageData ---
        // Pass the extracted ImageData. Coordinates inside are now (0,0) relative to this specific ImageData block.
        const domRgb = dominantColorFromRegion(
          keyImageData,
          0, // X start is 0 within the extracted ImageData
          0, // Y start is 0 within the extracted ImageData
          keyImageData.width, // Full width of the extracted ImageData
          keyImageData.height, // Full height of the extracted ImageData
          algorithm
        );
        // --------------------------------------------------

        // --- Map to Yuzu Color ---
        const yuzuCode = nearestYuzuColor(domRgb, colorRegistry);

        // Validate and store the result
        if (yuzuCode && colorRegistry[yuzuCode]) {
            const keyColorRgb = colorRegistry[yuzuCode].rgb;
            customizedColorCodes[keyId] = yuzuCode;
            customizedPreviewColors[keyId] = { code: yuzuCode, rgb: rgbToHex(keyColorRgb) };
        } else {
          console.warn(`No valid Yuzu color found for key ${keyId} (RGB: ${domRgb}), using default.`);
           if (defaultPreviewColor) {
              customizedColorCodes[keyId] = defaultColorCode;
              customizedPreviewColors[keyId] = defaultPreviewColor;
           }
        }
      } catch (keyError) {
        console.warn(`Failed to process key ${keyId}:`, keyError);
        // Use default color for keys that fail individually
         if (defaultPreviewColor) {
            customizedColorCodes[keyId] = defaultColorCode;
            customizedPreviewColors[keyId] = defaultPreviewColor;
         }
      }
    }

    // --- Construct Final Result ---
    const resultJson: ExportJson = {
      ...baseJson,
      customizedColor: customizedColorCodes, // Map of keyId -> yuzuCode
    };

    const resultPreview: PreviewData = {
        customized: customizedPreviewColors // Map of keyId -> { code, rgb(hex) }
    };

    return {
      json: resultJson,
      preview: resultPreview,
    };

  } catch (error) {
    console.error("Error during image processing:", error);
    // Instead of re-throwing, return null to indicate failure to the caller (Editor)
    // throw error;
    return null;
  }
} 