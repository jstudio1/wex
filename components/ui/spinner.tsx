"use client";

import { LoaderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SpinnerProps = React.ComponentProps<typeof LoaderIcon> & {
  size?: number;
};

export function Spinner({ className, size = 20, style, ...props }: SpinnerProps) {
  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn('animate-spin text-[color:var(--text)]/70', className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  );
}

export function SpinnerCustom({ className, size }: { className?: string; size?: number }) {
  return (
    <div className={cn('flex items-center justify-center py-6', className)}>
      <Spinner size={size} />
    </div>
  );
}



