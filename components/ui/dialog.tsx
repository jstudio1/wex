'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type DialogContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const DialogCtx = React.createContext<DialogContextValue | null>(null);

export function Dialog({ children, open: openProp, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setInternalOpen(v);
    onOpenChange?.(v);
  };
  return (
    <DialogCtx.Provider value={{ open, setOpen }}>{children}</DialogCtx.Provider>
  );
}

export function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const ctx = React.useContext(DialogCtx)!;
  const onClick = () => ctx.setOpen(true);
  if (asChild) {
    return React.cloneElement(children as any, { onClick });
  }
  return (
    <button onClick={onClick}>{children}</button>
  );
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(DialogCtx)!;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!ctx.open || !mounted) return null;

  // Filter out bg-white and other conflicting background classes
  const filteredClassName = className
    ? className
        .split(' ')
        .filter((cls) => !cls.startsWith('bg-white') && !cls.startsWith('bg-gray-50') && !cls.startsWith('bg-gray-100'))
        .join(' ')
    : '';

  const content = (
    <div className="fixed inset-0 z-[9999] grid place-items-center p-4" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-sm" onClick={() => ctx.setOpen(false)} />
      <div className={`relative z-10 w-[92vw] max-w-md rounded-2xl border border-emerald-500/30 bg-[#0a0a0a] p-4 shadow-xl shadow-emerald-500/20 ${filteredClassName}`}>{children}</div>
    </div>
  );

  return createPortal(content, document.body);
}

export function DialogHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mb-3 space-y-1', className)}>{children}</div>;
}

export function DialogTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn('text-lg font-semibold text-white', className)}>{children}</h3>;
}

export function DialogDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn('text-sm text-gray-400', className)}>{children}</p>;
}

export function DialogFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mt-4 flex justify-end gap-2', className)}>{children}</div>;
}

export function DialogClose({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const ctx = React.useContext(DialogCtx)!;
  const onClick = () => ctx.setOpen(false);
  if (asChild) return React.cloneElement(children as any, { onClick });
  return <button onClick={onClick}>{children}</button>;
}


