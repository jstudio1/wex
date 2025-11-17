'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-base text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-transparent disabled:opacity-60',
        className
      )}
      style={{ fontSize: '16px' }}
      {...props}
    />
  )
);
Input.displayName = 'Input';



