'use client';

import * as React from 'react';
import clsx from 'clsx';

export function ButtonGroup({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-md border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-accent-50 focus-within:border-accent/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

