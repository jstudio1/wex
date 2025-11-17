'use client';

import { type HTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'default' | 'destructive';

export function Alert({ className, variant = 'default', ...props }: HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return (
    <div
      className={clsx(
        'relative w-full rounded-md border px-4 py-3 text-sm',
        variant === 'default' && 'bg-white/5 border-white/10 text-[color:var(--text)]',
        variant === 'destructive' && 'bg-red-500/10 border-red-500/40 text-red-100',
        className
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('mb-1 font-semibold', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('text-[color:var(--text)]/80', className)} {...props} />;
}



