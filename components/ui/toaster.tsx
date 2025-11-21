'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton={false}
      richColors
      expand
      toastOptions={{
        duration: 3200,
        style: {
          fontFamily: '"Noto Sans Thai", sans-serif',
        },
        classNames: {
          toast:
            'rounded-2xl border border-white/10 bg-[#050505]/90 text-white backdrop-blur-xl px-5 py-4 data-[type=success]:border-emerald-500/40 data-[type=success]:bg-emerald-500/10 data-[type=error]:border-red-500/40 data-[type=error]:bg-red-500/10 data-[type=warning]:border-amber-500/40 data-[type=warning]:bg-amber-500/10 data-[type=info]:border-sky-500/40 data-[type=info]:bg-sky-500/10 data-[type=default]:border-white/10 data-[type=default]:bg-white/5',
          title: 'text-sm font-semibold tracking-tight',
          description: 'text-xs text-gray-200 leading-relaxed',
          actionButton:
            '!bg-emerald-500 !text-black !font-semibold !rounded-lg !px-3 !py-1.5 hover:!bg-emerald-400',
          cancelButton:
            '!bg-transparent !text-gray-300 !border !border-gray-700 !rounded-lg hover:!border-gray-500',
          closeButton: '!text-gray-300 hover:!text-white',
        },
      }}
      className="pointer-events-none [&_[data-sonner-toast]]:pointer-events-auto !top-24"
    />
  );
}

