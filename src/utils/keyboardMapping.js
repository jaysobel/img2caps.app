/**
 * Keyboard mapping utilities to map image regions to keyboard keys
 */

/**
 * Build a mapping of keyboard key IDs to bounding boxes
 * @param {number} imageWidth - Width of the image
 * @param {number} imageHeight - Height of the image
 * @param {Object} registry - Key position registry from Yuzu
 * @returns {Object} Map of key IDs to bounding boxes [x0, y0, x1, y1]
 */
export function buildKeyboardBboxMap(imageWidth, imageHeight, registry) {
  // Calculate conversion factors separately for horizontal and vertical axes.
  // Using the respective dimensions avoids rounding issues that could push
  // bottom‐row keys outside the cropped canvas and therefore get skipped.
  const totalWidthU  = Math.max(...Object.values(registry).map((key) => key.right_u));
  const totalHeightU = Math.max(...Object.values(registry).map((key) => key.bottom_u));

  const pxPerUx = imageWidth / totalWidthU;
  const pxPerUy = imageHeight / totalHeightU;

  const bboxes = {};

  Object.entries(registry).forEach(([keyId, key]) => {
    const x0 = Math.floor(key.left_u   * pxPerUx);
    const y0 = Math.floor(key.top_u    * pxPerUy);
    const x1 = Math.floor(key.right_u  * pxPerUx);
    const y1 = Math.floor(key.bottom_u * pxPerUy);

    bboxes[keyId] = [x0, y0, x1, y1];
  });

  return bboxes;
}

/**
 * Calculate the dimensions of the keyboard in units
 * @param {Object} registry - Key position registry from Yuzu
 * @returns {Object} Width and height in units
 */
export function getKeyboardDimensions(registry) {
  const totalWidthU = Math.max(...Object.values(registry).map(key => key.right_u));
  const totalHeightU = Math.max(...Object.values(registry).map(key => key.bottom_u));
  
  return {
    width: totalWidthU,
    height: totalHeightU
  };
} 