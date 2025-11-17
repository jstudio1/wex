'use client';

import * as React from 'react';

type Ctx = { open: boolean; setOpen: (v: boolean) => void; triggerRef: React.MutableRefObject<HTMLElement | null> };
const PopCtx = React.createContext<Ctx | null>(null);

export function Popover({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (v: boolean) => void; children: React.ReactNode }) {
  const [internal, setInternal] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const isOpen = open ?? internal;
  const setOpen = (v: boolean) => { if (open === undefined) setInternal(v); onOpenChange?.(v); };
  React.useEffect(() => {
    // Only close on click outside if popover is controlled (open prop is provided)
    // For hover-only behavior, we rely on onMouseLeave handlers
    if (open === undefined) return; // Internal state, don't handle click outside
    
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target)) {
        const popoverEl = document.querySelector('[data-popover-content]');
        if (popoverEl && !popoverEl.contains(target)) {
          setOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return <PopCtx.Provider value={{ open: isOpen, setOpen, triggerRef }}>{children}</PopCtx.Provider>;
}

export function PopoverTrigger({ asChild, children, onClickOverride }: { asChild?: boolean; children: React.ReactElement; onClickOverride?: (e: React.MouseEvent) => void }) {
  const ctx = React.useContext(PopCtx)!;
  const onClick = onClickOverride || (() => ctx.setOpen(!ctx.open));
  
  if (asChild) {
    // Clone element and preserve existing props, but override onClick if provided
    const existingProps = children.props || {};
    const mergedProps = {
      ...existingProps,
      onClick: onClickOverride ? (e: React.MouseEvent) => {
        existingProps.onClick?.(e);
        onClick(e);
      } : onClick,
      ref: (node: HTMLElement) => {
        ctx.triggerRef.current = node;
        if (typeof existingProps.ref === 'function') {
          existingProps.ref(node);
        } else if (existingProps.ref) {
          (existingProps.ref as any).current = node;
        }
      }
    };
    return React.cloneElement(children, mergedProps);
  }
  return <button ref={ctx.triggerRef as React.RefObject<HTMLButtonElement>} onClick={onClick}>{children}</button>;
}

export function PopoverContent({ className, children, align, onMouseEnter, onMouseLeave }: { className?: string; children: React.ReactNode; align?: 'start' | 'end'; onMouseEnter?: () => void; onMouseLeave?: () => void }) {
  const ctx = React.useContext(PopCtx)!;
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const [placement, setPlacement] = React.useState<'top' | 'bottom'>('bottom');
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (!ctx.open || !ctx.triggerRef.current) return;
    
    const updatePosition = () => {
      const trigger = ctx.triggerRef.current;
      if (!trigger) return;
      
      const rect = trigger.getBoundingClientRect();
      const estimatedHeight = contentRef.current?.getBoundingClientRect().height || 340; // calendar ~340px
      const estimatedWidth = 320; // fixed width for calendar popover
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldPlaceTop = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
      setPlacement(shouldPlaceTop ? 'top' : 'bottom');
      const top = shouldPlaceTop
        ? rect.top + window.scrollY - estimatedHeight - 8
        : rect.bottom + window.scrollY + 8;
      let left = align === 'end' 
        ? rect.right + window.scrollX - estimatedWidth 
        : rect.left + window.scrollX;
      left = Math.max(8, Math.min(left, window.innerWidth - estimatedWidth - 8));
      setPosition({
        top,
        left,
        width: estimatedWidth
      });
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [ctx.open, ctx.triggerRef, align]);
  
  if (!ctx.open) return null;
  
  return (
    <div
      ref={contentRef}
      data-popover-content
      className="fixed z-50"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxHeight: '80vh',
        overflow: 'auto'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={className || 'rounded-md border border-white/10 bg-black/90 shadow-xl backdrop-blur-sm'}
        style={{
          // เผื่อธีมปรับสีพื้นหลังเองได้
          background: 'rgba(0,0,0,0.9)'
        }}
      >
        {children}
      </div>
    </div>
  );
}


