'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';

type ToastVariant = 'default' | 'success' | 'info' | 'warning' | 'error' | 'destructive';

type ShowOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastInvoker = (message: Parameters<typeof toast>[0], data?: Parameters<typeof toast>[1]) => ReturnType<typeof toast>;

const variantToHandler: Record<ToastVariant, ToastInvoker> = {
  default: toast,
  success: toast.success,
  info: toast.info,
  warning: toast.warning,
  error: toast.error,
  destructive: toast.error,
};

export function useToast() {
  return useMemo(() => {
    const show = ({ title, description, variant = 'default', durationMs, actionLabel, onAction }: ShowOptions) => {
      const primary = title ?? description ?? '';
      const secondary = title && description ? description : undefined;
      const handler = variantToHandler[variant] ?? toast;

      handler(primary, {
        description: secondary,
        duration: durationMs,
        action: actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined,
      });
    };

    return {
      show,
      success: (message: string, opts?: Omit<ShowOptions, 'title' | 'description' | 'variant'>) =>
        show({ title: message, variant: 'success', ...opts }),
      error: (message: string, opts?: Omit<ShowOptions, 'title' | 'description' | 'variant'>) =>
        show({ title: message, variant: 'error', ...opts }),
      info: (message: string, opts?: Omit<ShowOptions, 'title' | 'description' | 'variant'>) =>
        show({ title: message, variant: 'info', ...opts }),
      warning: (message: string, opts?: Omit<ShowOptions, 'title' | 'description' | 'variant'>) =>
        show({ title: message, variant: 'warning', ...opts }),
    };
  }, []);
}

