'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx('w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-base text-text placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent-50 autofill:bg-white/5 autofill:text-white', className)}
      style={{ fontSize: '16px' }}
      {...props}
    />
  )
);
Input.displayName = 'Input';



