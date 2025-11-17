'use client';

import { ToastProvider } from '@/components/Toast';

export function Toaster({ children }: { children?: React.ReactNode }) {
  // Wrapper to be API-compatible with shadcn Toaster
  return <ToastProvider>{children}</ToastProvider>;
}



