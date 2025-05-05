import React, { useState, useEffect, useRef } from 'react';
import ImageUpload from '../components/ImageUpload.tsx';
import Editor from '../components/Editor.tsx';
import KeyboardPreview from '../components/KeyboardPreview.tsx';
import keyPositionRegistryJson from '../data/keyPositionRegistry.json';
import colorRegistryJson from '../data/colorRegistry.json';
import baseJsonTemplate from '../assets/yuzu_import_base.json';
import SampleImages from '../components/SampleImages.tsx';
import InstructionsBox from '../components/InstructionsBox.tsx';
import { useImageTheme, ThemeColors } from '../hooks/useImageTheme';
import chroma from 'chroma-js';

// --- Placeholder Prop Types (Define properly in component files later) ---
/* // Removed unused placeholder interfaces
interface ImageUploadProps {
  onImageSelect: (data: ImageSelectData) => void;
  inline?: boolean;
}

interface EditorProps {
  imageUrl: string;
  keyPositionRegistry: KeyPositionRegistry;
  colorRegistry: ColorRegistry;
  baseJson: BaseJson;
  onPreviewUpdate: (data: PreviewData) => void;
  onExportReady: (data: ExportData) => void;
  onClearImage: () => void;
}

interface KeyboardPreviewProps {
  keyboardId: string;
  customizedColors: PreviewData | null;
  colorRegistry: ColorRegistry | null;
  jsonData: ExportData | null;
}

interface SampleImagesProps {
  onImageSelect: (data: ImageSelectData) => void;
}
*/
// -------------------------------------------------------------------------

// Define interfaces for state types
interface ImageData {
  imageUrl: string;
  fileName: string;
}

// Define types for the JSON data (using any for now, can be refined)
type KeyPositionRegistry = any;
type ColorRegistry = any;
type BaseJson = any;
type PreviewData = any; // Or a more specific type if known
type ExportData = any; // Or a more specific type if known

// Default theme values to use before image processing or as fallback
const defaultTheme: ThemeColors = {
  primary: '#3b82f6',      // blue-500
  secondary: '#6366f1',    // indigo-500
  background: '#f9fafb',   // gray-50
  text: '#18181b',         // zinc-900
  headerBg: '#ffffff',     // white
  cardBg: '#ffffff',       // white
  buttonBg: '#3b82f6',     // blue-500
  buttonText: '#ffffff',   // white
};

// Define type for image selection callback data
interface ImageSelectData {
    imageUrl: string;
    fileName: string;
}

/**
 * Combined page that starts with an upload pane and seamlessly transitions into the editor & preview
 */
