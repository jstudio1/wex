'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
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
      <div className="pointer-events-none fixed right-4 top-16 z-[60] flex w-80 flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto animate-[slideIn_.3s_ease-out]">
            <Alert variant={t.variant || 'default'}>
              {t.title && <AlertTitle>{t.title}</AlertTitle>}
              {t.description && <AlertDescription>{t.description}</AlertDescription>}
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



