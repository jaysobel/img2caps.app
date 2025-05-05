import { useState, useRef, useEffect, useCallback } from 'react';

// Props for the hook
interface UseImageOverlaySamplerProps {
  // Refs to the container element, managed by the parent component
  containerRef: React.RefObject<HTMLDivElement | null>; // Allow null initially
  aspectRatio: number; // Aspect ratio of the overlay (e.g., keyboard aspect ratio)
  imageUrl: string | undefined; // To trigger resets when image changes
}

// Return value of the hook
interface UseImageOverlaySamplerResult {
  overlayPosition: { x: number; y: number };
  overlaySize: { width: number; height: number };
  isInteracting: boolean; // True if dragging or resizing
  draggableRef: React.RefObject<HTMLDivElement | null>; // Allow null initially
  setOverlayPosition: (position: { x: number; y: number }) => void;
  setIsInteracting: (interacting: boolean) => void;
  setOverlaySize: (size: { width: number; height: number }) => void;
  resetOverlayLayout: () => void;
}

/**
 * Custom hook to manage the state and logic for a draggable, resizable overlay
 * used for sampling regions from an image within a container.
 */
const useImageOverlaySampler = ({
  containerRef,
  aspectRatio,
  imageUrl,
}: UseImageOverlaySamplerProps): UseImageOverlaySamplerResult => {
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [overlayPosition, setOverlayPosition] = useState({ x: 50, y: 50 });
  // Initialize height based on aspect ratio and a default width
  const [overlaySize, setOverlaySize] = useState({ width: 300, height: 300 / aspectRatio });

  // Ref for the draggable node, managed by the hook
  const draggableRef = useRef<HTMLDivElement | null>(null);

  // === Overlay size and position initialization/reset ===
  const resetOverlayLayout = useCallback(() => {
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();

      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      // Ensure container has dimensions before proceeding
      if (containerWidth <= 0 || containerHeight <= 0) {
        console.warn('Container has zero dimensions in resetOverlayLayout');
        // Fallback to default values if container isn't ready
        setOverlaySize({ width: 300, height: 300 / aspectRatio });
        setOverlayPosition({ x: 50, y: 50 });
        return;
      }

      let initialWidth, initialHeight;
      if (containerWidth / containerHeight > aspectRatio) {
        initialHeight = containerHeight * 0.8;
        initialWidth = initialHeight * aspectRatio;
      } else {
        initialWidth = containerWidth * 0.8;
        initialHeight = initialWidth / aspectRatio;
      }

      initialWidth = Math.min(initialWidth, containerWidth);
      initialHeight = Math.min(initialHeight, containerHeight);

      const initialX = (containerWidth - initialWidth) / 2;
      const initialY = (containerHeight - initialHeight) / 2;

      setOverlaySize({ width: initialWidth, height: initialHeight });
      setOverlayPosition({ x: initialX, y: initialY });
    } else {
      // Fallback if containerRef isn't ready
      setOverlaySize({ width: 300, height: 300 / aspectRatio });
      setOverlayPosition({ x: 50, y: 50 });
    }
  }, [containerRef, aspectRatio]); // Dependencies for useCallback

  // Effect to reset layout when image URL changes or container becomes available
  // Note: We don't want to run this on every render - only when image URL changes
  useEffect(() => {
    if (imageUrl) { // Only reset if we have an image URL
      resetOverlayLayout();
    }
  }, [imageUrl, resetOverlayLayout]); // Removed containerRef dependency to prevent unnecessary resets

  // Return values
  return {
    overlayPosition,
    overlaySize,
    isInteracting,
    draggableRef,
    setOverlayPosition,
    setIsInteracting,
    setOverlaySize,
    resetOverlayLayout,
  };
};

export default useImageOverlaySampler; 