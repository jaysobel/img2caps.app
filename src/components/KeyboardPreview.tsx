import React, { useEffect, useRef, useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import keyboardSvg from '../assets/yuzu_keyboard.svg';

// Define types for props
interface ColorData {
  rgb?: string;
  color?: string;
  parts?: { [partName: string]: string };
}

interface CustomizedColors {
  customized?: { [keyId: string]: ColorData };
  [keyId: string]: ColorData | { [keyId: string]: ColorData } | undefined; // Allow direct keyId or nested customized
}

interface KeyboardPreviewProps {
  keyboardId?: string;
  customizedColors?: CustomizedColors;
  jsonData?: any; // Consider defining a more specific type if the JSON structure is known
}

// Define type for keyboard data state
interface KeyboardData {
  svgPath: string;
  // Add other properties if available in the keyboard data
}

/**
 * Component for rendering the keyboard preview and providing download options
 */
const KeyboardPreview: React.FC<KeyboardPreviewProps> = ({ keyboardId, customizedColors = {}, jsonData = null }) => {
  const svgRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardData, setKeyboardData] = useState<KeyboardData | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [hasExportedJson, setHasExportedJson] = useState<boolean>(false);
  
  // Function to update colors based on customizations
  const updateColors = useCallback(() => {
    if (!isLoaded || !svgRef.current || !customizedColors || Object.keys(customizedColors).length === 0) {
      return;
    }
    
    // Get the SVG element
    const svgElement = svgRef.current;
    
    // Extract colors from the customizedColors structure
    let keysToProcess: { [keyId: string]: ColorData } = {};
    if (customizedColors.customized && typeof customizedColors.customized === 'object') {
      // If we have a nested customized property, use that
      keysToProcess = customizedColors.customized as { [keyId: string]: ColorData };
    } else {
      // Otherwise use the object directly, filtering out the 'customized' key if it exists
      keysToProcess = Object.entries(customizedColors)
        .filter(([key]) => key !== 'customized')
        .reduce((acc, [key, value]) => {
          acc[key] = value as ColorData;
          return acc;
        }, {} as { [keyId: string]: ColorData });
    }
    
    // Process each customized key
    Object.entries(keysToProcess).forEach(([keyId, colorData]) => {
      // Find the key element in the SVG
      const keyElement = svgElement.querySelector<SVGElement>(`[data-key-id="${keyId}"]`);
      
      if (!keyElement) {
        return;
      }
      
      // For the structure returned by imageProcessing.js
      if (colorData.rgb) {
        // Strategy 1: Check if it's a flat SVG with a blend rect
        const flatRect = keyElement.querySelector('rect.mix-blend-multiply');
        if (flatRect) {
          flatRect.setAttribute('fill', colorData.rgb);
          return;
        }
        
        // Strategy 2: Handle 3D keys with multiple rectangles
        const rects = keyElement.querySelectorAll<SVGRectElement>('rect');
        if (rects.length >= 3) {
          // Paint the top of the key (rect[2])
          const keyTop = rects[2];
          if (keyTop) {
            keyTop.setAttribute('fill', colorData.rgb);
          }
          
          // Paint the sides of the key with a slightly darker shade (rect[1])
          const keySide = rects[1];
          if (keySide) {
            // Create darker version for the sides
            const darkerColor = createDarkerShade(colorData.rgb);
            keySide.setAttribute('fill', darkerColor);
          }
          return;
        }
        
        // Fallback: Apply to the key element itself
        if (keyElement.setAttribute) {
          keyElement.setAttribute('fill', colorData.rgb);
        }
        return;
      }
      
      // Legacy code for other color formats (kept for compatibility)
      if (colorData.color) {
        if ((!keyElement.hasAttribute('mask') && !keyElement.hasAttribute('fill')) || !(keyElement.getAttribute('fill') || '').includes('url(#')) {
          if (keyElement.setAttribute) {
            keyElement.setAttribute('fill', colorData.color);
          }
        } else {
          const fillableChildren = Array.from(keyElement.querySelectorAll<SVGElement>('*')).filter(
            el => !el.hasAttribute('mask') && 
                 (!el.hasAttribute('fill') || !(el.getAttribute('fill') || '').includes('url(#'))
          );
          
          fillableChildren.forEach(child => {
            if (child.setAttribute) {
              child.setAttribute('fill', colorData.color || '');
            }
          });
        }
      }
      
      // Handle specific parts like "top" or "bottom" if they exist
      if (colorData.parts) {
        Object.entries(colorData.parts).forEach(([partName, partColor]) => {
          const partElements = keyElement.querySelectorAll<SVGElement>(`[data-part="${partName}"], [id*="${partName}"]`);
          
          partElements.forEach(partElement => {
            if (!partElement.hasAttribute('mask') && 
                (!partElement.hasAttribute('fill') || !(partElement.getAttribute('fill') || '').includes('url(#'))) {
              if (partElement.setAttribute) {
                 partElement.setAttribute('fill', partColor);
              }
            } else {
              const fillableChildren = Array.from(partElement.querySelectorAll<SVGElement>('*')).filter(
                el => !el.hasAttribute('mask') && 
                     (!el.hasAttribute('fill') || !(el.getAttribute('fill') || '').includes('url(#'))
              );
              
              fillableChildren.forEach(child => {
                 if (child.setAttribute) {
                    child.setAttribute('fill', partColor);
                 }
              });
            }
          });
        });
      }
    });
  }, [customizedColors, isLoaded]);
  
  // Helper function to create a darker shade of a color
  function createDarkerShade(hexColor: string): string {
    if (!hexColor || hexColor.length !== 7 || hexColor[0] !== '#') {
      console.warn(`Invalid hex color format: ${hexColor}. Returning black.`);
      return '#000000'; // Return black or a default color for invalid input
    }
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);
    
    const darkerR = Math.floor(r * 0.85);
    const darkerG = Math.floor(g * 0.85);
    const darkerB = Math.floor(b * 0.85);
    
    return '#' + 
      darkerR.toString(16).padStart(2, '0') +
      darkerG.toString(16).padStart(2, '0') +
      darkerB.toString(16).padStart(2, '0');
  }
  
  // When colors change, update the preview
  useEffect(() => {
    if (isLoaded && customizedColors && Object.keys(customizedColors).length > 0) {
      updateColors();
    }
  }, [customizedColors, isLoaded, updateColors]);
  
  // Load keyboard data and SVG
  const loadKeyboard = useCallback(async () => {
    if (!keyboardId) {
      try {
        // Use imported SVG as a fallback
        const response = await fetch(keyboardSvg);
        const svgContent = await response.text();
        setSvgContent(svgContent);       
        setIsLoaded(true);
      } catch (err) {
        // Ensure err is treated as Error to access message safely
        const errorMessage = (err instanceof Error) ? err.message : 'An unknown error occurred during initial keyboard load';
        setError(errorMessage);
        setIsLoaded(false);
      }
      return;
    }

    try {
      setIsLoaded(false);
      setError(null);
      
      // Fetch keyboard data from API
      const keyboardResponse = await fetch(`/api/keyboards/${keyboardId}`);
      
      if (!keyboardResponse.ok) {
        throw new Error(`Failed to fetch keyboard data: ${keyboardResponse.statusText}`);
      }
      
      const data: KeyboardData = await keyboardResponse.json();
      setKeyboardData(data);
      
      // Fetch SVG content
      const svgResponse = await fetch(data.svgPath);
      
      if (!svgResponse.ok) {
        throw new Error(`Failed to fetch SVG: ${svgResponse.statusText}`);
      }
      
      const svgContent = await svgResponse.text();
      setSvgContent(svgContent);      
      setIsLoaded(true);
    } catch (err: any) {
      // Try to load default SVG as fallback
      try {
        const response = await fetch(keyboardSvg);
        const svgContent = await response.text();
        setSvgContent(svgContent);        
        setIsLoaded(true);
      } catch (fallbackErr: any) {
        // Correctly handle the fallback error
        const fallbackErrorMessage = (fallbackErr instanceof Error) ? fallbackErr.message : 'An unknown error occurred trying to load the fallback SVG';
        // We need to report the *original* error message that caused the fallback attempt
        const originalErrorMessage = (err instanceof Error) ? err.message : 'An unknown error occurred while fetching keyboard data';
        setError(`Original Error: ${originalErrorMessage}. Fallback Error: ${fallbackErrorMessage}`);
        setIsLoaded(false);
      }
    }
  }, [keyboardId]);
  
  // Initialize and load the keyboard on mount
  useEffect(() => {
    loadKeyboard();
  }, [keyboardId, loadKeyboard]);
  
  // Handle JSON download
  const handleDownloadJson = () => {
    const dataToDownload = jsonData || keyboardData;
    if (!dataToDownload) return;

    const jsonBlob = new Blob([JSON.stringify(dataToDownload, null, 2)], {
      type: 'application/json'
    });
    
    saveAs(jsonBlob, 'img2caps_design.json');
    setHasExportedJson(true);
  };
  
  const hasDownloadData = !!(jsonData || keyboardData);

  return (
    <>
      <div className="flex-1 flex flex-col w-full bg-grid-pattern bg-gray-50 relative lg:min-h-0">
        {/* Corner decorations - now framing the entire panel */}
        <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-gray-400"></div>
        </div>
        <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-400"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-20 h-20 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-gray-400"></div>
        </div>
        <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gray-400"></div>
        </div>
      
        {/* Error state */}
        {error && (
          <div className="text-sm text-red-600 font-medium p-6">
            Error loading preview: {error}
          </div>
        )}

        {/* Preview text as block-level element - responsive size, more compact on mobile */}
        <div className="w-full py-2 md:py-3 lg:py-6 text-center bg-transparent">
          <h2 className="text-[2rem] md:text-[3rem] lg:text-[4.5rem] xl:text-[6rem] 2xl:text-[8rem] font-bold text-gray-600/40 font-mono tracking-widest leading-none">
            PREVIEW
          </h2>
        </div>

        <div className="svg-container w-full overflow-auto flex-1 flex flex-col relative">
          {/* This outer container takes full height and uses flex-col layout */}
          
          {/* Spacer to push content to center on larger screens */}
          <div className="flex-grow lg:block hidden"></div>
          
          {/* Centered keyboard container */}
          <div className="w-full flex items-center justify-center">
            {!isLoaded ? (
              <div className="flex items-center justify-center h-40 bg-gray-100 bg-opacity-50 rounded m-6 z-20">
                <p className="text-gray-500">Loading preview...</p>
              </div>
            ) : (
              <div 
                ref={svgRef} 
                className="w-full svg-preview p-6 z-20"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            )}
          </div>
          
          {/* Spacer to push content to center on larger screens */}
          <div className="flex-grow lg:block hidden"></div>
          
          {/* Button Panel - at the bottom but still part of the centered layout */}
          <div className="w-full flex justify-center pb-4 pt-2">
            <div className="bg-zinc-800 bg-opacity-85 p-3 rounded-lg shadow-xl flex items-stretch space-x-4 z-20 border border-slate-700">
              <div className="relative group flex-shrink-0">
                <button
                  className={`relative px-4 py-2 rounded-md font-mono tracking-wider transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 overflow-hidden hover:-translate-y-0.5 ${
                    hasDownloadData 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-700 active:to-indigo-800 text-white' 
                      : 'bg-gray-700 cursor-not-allowed text-gray-400'
                  }`}
                  onClick={handleDownloadJson}
                  disabled={!hasDownloadData}
                >
                  <span className="relative z-10">EXPORT JSON</span>
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black bg-opacity-90 text-gray-300 text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-30">
                  Generate a preview to export JSON
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black border-opacity-90"></div>
                </div>
              </div>

              <div className="relative group flex-shrink-0">
                <a
                  href={hasExportedJson ? "https://yuzukeycaps.com/playground" : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => !hasExportedJson && e.preventDefault()}
                  className={`relative px-4 py-2 rounded-md font-mono tracking-wider transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c05736] overflow-hidden inline-flex items-center justify-center hover:-translate-y-0.5 ${
                    hasExportedJson
                      ? 'bg-gradient-to-r from-[#dc633e] to-[#d05a36] hover:from-[#e06a42] hover:to-[#da6239] active:from-[#c55935] active:to-[#b85430] text-white'
                      : 'bg-gray-700 cursor-not-allowed opacity-75 text-gray-400'
                  }`}
                >
                  <span className="relative z-10">BUY ON YUZU <span className="ml-1">↗</span></span>
                </a>
                {!hasExportedJson && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black bg-opacity-90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-30">
                    Export your design as JSON first
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black border-opacity-90"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default KeyboardPreview; 