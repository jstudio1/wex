'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ToastItem = {
  id: number;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  durationMs?: number;
};

type ToastContextValue = {
  show: (t: Omit<ToastItem, 'id'>) => void;
};

const ToastCtx = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    const item: ToastItem = { id, durationMs: 2500, ...t };
    setItems((prev) => [...prev, item]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), item.durationMs);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-16 z-[60] flex w-full max-w-xs flex-col gap-3 sm:right-6 sm:top-20 sm:max-w-sm">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto animate-[slideIn_.3s_ease-out] drop-shadow-xl">
            <Alert
              variant={t.variant || 'default'}
              className={clsx(
                'rounded-xl border-2 px-5 py-4 shadow-[0_20px_45px_rgba(15,23,42,0.12)] backdrop-blur-md transition-all',
                t.variant === 'destructive'
                  ? 'border-red-200 bg-gradient-to-br from-red-50 to-white text-red-900'
                  : 'border-rose-100 bg-gradient-to-br from-white to-rose-50 text-slate-900'
              )}
            >
              {t.title && (
                <AlertTitle
                  className={clsx(
                    'text-base font-semibold',
                    t.variant === 'destructive' ? 'text-red-900' : 'text-slate-900'
                  )}
                >
                  {t.title}
                </AlertTitle>
              )}
              {t.description && (
                <AlertDescription
                  className={clsx(
                    'text-sm leading-relaxed',
                    t.variant === 'destructive' ? 'text-red-700' : 'text-slate-600'
                  )}
                >
                  {t.description}
                </AlertDescription>
              )}
            </Alert>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}



