'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import * as Slot from '@radix-ui/react-slot';

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type Size = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const base = clsx(
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none',
      'text-sm',
      size === 'sm' && 'h-8 px-2',
      size === 'default' && 'h-9 px-3',
      size === 'lg' && 'h-10 px-4',
      size === 'icon' && 'size-9',
      size === 'icon-sm' && 'size-8',
      size === 'icon-lg' && 'size-10',
      variant === 'default' && 'bg-accent text-white hover:opacity-90',
      variant === 'secondary' && 'bg-white/10 text-white hover:bg-white/15',
      variant === 'outline' && 'border border-white/20 text-white hover:bg-white/10',
      variant === 'ghost' && 'text-white hover:bg-white/10',
      variant === 'destructive' && 'bg-red-500 text-white hover:opacity-90',
      variant === 'link' && 'text-accent underline-offset-4 hover:underline',
      className
    );

    const Comp = asChild ? Slot.Root : 'button';

      return (
      <Comp ref={ref} className={base} {...props} />
    );
  }
);
Button.displayName = 'Button';


