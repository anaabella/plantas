'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { GripVertical } from 'lucide-react';

interface ImageComparisonSliderProps {
  before: string;
  after: string;
}

const ImageComparisonSlider: React.FC<ImageComparisonSliderProps> = ({ before, after }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const handleMouseMove = (event: MouseEvent) => {
      handleMove(event.clientX);
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
      const handleTouchMove = (event: TouchEvent) => {
        handleMove(event.touches[0].clientX);
      };
      const handleTouchEnd = () => {
          window.removeEventListener('touchmove', handleTouchMove);
          window.removeEventListener('touchend', handleTouchEnd);
      };
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-video select-none overflow-hidden rounded-lg">
      {/* After Image (Top Layer) */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
        }}
      >
        <Image src={after} alt="After" layout="fill" objectFit="cover" />
      </div>

      {/* Before Image (Bottom Layer) */}
      <div className="absolute inset-0">
        <Image src={before} alt="Before" layout="fill" objectFit="cover" />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-ew-resize"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 shadow-lg flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <GripVertical className="text-gray-600" />
        </div>
      </div>
    </div>
  );
};

export default ImageComparisonSlider;
