'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export default function SonnerNotify({ status }: { status?: string }) {
  useEffect(() => {
    const handler = (e: any) => {
      const s = e?.detail || status;
      if (!s) return;
      if (s === 'ok') toast.success('บันทึกสำเร็จ');
      else if (s === 'error') toast.error('เกิดข้อผิดพลาด');
    };
    window.addEventListener('sonner:status', handler);
    handler({ detail: status });
    return () => window.removeEventListener('sonner:status', handler);
  }, [status]);
  return null;
}


