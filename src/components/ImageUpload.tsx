import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // Removed unused import

// Define interface for the data passed by onImageSelect
interface ImageInfo {
  imageUrl: string;
  fileName: string;
  file: File;
}

// Define props interface for ImageUpload
interface ImageUploadProps {
  onImageSelect: (imageInfo: ImageInfo) => void; // Make this required
  inline?: boolean; // Optional prop
}

/**
 * Component for handling image upload and navigation to editor
 */
const ImageUpload = ({ onImageSelect, inline = false }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  // Keep navigate for potential future use, but primary action is via onImageSelect
  // const navigate = useNavigate(); // Removed unused hook

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Type assertion for event.target.files
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    const imageUrl = URL.createObjectURL(file);
    
    // Call the callback passed from App.tsx
    onImageSelect({ imageUrl, fileName: file.name, file });

    // Removed navigation logic - handled in App.tsx after state update
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const imageUrl = URL.createObjectURL(file);

    // Call the callback passed from App.tsx
    onImageSelect({ imageUrl, fileName: file.name, file });

    // Removed navigation logic - handled in App.tsx after state update
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
  };

  if (inline) {
    // Minimal inline variant (only drop-zone)
    return (
      <div
        className={`flex flex-col items-center justify-center w-full h-full p-4 border-2 border-dashed rounded-lg text-center ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true" // Add aria-hidden for decorative icons
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Drag and drop an image here, or click to select a file
        </p>

        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept="image/*"
          onChange={handleImageUpload}
        />

        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-6 py-3 text-lg bg-blue-600 border border-transparent rounded-lg font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer relative animate-tech-ping shadow-lg shadow-blue-400/50 transition-all duration-300 hover:scale-105"
        >
          Select Image
          <span className="absolute -inset-1 rounded-xl animate-tech-ripple pointer-events-none"></span>
          <span className="absolute -inset-3 rounded-xl animate-tech-ripple-delayed pointer-events-none"></span>
        </label>
      </div>
    );
  }

  // Full-screen (landing page) variant
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Img2Caps</h1>
          <p className="text-gray-600">Upload an image to create custom keycap designs</p>
        </div>
        {/** Drop-zone **/}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true" // Add aria-hidden for decorative icons
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop an image here, or click to select a file
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-6 py-3 text-lg bg-blue-600 border border-transparent rounded-lg font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer relative animate-tech-ping shadow-lg shadow-blue-400/50 transition-all duration-300 hover:scale-105"
          >
            Select Image
            <span className="absolute -inset-1 rounded-xl animate-tech-ripple pointer-events-none"></span>
            <span className="absolute -inset-3 rounded-xl animate-tech-ripple-delayed pointer-events-none"></span>
          </label>
        </div>
        <div className="mt-6 text-gray-600 text-sm">
          <p>Upload an image of your choice. We'll help you transform it into a custom keycap design.</p>
          <p className="mt-2">Your image stays in your browser and is never uploaded to our servers.</p>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload; 