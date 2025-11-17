'use client';

import { createContext, useContext, useState, cloneElement, type HTMLAttributes, type ButtonHTMLAttributes, type ReactElement } from 'react';
import clsx from 'clsx';

type CtxType = { open: boolean; setOpen: (v: boolean) => void };
const Ctx = createContext<CtxType | null>(null);

export function AlertDialog({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const setCurrentOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };
  return <Ctx.Provider value={{ open: currentOpen, setOpen: setCurrentOpen }}>{children}</Ctx.Provider>;
}

export function AlertDialogTrigger({ asChild, children }: { asChild?: boolean; children: ReactElement }) {
  const ctx = useContext(Ctx)!;
  const onClick = () => ctx.setOpen(true);
  if (asChild) return cloneElement(children, { onClick } as any);
  return <button onClick={onClick}>{children}</button>;
}

export function AlertDialogContent({ className, children }: HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(Ctx)!;
  if (!ctx.open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60" onClick={() => ctx.setOpen(false)} />
      <div 
        className={clsx('absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-[color:var(--bg)] p-4 shadow-xl z-[75]', className)}
        onClick={(e) => {
          // Prevent closing dialog when clicking inside content
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          // Prevent event bubbling
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('mb-3 space-y-1', className)} {...props} />;
}
export function AlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('mt-4 flex items-center justify-end gap-2', className)} {...props} />;
}
export function AlertDialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={clsx('text-base font-semibold', className)} {...props} />;
}
export function AlertDialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={clsx('text-sm text-[color:var(--text)]/70', className)} {...props} />;
}

export function AlertDialogCancel(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = useContext(Ctx)!;
  return (
    <button
      {...props}
      onClick={(e) => { props.onClick?.(e); ctx.setOpen(false); }}
      className={clsx('inline-flex items-center justify-center rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10', props.className)}
    />
  );
}
export function AlertDialogAction(props: ButtonHTMLAttributes<HTMLButtonElement> & { closeOnClick?: boolean }) {
  const ctx = useContext(Ctx)!;
  const { closeOnClick = true, ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      onClick={(e) => { 
        buttonProps.onClick?.(e);
        if (closeOnClick) {
          ctx.setOpen(false);
        }
      }}
      className={clsx('inline-flex items-center justify-center rounded-md bg-accent px-3 py-2 text-sm text-[color:var(--text)] hover:opacity-90', buttonProps.className)}
    />
  );
}


