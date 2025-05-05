import { useState, useEffect, useMemo } from 'react';
import { getDominantColor, getPalette } from '../utils/dominantColor';
import { nearestYuzuColor } from '../utils/colorMapping';
import chroma from 'chroma-js';

// Define interfaces for the theme colors
export interface ThemeColors {
  primary: string;        // Main accent color (from dominant color)
  secondary: string;      // Secondary accent color (from palette)
  background: string;     // Page background color (lightened version of dominant)
  text: string;           // Text color (light or dark based on contrast)
  headerBg: string;       // Header background
  cardBg: string;         // Card background
  buttonBg: string;       // Button background
  buttonText: string;     // Button text
}

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

interface UseImageThemeOptions {
  imageUrl: string | undefined;
  colorRegistry?: any;     // Optional Yuzu color registry
  applyToDocument?: boolean; // Whether to automatically apply CSS variables to document
  contrastThreshold?: number; // Threshold for determining text color (0-1)
}

/**
 * Custom hook to extract a theme from an image and generate a cohesive color palette
 */
export function useImageTheme({
  imageUrl,
  colorRegistry,
  applyToDocument = true,
  contrastThreshold = 0.5
}: UseImageThemeOptions): {
  colors: ThemeColors;
  isLoading: boolean;
  error: string | null;
  yuzuColorCode: string | null;
} {
  const [colors, setColors] = useState<ThemeColors>(defaultTheme);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [yuzuColorCode, setYuzuColorCode] = useState<string | null>(null);

  // Process the image whenever the URL changes
  useEffect(() => {
    if (!imageUrl) {
      // Reset to default if no image
      setColors(defaultTheme);
      setYuzuColorCode(null);
      setError(null);
      return;
    }

    const extractColors = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Create an Image object to load the image
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Enable CORS if needed

        img.onload = () => {
          try {
            // Create canvas to sample image data
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }

            // Set canvas dimensions
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw the image to canvas
            ctx.drawImage(img, 0, 0);
            
            // Get image data from the canvas
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixelCount = canvas.width * canvas.height;
            
            // Extract dominant color
            const dominantColor = getDominantColor(imageData.data, pixelCount);
            if (!dominantColor) {
              throw new Error('Could not extract dominant color');
            }

            // Extract color palette for secondary colors (up to 5 colors)
            const palette = getPalette(imageData.data, pixelCount, { colorCount: 5, quality: 5 });
            
            // Pick secondary color (2nd color in palette, or derived from dominant if not available)
            // Use a more vibrant complementary color when possible
            const secondaryRgb = palette.length > 1 ? 
              palette[1] : 
              // Create more contrast with dominant color when deriving secondary color
              dominantColor.map(
                (c, i) => Math.max(0, Math.min(255, c + (i === 0 ? 60 : i === 1 ? -45 : 25)))
              );

            // Convert RGB arrays to hex for Chroma
            const primaryHex = rgbToHex(dominantColor);
            const secondaryHex = rgbToHex(secondaryRgb as [number, number, number]);

            // Create a Chroma object for color manipulation
            const primaryColor = chroma(primaryHex);
            const secondaryColor = chroma(secondaryHex);

            // Find nearest Yuzu color if registry provided
            let yuzuCode = null;
            if (colorRegistry) {
              yuzuCode = nearestYuzuColor(dominantColor, colorRegistry);
              setYuzuColorCode(yuzuCode);
            }

            // Create a background color with moderate influence from the primary color
            const backgroundColor = chroma.mix(
              primaryColor.luminance(0.92), 
              primaryColor, 
              0.25 // Dialed back from 0.35 to 0.25 (about 30% reduction)
            ).desaturate(0.5); // More desaturation to tone down the color character
            
            // Determine text color based on background contrast, with moderate character from the primary
            const textColor = backgroundColor.luminance() > contrastThreshold ? 
              chroma('#18181b').set('hsl.h', primaryColor.get('hsl.h')).set('hsl.s', 0.3).hex() : // Reduced saturation from 0.4
              chroma('#f8fafc').set('hsl.h', primaryColor.get('hsl.h')).set('hsl.s', 0.2).hex(); // Reduced saturation from 0.3
            
            // Create header background with moderate primary color influence
            const headerBgColor = chroma.mix(backgroundColor.darken(0.15), primaryColor, 0.2); // Reduced from 0.3
            
            // Create card background with moderate primary color tint
            const cardBgColor = chroma.mix(
              chroma.mix(backgroundColor, '#ffffff', 0.7), // More white mixing (from 0.6)
              primaryColor, 
              0.2 // Reduced from 0.3 (about 33% reduction)
            ).desaturate(0.3); // More desaturation to tone down vibrancy
            
            // Button colors - make them moderately vibrant without extreme saturation
            const buttonBgColor = primaryColor.saturate(1.2).set('hsl.l', primaryColor.get('hsl.l') < 0.6 ? 0.55 : 0.45);
            const buttonTextColor = buttonBgColor.luminance() > contrastThreshold ? '#18181b' : '#ffffff';
            
            // Generate full theme object
            const newTheme: ThemeColors = {
              primary: primaryColor.hex(),
              secondary: secondaryColor.hex(),
              background: backgroundColor.hex(),
              text: textColor,
              headerBg: headerBgColor.hex(),
              cardBg: cardBgColor.hex(),
              buttonBg: buttonBgColor.hex(),
              buttonText: buttonTextColor,
            };
            
            // Update state
            setColors(newTheme);
            
            // Apply to document if requested
            if (applyToDocument) {
              applyThemeToDocument(newTheme);
            }
          } catch (err) {
            console.error('Error processing image colors:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setColors(defaultTheme);
          } finally {
            setIsLoading(false);
          }
        };

        img.onerror = (err) => {
          console.error('Error loading image:', err);
          setError('Failed to load image');
          setColors(defaultTheme);
          setIsLoading(false);
        };

        // Initiate image loading
        img.src = imageUrl;
      } catch (err) {
        console.error('Error in theme extraction:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setColors(defaultTheme);
        setIsLoading(false);
      }
    };

    extractColors();
  }, [imageUrl, colorRegistry, applyToDocument, contrastThreshold]);

  // Apply theme to document via CSS variables with a dramatic flash effect
  const applyThemeToDocument = (theme: ThemeColors) => {
    if (typeof document === 'undefined') return;
    
    // Create a more subtle flash effect with a slightly brighter version of the color
    const flashColor = chroma(theme.primary).brighten(1.0).hex();
    
    // Apply a brief flash overlay with the theme color
    const flashOverlay = document.createElement('div');
    flashOverlay.style.position = 'fixed';
    flashOverlay.style.inset = '0';
    flashOverlay.style.backgroundColor = flashColor;
    flashOverlay.style.opacity = '0.15'; // Reduced from 0.2
    flashOverlay.style.pointerEvents = 'none';
    flashOverlay.style.zIndex = '9999';
    flashOverlay.style.transition = 'opacity 300ms ease-out';
    document.body.appendChild(flashOverlay);
    
    // Set CSS variables on :root
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
    document.documentElement.style.setProperty('--theme-background', theme.background);
    document.documentElement.style.setProperty('--theme-text', theme.text);
    document.documentElement.style.setProperty('--theme-header-bg', theme.headerBg);
    document.documentElement.style.setProperty('--theme-card-bg', theme.cardBg);
    document.documentElement.style.setProperty('--theme-button-bg', theme.buttonBg);
    document.documentElement.style.setProperty('--theme-button-text', theme.buttonText);
    
    // Also set background color directly on HTML element to ensure it's visible
    document.documentElement.style.backgroundColor = theme.background;
    
    // Add a transition class to root to enable smoother theme changes
    document.documentElement.classList.add('theme-transition');
    
    // Fade out and remove the flash overlay
    setTimeout(() => {
      flashOverlay.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(flashOverlay);
      }, 300);
    }, 50);
  };

  // Clean up CSS variables when component unmounts
  useEffect(() => {
    // Return cleanup function
    return () => {
      if (applyToDocument && typeof document !== 'undefined') {
        document.documentElement.style.removeProperty('--theme-primary');
        document.documentElement.style.removeProperty('--theme-secondary');
        document.documentElement.style.removeProperty('--theme-background');
        document.documentElement.style.removeProperty('--theme-text');
        document.documentElement.style.removeProperty('--theme-header-bg');
        document.documentElement.style.removeProperty('--theme-card-bg');
        document.documentElement.style.removeProperty('--theme-button-bg');
        document.documentElement.style.removeProperty('--theme-button-text');
        
        // Reset the HTML background color as well
        document.documentElement.style.removeProperty('background-color');
        
        document.documentElement.classList.remove('theme-transition');
      }
    };
  }, [applyToDocument]);

  return { colors, isLoading, error, yuzuColorCode };
}

// Helper function to convert RGB array to hex
function rgbToHex(rgb: [number, number, number]): string {
  if (!rgb || rgb.length !== 3) {
    return '#000000';
  }
  
  const r = Math.max(0, Math.min(255, Math.round(rgb[0])));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1])));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2])));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}