import React from 'react';

/**
 * Instructions section with step-by-step guide for the workflow
 */
const InstructionsBox: React.FC = () => (
  <div className="w-full">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>How to work it</h2>
      <div className="text-xs" style={{ color: 'color-mix(in srgb, var(--theme-text) 60%, transparent)' }}>
        Not affiliated with Yuzu KeyCaps.
      </div>
    </div>
    
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      <div className="rounded-lg p-4 border" style={{ 
        backgroundColor: 'color-mix(in srgb, var(--theme-background) 85%, var(--theme-primary) 3%)',
        borderColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'
      }}>
        <div className="flex items-center mb-2">
          <span className="text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center mr-2" 
            style={{ 
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-button-text)'
            }}>1</span>
          <h3 className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>Choose Image</h3>
        </div>
        <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--theme-text) 90%, transparent)' }}>
          Upload an image or select from one our free JPGs.
        </p>
      </div>
      
      <div className="rounded-lg p-4 border" style={{ 
        backgroundColor: 'color-mix(in srgb, var(--theme-background) 85%, var(--theme-primary) 3%)',
        borderColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'
      }}>
        <div className="flex items-center mb-2">
          <span className="text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center mr-2" 
            style={{ 
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-button-text)'
            }}>2</span>
          <h3 className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>Position Keys</h3>
        </div>
        <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--theme-text) 90%, transparent)' }}>
          Drag and resize the keyboard overlay to capture the perfect part of your image.
        </p>
      </div>
      
      <div className="rounded-lg p-4 border" style={{ 
        backgroundColor: 'color-mix(in srgb, var(--theme-background) 85%, var(--theme-primary) 3%)',
        borderColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'
      }}>
        <div className="flex items-center mb-2">
          <span className="text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center mr-2" 
            style={{ 
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-button-text)'
            }}>3</span>
          <h3 className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>Generate Preview</h3>
        </div>
        <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--theme-text) 90%, transparent)' }}>
          Slam the "Generate" button to extract colors to your preview. Repeat (2), as desired.
        </p>
      </div>
      
      <div className="rounded-lg p-4 border" style={{ 
        backgroundColor: 'color-mix(in srgb, var(--theme-background) 85%, var(--theme-primary) 3%)',
        borderColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'
      }}>
        <div className="flex items-center mb-2">
          <span className="text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center mr-2" 
            style={{ 
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-button-text)'
            }}>4</span>
          <h3 className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>Export to Yuzu</h3>
        </div>
        <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--theme-text) 90%, transparent)' }}>
          Export your design's Yuzu JSON, then <a href="https://yuzukeycaps.com/playground" target="_blank" rel="noopener noreferrer" 
            style={{ 
              color: 'var(--theme-primary)',
              textDecoration: 'underline'
            }}
            className="hover:opacity-80">import it into Yuzu Playground</a> to order your custom set.
        </p>
      </div>
    </div>
  </div>
);

export default InstructionsBox; 