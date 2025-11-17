'use client';

import { forwardRef, type LabelHTMLAttributes } from 'react';
import clsx from 'clsx';

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={clsx('text-xs text-[color:var(--text)]/70', className)} {...props} />
  )
);
Label.displayName = 'Label';



