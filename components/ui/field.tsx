'use client';

import clsx from 'clsx';
import type { HTMLAttributes, LabelHTMLAttributes } from 'react';

export function FieldSet({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('space-y-4', className)} {...props} />;
}

export function FieldGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('grid gap-4', className)} {...props} />;
}

export function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('space-y-1.5', className)} {...props} />;
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={clsx('text-xs text-[color:var(--text)]/80', className)} {...props} />;
}

export function FieldDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={clsx('text-[11px] text-[color:var(--text)]/50', className)} {...props} />;
}



