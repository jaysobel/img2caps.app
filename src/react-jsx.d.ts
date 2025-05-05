
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'k-row': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'k-cap': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'k-legend': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

// Export {} to make it a module, sometimes necessary.
export {}; 