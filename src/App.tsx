import React from 'react';
import './App.css';
import Footer from './Footer.tsx'; // Corrected path
import UploadPage from './pages/UploadPage.tsx'; // Corrected path (added .tsx)

function App() {
  return (
    <div className="App" style={{ backgroundColor: 'var(--theme-background)' }}>
      {/* Render the single UploadPage component */}
      <UploadPage />
      <Footer />
    </div>
  );
}

// Export the App component directly
export default App; 