const UploadPage: React.FC = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null); // { imageUrl, fileName }
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Supporting data
  const [keyPositionRegistry, setKeyPositionRegistry] = useState<KeyPositionRegistry | null>(null);
  const [colorRegistry, setColorRegistry] = useState<ColorRegistry | null>(null);
  const [baseJson, setBaseJson] = useState<BaseJson | null>(null);

  // Editor→Preview data linkage
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [jsonData, setJsonData] = useState<ExportData | null>(null);

  // Ref to hold the preloaded audio object
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);

  // Load static data and preload audio once
  useEffect(() => {
    setKeyPositionRegistry(keyPositionRegistryJson as KeyPositionRegistry);
    setColorRegistry(colorRegistryJson as ColorRegistry);
    setBaseJson(baseJsonTemplate as BaseJson);

    // Preload the audio
    // Adjust the path if clack.mp3 is located elsewhere (e.g., imported)
    clickSoundRef.current = new Audio('/assets/clack.mp3');
    clickSoundRef.current.load(); // Preload the audio file

  }, []);

  // Callback when a user selects an image
  const handleImageSelect = ({ imageUrl, fileName }: ImageSelectData): void => {
    setImageData({ imageUrl, fileName });
  };

  // Drag and Drop Handlers for Editor Area
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    // Check if the leave event is heading outside the droppable area boundaries
    const dropZone = event.currentTarget;
    if (!dropZone.contains(event.relatedTarget as Node)) {
        setIsDraggingOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    try {
      const dataString = event.dataTransfer.getData('text/plain');
      if (dataString) {
        const data = JSON.parse(dataString);
        if (data.imageUrl && data.fileName) {
          handleImageSelect(data); // Use the existing handler
        } else {
          console.warn('Dropped data is missing imageUrl or fileName:', data);
        }
      } else {
         console.warn('No data transferred on drop.');
         // Could potentially handle file drops from OS here if desired
         if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            console.log('File dropped:', event.dataTransfer.files[0]);
            // TODO: Add file handling logic here if needed
         }
      }
    } catch (error) {
      console.error('Error parsing dropped data:', error);
    }
  };

  // Pass-through callbacks for Editor
  const handlePreviewUpdate = (previewData: PreviewData): void => {
    setPreview(previewData);
  };

  const handleExportReady = (exportData: ExportData): void => {
    setJsonData(exportData);
  };

  // Allow starting over
  const handleReset = (): void => {
    setImageData(null);
    setPreview(null);
    setJsonData(null);
    
    // Reset theme to default when RESET button is clicked
    if (typeof document !== 'undefined') {
      // Apply default theme colors to document
      document.documentElement.style.setProperty('--theme-primary', defaultTheme.primary);
      document.documentElement.style.setProperty('--theme-secondary', defaultTheme.secondary);
      document.documentElement.style.setProperty('--theme-background', defaultTheme.background);
      document.documentElement.style.setProperty('--theme-text', defaultTheme.text);
      document.documentElement.style.setProperty('--theme-header-bg', defaultTheme.headerBg);
      document.documentElement.style.setProperty('--theme-card-bg', defaultTheme.cardBg);
      document.documentElement.style.setProperty('--theme-button-bg', defaultTheme.buttonBg);
      document.documentElement.style.setProperty('--theme-button-text', defaultTheme.buttonText);
      
      // Reset HTML background color
      document.documentElement.style.backgroundColor = defaultTheme.background;
      
      // Add transition class for smooth reset
      document.documentElement.classList.add('theme-transition');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 800);
    }
  };

  // Function to play the click sound when header is clicked
  const handleLogoMouseDown = () => {
    // Play sound
    if (clickSoundRef.current) {
        // Reset playback to the beginning to allow rapid clicks
        clickSoundRef.current.currentTime = 0;
        clickSoundRef.current.play().catch(error => console.error("Error playing sound:", error));
    }
    // Note: Removed custom animation as the KeyMason library already has a built-in press effect
  };

  // Apply theming based on the selected image
  const imageUrl = imageData?.imageUrl; // Use optional chaining
  
  // Use our custom theme hook to extract and apply colors from the selected image
  const { colors, isLoading: themeLoading } = useImageTheme({
    imageUrl,
    colorRegistry: colorRegistry,
    applyToDocument: true,
    contrastThreshold: 0.5
  });
  
  // Apply theme transition class to root element when theme changes
  useEffect(() => {
    if (imageUrl) {
      document.documentElement.classList.add('theme-transition');
      
      // Remove the class after transition completes to avoid affecting other transitions
      const timeout = setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 800); // Slightly longer than our CSS transition
      
      return () => clearTimeout(timeout);
    }
  }, [imageUrl, colors.primary]);

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ----------------------------------------------------------------

  // Create a subtle gradient background effect
  const backgroundStyle = imageUrl ? {
    background: `
      linear-gradient(125deg, ${chroma(colors.primary).alpha(0.1).css()} 15%, transparent 80%),
      linear-gradient(235deg, ${chroma(colors.secondary).alpha(0.1).css()} 15%, transparent 80%),
      radial-gradient(circle at 25% 25%, ${chroma(colors.primary).alpha(0.03).css()} 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, ${chroma(colors.secondary).alpha(0.03).css()} 0%, transparent 50%),
      ${colors.background}
    `,
    backgroundSize: '200% 200%',
    transition: 'background 0.8s ease'
  } : { 
    backgroundColor: colors.background 
  };

  return (
    <div 
      className={`min-h-screen p-4 md:p-8 ${imageUrl ? 'animated-bg' : ''}`}
      style={backgroundStyle}
    >
      <div className="w-full mx-auto">
        {/* Header - Constrained width */}
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex justify-center items-center mb-12 mt-4 md:mt-6 lg:mt-8">
              <div 
                className="keyboard selectable" 
                onMouseDown={handleLogoMouseDown} 
                style={{ 
                  cursor: 'pointer',
                  filter: imageUrl ? `drop-shadow(0 4px 3px rgba(0, 0, 0, 0.07)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.06))` : 'none'
                }}
              >
                  <k-row style={{ 
                    "--gutter": "3px", 
                    "--shadow": "#a8a8a8"
                  } as React.CSSProperties}>
                      <k-cap 
                        className="1.5"
                        style={{ 
                          "--base": colors.primary,
                          "--lightest": chroma(colors.primary).brighten(1.2).hex(),
                          "--lighter": chroma(colors.primary).brighten(0.5).hex(),
                          "--dark": chroma(colors.primary).darken(0.2).hex(),
                          "--darker": chroma(colors.primary).darken(0.5).hex(),
                          "--darkest": chroma(colors.primary).darken(0.8).hex(),
                          "--legend": chroma(colors.primary).luminance() > 0.5 ? '#303030' : '#e0e0e0',
                          transition: 'all 0.2s ease'
                        } as React.CSSProperties}
                      >
                          <k-legend className="center">Img</k-legend>
                      </k-cap>
                      <k-cap 
                        className="1"
                        style={{ 
                          "--base": colors.primary,
                          "--lightest": chroma(colors.primary).brighten(1.2).hex(),
                          "--lighter": chroma(colors.primary).brighten(0.5).hex(),
                          "--dark": chroma(colors.primary).darken(0.2).hex(),
                          "--darker": chroma(colors.primary).darken(0.5).hex(),
                          "--darkest": chroma(colors.primary).darken(0.8).hex(),
                          "--legend": chroma(colors.primary).luminance() > 0.5 ? '#303030' : '#e0e0e0',
                          transition: 'all 0.2s ease'
                        } as React.CSSProperties}
                      >
                          <k-legend className="center">2</k-legend>
                      </k-cap>
                      <k-cap 
                        className="2"
                        style={{ 
                          "--base": colors.primary,
                          "--lightest": chroma(colors.primary).brighten(1.2).hex(),
                          "--lighter": chroma(colors.primary).brighten(0.5).hex(),
                          "--dark": chroma(colors.primary).darken(0.2).hex(),
                          "--darker": chroma(colors.primary).darken(0.5).hex(),
                          "--darkest": chroma(colors.primary).darken(0.8).hex(),
                          "--legend": chroma(colors.primary).luminance() > 0.5 ? '#303030' : '#e0e0e0',
                          transition: 'all 0.2s ease'
                        } as React.CSSProperties}
                      >
                          <k-legend className="center">Caps</k-legend>
                      </k-cap>
                  </k-row>
              </div>
          </div>
        </div>

        {/* Sample Images - shown at top on mobile, below editor on desktop */}
        <div className="md:hidden max-w-5xl mx-auto mb-6">
          <div 
            className="w-full rounded-lg shadow-sm border p-3"
            style={{ 
              backgroundColor: colors.cardBg,
              borderColor: imageUrl ? `color-mix(in srgb, ${colors.primary} 15%, transparent)` : 'var(--theme-card-bg)',
              boxShadow: imageUrl ? `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` : ''
            }}
          >
            <SampleImages onImageSelect={handleImageSelect} />
          </div>
        </div>

        {/* Main content: Editor and Preview - EXPANDED for wide screens */}
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Editor area */}
            <div className="w-full">
              <div
                className={`rounded-lg shadow-sm overflow-hidden h-[50vh] md:h-[50vh] lg:h-[55vh] xl:h-[60vh] 2xl:h-[65vh] transition-all duration-150 ease-in-out ${isDraggingOver ? 'border-4 ring-4' : 'border'}`}
                style={{ 
                  backgroundColor: colors.cardBg,
                  borderColor: imageUrl && !isDraggingOver ? `color-mix(in srgb, ${colors.primary} 15%, transparent)` : '',
                  borderColor: isDraggingOver ? colors.primary : '',
                  boxShadow: imageUrl ? `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` : '',
                  ringColor: isDraggingOver ? `color-mix(in srgb, ${colors.primary} 40%, transparent)` : ''
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {imageData && imageUrl ? (
                  keyPositionRegistry && colorRegistry && baseJson && (
                    <Editor
                      imageUrl={imageUrl}
                      keyPositionRegistry={keyPositionRegistry}
                      colorRegistry={colorRegistry}
                      baseJson={baseJson}
                      onPreviewUpdate={handlePreviewUpdate}
                      onExportReady={handleExportReady}
                      onClearImage={handleReset}
                    />
                  )
                ) : (
                  <div
                    className="flex items-center justify-center h-full"
                    // Also add drop handlers here for the initial state
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <ImageUpload onImageSelect={handleImageSelect} inline={true} />
                  </div>
                )}
              </div>
            </div>

            {/* Preview area */}
            <div 
              className="w-full rounded-lg shadow-sm border lg:h-[55vh] xl:h-[60vh] 2xl:h-[65vh] flex flex-col"
              style={{ 
                backgroundColor: colors.cardBg,
                borderColor: imageUrl ? `color-mix(in srgb, ${colors.primary} 15%, transparent)` : 'var(--theme-card-bg)',
                boxShadow: imageUrl ? `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` : ''
              }}
            >
              <KeyboardPreview
                keyboardId="yuzu"
                customizedColors={preview}
                jsonData={jsonData}
              />
            </div>
          </div>
        </div>

        {/* Sample Images - Only shown on desktop screens */}
        <div className="hidden md:block max-w-5xl mx-auto mt-6">
          <div 
            className="w-full rounded-lg shadow-sm border p-3"
            style={{ 
              backgroundColor: colors.cardBg,
              borderColor: imageUrl ? `color-mix(in srgb, ${colors.primary} 15%, transparent)` : 'var(--theme-card-bg)',
              boxShadow: imageUrl ? `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` : ''
            }}
          >
            <SampleImages onImageSelect={handleImageSelect} />
          </div>
        </div>

        {/* Instructions Section */}
        <div className="max-w-5xl mx-auto mt-6">
          <div 
            className="w-full rounded-lg shadow-sm border p-6"
            style={{ 
              backgroundColor: colors.cardBg,
              borderColor: imageUrl ? `color-mix(in srgb, ${colors.primary} 15%, transparent)` : 'var(--theme-card-bg)',
              boxShadow: imageUrl ? `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` : ''
            }}
          >
            <InstructionsBox />
          </div>
        </div>

      </div>
    </div>
  );
};

export default UploadPage; 