'use client';

import { cn } from '@/lib/utils';

type PlaceholderImageProps = {
  text?: string;
  className?: string;
  width?: number;
  height?: number;
};

export default function PlaceholderImage({ 
  text = 'ไม่มีรูป', 
  className,
  width = 800,
  height = 400 
}: PlaceholderImageProps) {
  return (
    <div 
      className={cn(
        'flex items-center justify-center bg-gray-600 text-gray-300',
        className
      )}
      style={{ width: '100%', height: '100%' }}
    >
      <div className="text-center">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto mb-2 text-gray-400"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p className="text-sm font-medium text-gray-300">{text}</p>
      </div>
    </div>
  );
}

