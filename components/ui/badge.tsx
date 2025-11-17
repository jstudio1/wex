'use client';

import clsx from 'clsx';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline';

export function Badge({ className, variant = 'default', children, ...props }: { className?: string; variant?: Variant } & HTMLAttributes<HTMLSpanElement>) {
  const base = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium';
  const styles: Record<Variant, string> = {
    default: 'border-border bg-secondary text-secondary-foreground',
    secondary: 'border-blue-500/20 bg-blue-500/20 text-blue-200',
    destructive: 'border-red-500/30 bg-red-500 text-white',
    outline: 'border-border text-foreground'
  };
  return (
    <span className={clsx(base, styles[variant], className)} {...props}>
      {children}
    </span>
  );
}



