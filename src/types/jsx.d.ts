import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'k-row': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'k-cap': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'k-legend': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

// Ensure this file is treated as a module.
export {}; 