import React, { useRef, useState, useEffect, useMemo } from 'react';
import { getKeyboardDimensions } from '../utils/keyboardMapping';
import { processImage } from '../utils/imageProcessing.ts';
import keyboardSvg from '../assets/yuzu_keyboard.svg';
import useImageOverlaySampler from '../hooks/useImageOverlaySampler';

// Define interfaces based on expected data structures
// TODO: Refine 'any' types with specific structures when known
interface KeyPositionRegistry { [key: string]: any; }
interface ColorRegistry { [key: string]: any; }
interface BaseJson { [key: string]: any; }
interface PreviewData { [key: string]: any; }
interface ExportJson { [key: string]: any; }

// Interface for the arguments expected by processImage
// Define this based on the updated processImage function signature
interface ProcessImageArgs {
    canvas: HTMLCanvasElement;
    keyPositionRegistry: KeyPositionRegistry;
    colorRegistry: ColorRegistry;
    baseJson: BaseJson;
    overlayCanvasX: number;
    overlayCanvasY: number;
    overlayCanvasWidth: number;
    overlayCanvasHeight: number;
    algorithm: string; // Added algorithm parameter
}

// Temporary type definitions - move later if needed
interface KeyboardDimensions { width: number; height: number; }
interface ProcessResult {
  preview: PreviewData;
  json: ExportJson;
}

// Define props interface
interface EditorProps {
  imageUrl: string | undefined; // Can be undefined if imageInfo is null
  keyPositionRegistry: KeyPositionRegistry;
  colorRegistry: ColorRegistry;
  baseJson: BaseJson;
  onPreviewUpdate: (preview: PreviewData) => void;
  onExportReady: (json: ExportJson) => void;
  onClearImage: () => void;
}

/**
 * Editor component – lets the user drag / resize a keyboard SVG overlay so we
 * can sample colours from the underlying photo. Uses react-resizable.
 */
