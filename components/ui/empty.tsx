'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { RefreshCcw } from 'lucide-react';

export interface EmptyProps extends HTMLAttributes<HTMLDivElement> {}

export const Empty = forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('flex flex-col items-center justify-center', className)}
      {...props}
    />
  )
);
Empty.displayName = 'Empty';

export interface EmptyHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const EmptyHeader = forwardRef<HTMLDivElement, EmptyHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('flex flex-col items-center text-center', className)}
      {...props}
    />
  )
);
EmptyHeader.displayName = 'EmptyHeader';

export interface EmptyMediaProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'icon' | 'image';
}

export const EmptyMedia = forwardRef<HTMLDivElement, EmptyMediaProps>(
  ({ className, variant = 'icon', ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        variant === 'icon' && 'mb-4 flex items-center justify-center rounded-full bg-muted/20 p-3',
        variant === 'image' && 'mb-4',
        className
      )}
      {...props}
    />
  )
);
EmptyMedia.displayName = 'EmptyMedia';

export interface EmptyTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const EmptyTitle = forwardRef<HTMLHeadingElement, EmptyTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={clsx('text-lg font-semibold mb-2', className)}
      {...props}
    />
  )
);
EmptyTitle.displayName = 'EmptyTitle';

export interface EmptyDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const EmptyDescription = forwardRef<HTMLParagraphElement, EmptyDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
);
EmptyDescription.displayName = 'EmptyDescription';

export interface EmptyContentProps extends HTMLAttributes<HTMLDivElement> {}

export const EmptyContent = forwardRef<HTMLDivElement, EmptyContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('mt-6', className)}
      {...props}
    />
  )
);
EmptyContent.displayName = 'EmptyContent';

