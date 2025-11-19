'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ImageViewerProps = {
  images: Array<{ id: number; url: string; file_name: string }>;
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ImageViewer({ images, initialIndex = 0, open, onOpenChange }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const currentImage = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && hasPrev) {
      handlePrev();
    } else if (e.key === 'ArrowRight' && hasNext) {
      handleNext();
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  if (!images.length || !currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl border-white/10 bg-black/95 p-0"
      >
        <div className="relative flex h-[80vh] flex-col" onKeyDown={handleKeyDown} tabIndex={0}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70">
                {currentIndex + 1} / {images.length}
              </span>
              <span className="text-sm text-white/50">{currentImage.file_name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/10"
            >
              <X className="size-5" />
            </Button>
          </div>

          {/* Image Container */}
          <div className="relative flex-1 overflow-hidden">
            <img
              src={currentImage.url}
              alt={currentImage.file_name}
              className="h-full w-full object-contain"
            />

            {/* Navigation Buttons */}
            {hasPrev && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft className="size-6" />
              </Button>
            )}
            {hasNext && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight className="size-6" />
              </Button>
            )}
          </div>

          {/* Thumbnail Preview */}
          {images.length > 1 && (
            <div className="border-t border-white/10 bg-black/50 p-4">
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border-2 transition-all',
                      idx === currentIndex
                        ? 'border-emerald-500 scale-105'
                        : 'border-white/20 hover:border-white/40',
                    )}
                  >
                    <img
                      src={img.url}
                      alt={img.file_name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