const Editor = ({
  imageUrl,
  keyPositionRegistry,
  colorRegistry,
  baseJson,
  onPreviewUpdate,
  onExportReady,
  onClearImage,
}: EditorProps) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [algorithmMode, setAlgorithmMode] = useState<string>('simple');

  // Refs managed by the component
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State for the loaded image element
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // Keyboard aspect ratio - Memoize this calculation
  const dimensions = useMemo(() => getKeyboardDimensions(keyPositionRegistry) as KeyboardDimensions | null, [keyPositionRegistry]);
  const aspectRatio = useMemo(() => {
    // Check dimensions is not null before accessing properties
    return dimensions && dimensions.height !== 0 ? dimensions.width / dimensions.height : 16 / 9;
  }, [dimensions]); // Depends only on memoized dimensions

  // Use the custom hook for overlay logic
  const {
    overlayPosition,
    overlaySize,
    isInteracting,
    draggableRef,
    setOverlayPosition,
    setIsInteracting,
    setOverlaySize,
    resetOverlayLayout,
  } = useImageOverlaySampler({
    containerRef,
    aspectRatio,
    imageUrl,
  });

  // --- Canvas Drawing Logic ---

  // Effect to load the image source into an HTMLImageElement
  useEffect(() => {
    if (!imageUrl) {
      setLoadedImage(null);
      // Clear canvas when image is cleared
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const img = new Image();
    img.onload = () => {
      setLoadedImage(img);
      // Defer layout reset until after image is loaded and *drawn* initially
    };
    img.onerror = () => {
      console.error("Failed to load image:", imageUrl);
      setLoadedImage(null);
      // Optionally alert the user or clear related state
       alert(`Failed to load image: ${imageUrl}. Please check the URL or try a different image.`);
       onClearImage(); // Trigger clear if load fails
    };
    // If the image source might be from a different origin, set crossorigin
    // This is crucial for canvas `getImageData` later if CORS is restrictive
    // img.crossOrigin = "Anonymous"; // Uncomment if CORS issues arise with sampling
    img.src = imageUrl;

    // Cleanup function
    return () => {
      // If using object URLs, revoke them here if necessary: URL.revokeObjectURL(img.src);
      setLoadedImage(null); // Ensure cleanup on unmount or URL change
    };
  }, [imageUrl, onClearImage]); // Add onClearImage dependency

  // Effect to handle container resizing and draw the image onto the canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !loadedImage) {
      // Clear canvas if image is not loaded
      const ctx = canvas?.getContext('2d');
       if (canvas && ctx) {
         ctx.clearRect(0, 0, canvas.width, canvas.height);
       }
      return;
    }

    let animationFrameId: number | null = null;

    // Redraw function now only handles drawing
    const redraw = () => {
      // Cancel previous frame if any
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Request a new frame
      animationFrameId = requestAnimationFrame(() => {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          const imgWidth = loadedImage.naturalWidth;
          const imgHeight = loadedImage.naturalHeight;

          // Ensure dimensions are valid before proceeding
          if (containerWidth <= 0 || containerHeight <= 0 || imgWidth <= 0 || imgHeight <= 0) {
             console.warn("Invalid dimensions for drawing:", { containerWidth, containerHeight, imgWidth, imgHeight });
             return; // Don't draw if dimensions are invalid
          }

          canvas.width = containerWidth; // Match canvas resolution to display size
          canvas.height = containerHeight;

          // Calculate scaling factor to fit image within container while preserving aspect ratio
          const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight);
          const scaledWidth = imgWidth * scale;
          const scaledHeight = imgHeight * scale;

          // Calculate centering offset
          const dx = (containerWidth - scaledWidth) / 2;
          const dy = (containerHeight - scaledHeight) / 2;

          // Clear canvas before drawing
          ctx.clearRect(0, 0, containerWidth, containerHeight);
          // Draw the image centered and scaled
          ctx.drawImage(loadedImage, dx, dy, scaledWidth, scaledHeight);

           // *** REMOVED resetOverlayLayout() call from here ***
      });
    };

    // Initial draw when image is loaded/ready
    redraw();

    // Set up ResizeObserver to redraw when the container size changes
    const resizeObserver = new ResizeObserver(redraw); // Directly call redraw (debounced by requestAnimationFrame)
    resizeObserver.observe(container);

    // Cleanup observer and animation frame on component unmount or when dependencies change
    return () => {
      resizeObserver.unobserve(container);
      resizeObserver.disconnect();
      if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
      }
    };
  }, [loadedImage]); // Removed resetOverlayLayout from dependencies here as it's no longer called directly

  // Effect to reset the overlay layout *only* on initial image load or when image changes
  useEffect(() => {
    if (loadedImage) {
      // Log why this effect is running
      console.log('[Editor] Effect to reset overlay layout RUNNING', { imageUrl });
      // Use a ref to track if this is the first load of this specific image
      const imageUrlChanged = imageUrl !== prevImageUrlRef.current;
      prevImageUrlRef.current = imageUrl;
      
      if (imageUrlChanged) {
        console.log('[Editor] Image URL changed, resetting overlay layout');
        resetOverlayLayout();
      }
    }
  }, [loadedImage, imageUrl, resetOverlayLayout]);
  
  // Use ref to track previous imageUrl - this won't cause re-renders
  const prevImageUrlRef = useRef<string | undefined>(undefined);

  // === Process handler ===
  const handleProcess = async () => {
    // Add console logging to track calls
    console.log('[Editor] handleProcess called');
    
    const canvas = canvasRef.current;
    const overlayElement = draggableRef.current; // Use the ref from the hook

    // Check if canvas and overlay element refs are available
    if (!canvas || !overlayElement) {
      console.error('Canvas or Overlay element ref is not available.');
      alert('Required elements are not ready. Please wait or try reloading.');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        alert('Canvas context is not available.');
        return;
    }

    // Get bounding rectangles for canvas and overlay
    const canvasRect = canvas.getBoundingClientRect();
    const overlayRect = overlayElement.getBoundingClientRect();

    // Check if bounds could be obtained
    if (!canvasRect || !overlayRect) {
        alert('Could not measure element positions. Please try again.');
        setIsProcessing(false); // Reset processing state
        return;
    }

     // --- Calculate Overlay Position Relative to Canvas ---
    // This gives the top-left corner of the overlay in the canvas's coordinate system.
    const relativeX = overlayRect.left - canvasRect.left;
    const relativeY = overlayRect.top - canvasRect.top;
    // The width and height from the overlay's bounding rect are already in screen pixels,
    // which corresponds to the canvas pixel dimensions if the canvas is not scaled by CSS transforms.
    const relativeWidth = overlayRect.width;
    const relativeHeight = overlayRect.height;

    // --- Input Validation ---
    // Check if calculated dimensions are valid before processing
    if (relativeWidth <= 0 || relativeHeight <= 0) {
        alert(`Overlay has invalid dimensions on canvas (Width: ${relativeWidth.toFixed(1)}, Height: ${relativeHeight.toFixed(1)}). Please ensure it's visible and positioned correctly over the image.`);
        setIsProcessing(false); // Reset processing state
        return;
    }
    // Optional: Check if overlay is at least partially within the canvas bounds
    // This check ensures *some* part of the overlay is over the canvas area.
    // It allows processing even if the overlay is partially off-canvas.
    const isPartiallyVisible =
        relativeX < canvasRect.width && relativeX + relativeWidth > 0 &&
        relativeY < canvasRect.height && relativeY + relativeHeight > 0;

    if (!isPartiallyVisible) {
        alert('Overlay is positioned completely outside the image canvas area.');
        setIsProcessing(false);
        return;
    }

    setIsProcessing(true);
    try {
      // Save the current overlay position and size before processing
      // This ensures we can restore it if needed
      const currentOverlayPosition = { ...overlayPosition };
      const currentOverlaySize = { ...overlaySize };
      
      // Process the image
      const processArgs: ProcessImageArgs = {
           canvas: canvas, // Pass the canvas element directly
           keyPositionRegistry: keyPositionRegistry,
           colorRegistry: colorRegistry,
           baseJson: baseJson,
           // New arguments based on getBoundingClientRect
           overlayCanvasX: relativeX,
           overlayCanvasY: relativeY,
           overlayCanvasWidth: relativeWidth,
           overlayCanvasHeight: relativeHeight,
           algorithm: algorithmMode, // Pass selected algorithm
       };

      // Explicitly type the expected return or use 'any' if unsure
      const result: ProcessResult | null = await processImage(processArgs);

      if (result) {
        // Update parent component states with results
        onPreviewUpdate(result.preview);
        onExportReady(result.json);
        
        // Log successful processing
        console.log('[Editor] Processing completed successfully');
      } else {
         // Handle cases where processImage might return null/undefined
         console.error("Processing image returned no result.");
         alert("Failed to process the image colors. Please check the console for errors or try adjusting the overlay.");
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert(`An error occurred during processing: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Event handler for algorithm selection
  const handleAlgorithmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAlgorithmMode(e.target.value);
  };

  // Helper to prevent default image drag behavior
  const preventImageDrag = (e: React.DragEvent<HTMLImageElement>) => e.preventDefault();

  // Determine dynamic button classes
  const generateButtonClass = isProcessing
    ? 'bg-gray-400 cursor-wait'
    : (!imageUrl || !loadedImage)
    ? 'bg-gray-300 cursor-not-allowed'
    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800';

  // Create the control panel component - to be reused
  const ControlPanel = ({ className = "" }) => (
    <div className={`p-3 rounded-lg shadow-xl flex items-center space-x-4 z-20 border ${className}`}
      style={{ 
        backgroundColor: 'var(--theme-header-bg)',
        borderColor: 'var(--theme-primary)',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* Algorithm Selector */}
      <div className="relative">
        <select
          value={algorithmMode}
          onChange={handleAlgorithmChange}
          className="p-2 pl-3 pr-8 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:border-transparent appearance-none"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-secondary) 10%, var(--theme-card-bg))',
            color: 'var(--theme-text)',
            borderColor: 'var(--theme-primary)',
          }}
          disabled={isProcessing}
          aria-label="Color Sampling Algorithm"
        >
          <option value="simple">SIMPLE_AVERAGE</option>
          <option value="quantize">DOMINANT_COLOR</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
            style={{ color: 'var(--theme-primary)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Process Button */}
      <button
        onClick={handleProcess}
        disabled={isProcessing || !imageUrl || !loadedImage} // Disable if no image or processing
        className="relative px-4 py-2 rounded-md font-mono tracking-wider transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden"
        style={{
          backgroundColor: isProcessing 
            ? 'gray'
            : (!imageUrl || !loadedImage)
            ? 'darkgray'
            : 'var(--theme-button-bg)',
          color: 'var(--theme-button-text)',
          cursor: isProcessing 
            ? 'wait'
            : (!imageUrl || !loadedImage)
            ? 'not-allowed'
            : 'pointer',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        <span className="relative z-10">
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              PROCESSING...
            </>
          ) : 'GENERATE'}
        </span>
      </button>

      {/* Clear Button */}
      <button
        onClick={onClearImage} // Use the prop passed from UploadPage
        className="relative px-4 py-2 rounded-md font-mono tracking-wider transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-secondary)',
          color: 'var(--theme-button-text)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
        disabled={isProcessing} // Disable while processing
      >
        <span className="relative z-10">RESET</span>
      </button>
    </div>
  );

  // Ensure the ref from the hook is attached to the correct element in the JSX
  // It should be the element that is being dragged and resized.
  return (
    <div className="flex flex-col h-full">
      {/* Canvas area */}
      <div ref={containerRef} className="relative w-full flex-grow overflow-hidden bg-gray-200 flex items-center justify-center">
        {/* Canvas container - centers canvas using flex */}
        <canvas ref={canvasRef} className="max-w-full max-h-full block" /> 

        {/* Touch instructions overlay */}
        {imageUrl && loadedImage && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 px-4 py-2 rounded-full z-20 text-white text-sm font-mono pointer-events-none md:hidden">
            <span className="inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
              Tap and drag to position
            </span>
          </div>
        )}

        {/* Draggable/Resizable Overlay - positioned absolutely relative to the container */}
        {imageUrl && loadedImage && ( // Only show overlay when image is loaded
          <div className="absolute" style={{ left: overlayPosition.x, top: overlayPosition.y }}>
            <div
              ref={draggableRef}
              style={{ 
                width: `${overlaySize.width}px`, 
                height: `${overlaySize.height}px`,
                boxShadow: isInteracting ? '0 0 0 2px var(--theme-primary), 0 0 15px rgba(0, 100, 255, 0.5)' : 'none',
                transition: 'box-shadow 0.15s ease-in-out'
              }}
              className="relative cursor-move opacity-80"
              onMouseDown={(e) => {
                if (!isInteracting) {
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startPosX = overlayPosition.x;
                  const startPosY = overlayPosition.y;
                  
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    setOverlayPosition({
                      x: startPosX + dx,
                      y: startPosY + dy
                    });
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }
              }}
              onTouchStart={(e) => {
                if (!isInteracting) {
                  e.preventDefault(); // Prevent default touch behavior including scroll
                  const touch = e.touches[0];
                  const startX = touch.clientX;
                  const startY = touch.clientY;
                  const startPosX = overlayPosition.x;
                  const startPosY = overlayPosition.y;
                  
                  const handleTouchMove = (moveEvent: TouchEvent) => {
                    moveEvent.preventDefault();
                    const moveTouch = moveEvent.touches[0];
                    const dx = moveTouch.clientX - startX;
                    const dy = moveTouch.clientY - startY;
                    setOverlayPosition({
                      x: startPosX + dx,
                      y: startPosY + dy
                    });
                  };
                  
                  const handleTouchEnd = () => {
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                  };
                  
                  document.addEventListener('touchmove', handleTouchMove, { passive: false });
                  document.addEventListener('touchend', handleTouchEnd);
                }
              }}
            >
              <img
                src={keyboardSvg}
                alt="Keyboard Overlay"
                className="w-full h-full object-contain pointer-events-none select-none" // Prevent image interaction/selection
                draggable="false" // Prevent native image dragging
                onDragStart={preventImageDrag} // Extra precaution
              />
              
              {/* Custom resize handle */}
              <div 
                className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 opacity-80 rounded-br-md cursor-se-resize z-30 shadow-lg flex items-center justify-center overflow-hidden"
                onMouseDown={(e) => {
                  e.stopPropagation(); // Prevent drag from starting
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startWidth = overlaySize.width;
                  const startHeight = overlaySize.height;
                  
                  setIsInteracting(true);
                  
                  const handleResizeMove = (moveEvent: MouseEvent) => {
                    moveEvent.preventDefault();
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    
                    // Apply to width first, then calculate height based on aspect ratio
                    const newWidth = Math.max(50, startWidth + dx);
                    const newHeight = newWidth / aspectRatio;
                    
                    setOverlaySize({
                      width: newWidth,
                      height: newHeight
                    });
                  };
                  
                  const handleResizeUp = () => {
                    setIsInteracting(false);
                    document.removeEventListener('mousemove', handleResizeMove);
                    document.removeEventListener('mouseup', handleResizeUp);
                  };
                  
                  document.addEventListener('mousemove', handleResizeMove);
                  document.addEventListener('mouseup', handleResizeUp);
                }}
                onTouchStart={(e) => {
                  e.preventDefault(); // Prevent default touch behavior
                  e.stopPropagation(); // Prevent drag from starting
                  const touch = e.touches[0];
                  const startX = touch.clientX;
                  const startY = touch.clientY;
                  const startWidth = overlaySize.width;
                  const startHeight = overlaySize.height;
                  
                  setIsInteracting(true);
                  
                  const handleResizeTouchMove = (moveEvent: TouchEvent) => {
                    moveEvent.preventDefault();
                    const moveTouch = moveEvent.touches[0];
                    const dx = moveTouch.clientX - startX;
                    const dy = moveTouch.clientY - startY;
                    
                    // Apply to width first, then calculate height based on aspect ratio
                    const newWidth = Math.max(50, startWidth + dx);
                    const newHeight = newWidth / aspectRatio;
                    
                    setOverlaySize({
                      width: newWidth,
                      height: newHeight
                    });
                  };
                  
                  const handleResizeTouchEnd = () => {
                    setIsInteracting(false);
                    document.removeEventListener('touchmove', handleResizeTouchMove);
                    document.removeEventListener('touchend', handleResizeTouchEnd);
                  };
                  
                  document.addEventListener('touchmove', handleResizeTouchMove, { passive: false });
                  document.addEventListener('touchend', handleResizeTouchEnd);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5z" />
                  <path d="M11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Overlay Control Panel - Visible on larger screens, hidden on small screens */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 md:block hidden">
          <ControlPanel />
        </div>

        {/* Loading/Error/Instruction states - Conditionally render the entire div */}
        {(!imageUrl || !loadedImage) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" 
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            >
                {!imageUrl ? (
                    <div className="relative px-10 py-6 border-2 rounded-lg"
                      style={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        borderColor: 'var(--theme-primary)'
                      }}
                    >
                      <div className="absolute -top-2 -left-2 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
                      <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
                      <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
                      <div className="absolute -bottom-2 -right-2 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
                      <p className="text-2xl font-mono tracking-wide uppercase" style={{ color: 'var(--theme-primary)' }}>SELECT IMAGE TO BEGIN</p>
                      <div className="absolute inset-0 border-2 rounded-lg animate-tech-ping" style={{ borderColor: 'var(--theme-primary)', opacity: 0.3 }}></div>
                      <div className="absolute -inset-1 rounded-lg animate-tech-ripple"></div>
                      <div className="absolute -inset-3 rounded-lg animate-tech-ripple-delayed"></div>
                    </div>
                ) : !loadedImage ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="animate-pulse flex space-x-1">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
                        <div className="h-2 w-2 rounded-full animation-delay-200" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
                        <div className="h-2 w-2 rounded-full animation-delay-400" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
                      </div>
                      <p className="text-lg font-mono tracking-wide uppercase" style={{ color: 'var(--theme-primary)' }}>INITIALIZING...</p>
                    </div>
                ) : null /* Should not reach here due to outer condition */}
            </div>
        )}
      </div>

      {/* Bottom Control Panel - Only visible on small screens */}
      <div className="md:hidden block border-t">
        {/* Custom control panel layout for small screens with algorithm selector on its own line */}
        <div className="p-3 flex flex-col items-center space-y-4 z-20 border-0"
          style={{ 
            backgroundColor: 'var(--theme-header-bg)',
            borderColor: 'var(--theme-primary)'
          }}
        >
          {/* Top row: Generate and Reset buttons */}
          <div className="flex justify-center space-x-4">
            {/* Process Button */}
            <button
              onClick={handleProcess}
              disabled={isProcessing || !imageUrl || !loadedImage} // Disable if no image or processing
              className="relative px-4 py-2 rounded-md font-mono tracking-wider transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden"
              style={{
                backgroundColor: isProcessing 
                  ? 'gray'
                  : (!imageUrl || !loadedImage)
                  ? 'darkgray'
                  : 'var(--theme-button-bg)',
                color: 'var(--theme-button-text)',
                cursor: isProcessing 
                  ? 'wait'
                  : (!imageUrl || !loadedImage)
                  ? 'not-allowed'
                  : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            >
              <span className="relative z-10">
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    PROCESSING...
                  </>
                ) : 'GENERATE'}
              </span>
            </button>

            {/* Clear Button */}
            <button
              onClick={onClearImage} // Use the prop passed from UploadPage
              className="relative px-4 py-2 rounded-md font-mono tracking-wider transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden"
              style={{
                backgroundColor: 'var(--theme-secondary)',
                color: 'var(--theme-button-text)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
              disabled={isProcessing} // Disable while processing
            >
              <span className="relative z-10">RESET</span>
            </button>
          </div>

          {/* Bottom row: Algorithm selector */}
          <div className="relative">
            <select
              value={algorithmMode}
              onChange={handleAlgorithmChange}
              className="p-2 pl-3 pr-8 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:border-transparent appearance-none"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-secondary) 10%, var(--theme-card-bg))',
                color: 'var(--theme-text)',
                borderColor: 'var(--theme-primary)',
              }}
              disabled={isProcessing}
              aria-label="Color Sampling Algorithm"
            >
              <option value="simple">SIMPLE_AVERAGE</option>
              <option value="quantize">DOMINANT_COLOR</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                style={{ color: 'var(--theme-primary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;