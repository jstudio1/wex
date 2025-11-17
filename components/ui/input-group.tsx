'use client';

import { forwardRef, type HTMLAttributes, type InputHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export function InputGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('relative w-full max-w-sm', className)} {...props} />;
}

export const InputGroupInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx('w-full rounded-md border border-white/10 bg-transparent px-3 py-2 pr-10 text-base text-text placeholder:text-[color:var(--text)]/40 focus:outline-none focus:ring-2 focus:ring-accent-50', className)}
      style={{ fontSize: '16px' }}
      {...props}
    />
  )
);
InputGroupInput.displayName = 'InputGroupInput';

export function InputGroupAddon({ className, align, ...props }: HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'end' | 'inline-end' }) {
  const isEnd = align === 'end' || align === 'inline-end' || !align;
  return (
    <div
      className={clsx(
        'absolute inset-y-0 flex items-center gap-1 px-2 text-[color:var(--text)]/70',
        isEnd ? 'right-0 justify-end' : 'left-0 justify-start',
        className
      )}
      {...props}
    />
  );
}

export const InputGroupButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost' | 'default' | 'outline'; size?: 'icon-xs' | 'sm' | 'md' }>(
  ({ className, variant = 'ghost', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center rounded-md text-sm transition-colors',
        size === 'icon-xs' && 'h-6 w-6 p-0',
        size === 'sm' && 'h-8 px-2',
        size === 'md' && 'h-9 px-3',
        variant === 'ghost' && 'text-[color:var(--text)] hover:bg-white/10',
        variant === 'default' && 'bg-accent text-[color:var(--text)] hover:opacity-90',
        variant === 'outline' && 'border border-white/20 text-[color:var(--text)] hover:bg-white/10',
        className
      )}
      {...props}
    />
  )
);
InputGroupButton.displayName = 'InputGroupButton';


