import React, { useRef, useEffect } from 'react';

// List of sample image filenames located in public/images
const SAMPLE_FILES: string[] = [
    "jamie_xx_in_colour.png",
    "liam_wong_pink_dragon.jpg",
    "mccracken_luck.webp",
    "starry_night.jpg",
    "jmw_turner.jpg",
    "monet_lilies.jpg",
    "maggiori_arizona.png",
    "grant_yun_midwest.png",
    "blade_runner.jpg",
    "sequoia.jpg", 
    "bliss_4k.jpg",
];

interface SampleImagesProps {
  onImageSelect?: (data: { imageUrl: string; fileName: string }) => void;
}

/**
 * Display a horizontal scrollable row of sample images for quick selection
 * with horizontal mouse wheel scrolling support
 */
const SampleImages: React.FC<SampleImagesProps> = ({ onImageSelect }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle horizontal scrolling with mouse wheel
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      
      // Prevent the default vertical scroll
      e.preventDefault();
      
      // Scroll horizontally instead
      scrollContainer.scrollLeft += e.deltaY + e.deltaX;
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    // Clean up event listener on unmount
    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleClick = (fileName: string) => {
    if (!onImageSelect) return;
    const imageUrl = `/images/${fileName}`;
    onImageSelect({ imageUrl, fileName });
  };

  const handleDragStart = (e: React.DragEvent<HTMLImageElement>, fileName: string) => {
    const imageUrl = `/images/${fileName}`;
    // Set data to be transferred
    e.dataTransfer.setData('text/plain', JSON.stringify({ imageUrl, fileName }));
    // Optional: Set a drag image (can be a transparent pixel or a custom element)
    // const dragImage = new Image();
    // dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent pixel
    // e.dataTransfer.setDragImage(dragImage, 0, 0);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
          Use a free JPG <span className="text-xs hidden md:inline" style={{ color: 'color-mix(in srgb, var(--theme-text) 70%, transparent)' }}>(click to select)</span>
        </h2>
        <span className="text-xs hidden md:inline" style={{ color: 'color-mix(in srgb, var(--theme-text) 70%, transparent)' }}>← Scroll →</span>
      </div>
      <div 
        ref={scrollContainerRef}
        className="flex space-x-2 md:space-x-3 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide"
      >
        {SAMPLE_FILES.map((fileName) => (
          <div 
            key={fileName}
            className="relative flex-shrink-0 group"
          >
            <img
              src={`/images/${fileName}`}
              alt={fileName.replace(/\.[^/.]+$/, '')}
              className="w-20 h-20 md:w-24 md:h-24 xl:w-28 xl:h-28 2xl:w-32 2xl:h-32 object-cover rounded-md cursor-pointer transition-all duration-200 hover:shadow-sm"
              style={{ 
                border: '1px solid',
                borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
              loading="lazy"
              onClick={() => handleClick(fileName)}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, fileName)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-200 rounded-md pointer-events-none">
              <span 
                className="opacity-0 group-hover:opacity-100 text-xs font-medium px-2 py-1 rounded shadow transition-opacity duration-200"
                style={{ 
                  backgroundColor: 'var(--theme-card-bg)',
                  color: 'var(--theme-primary)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                Select
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SampleImages; 