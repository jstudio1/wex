'use client';

import { createContext, useContext, useState, type HTMLAttributes } from 'react';
import clsx from 'clsx';

const Ctx = createContext<{ open: boolean; setOpen: (v: boolean) => void } | null>(null);

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

export function TooltipProvider({ children, delayDuration = 0 }: { children: React.ReactNode; delayDuration?: number }) {
  return <>{children}</>;
}

export function TooltipTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = useContext(Ctx)!;
  const props = {
    onMouseEnter: () => ctx.setOpen(true),
    onMouseLeave: () => ctx.setOpen(false),
    onFocus: () => ctx.setOpen(true),
    onBlur: () => ctx.setOpen(false)
  };
  if (asChild) return children && { ...children, props: { ...children.props, ...props } } as any;
  return <span {...props}>{children}</span>;
}

export function TooltipContent({ className, side = 'top', align, hidden, children, ...rest }: HTMLAttributes<HTMLDivElement> & { side?: 'top' | 'right' | 'bottom' | 'left'; align?: 'start' | 'center' | 'end'; hidden?: boolean }) {
  const ctx = useContext(Ctx)!;
  if (!ctx?.open || hidden) return null;
  let pos = '';
  if (side === 'top') {
    pos = 'bottom-full mb-1';
    if (align === 'start') pos += ' left-0';
    else if (align === 'end') pos += ' right-0';
    else pos += ' left-1/2 -translate-x-1/2';
  } else if (side === 'bottom') {
    pos = 'top-full mt-1';
    if (align === 'start') pos += ' left-0';
    else if (align === 'end') pos += ' right-0';
    else pos += ' left-1/2 -translate-x-1/2';
  } else if (side === 'left') {
    pos = 'right-full mr-1';
    if (align === 'start') pos += ' top-0';
    else if (align === 'end') pos += ' bottom-0';
    else pos += ' top-1/2 -translate-y-1/2';
  } else {
    pos = 'left-full ml-1';
    if (align === 'start') pos += ' top-0';
    else if (align === 'end') pos += ' bottom-0';
    else pos += ' top-1/2 -translate-y-1/2';
  }
  return (
    <div className={clsx('absolute z-50 rounded-md border border-white/10 bg-black/80 px-2 py-1 text-xs text-[color:var(--text)] shadow', pos, className)} {...rest}>
      {children}
    </div>
  );
}



