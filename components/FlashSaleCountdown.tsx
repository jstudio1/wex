'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export default function FlashSaleCountdown({ start, end }: { start?: string | null; end?: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const { label, msLeft, active, isEnded } = useMemo(() => {
    if (now === null) return { label: '', msLeft: 0, active: false, isEnded: false };
    const startMs = start ? new Date(start).getTime() : NaN;
    const endMs = end ? new Date(end).getTime() : NaN;
    if (!Number.isFinite(endMs)) return { label: '', msLeft: 0, active: false, isEnded: false };
    if (Number.isFinite(startMs) && now < startMs) {
      return { label: 'จะเริ่มใน', msLeft: startMs - now, active: false, isEnded: false };
    }
    if (now <= endMs) {
      return { label: 'เหลือเวลา', msLeft: endMs - now, active: true, isEnded: false };
    }
    return { label: '', msLeft: 0, active: false, isEnded: true };
  }, [now, start, end]);

  const h = Math.max(0, Math.floor(msLeft / 3_600_000));
  const m = Math.max(0, Math.floor((msLeft % 3_600_000) / 60_000));
  const s = Math.max(0, Math.floor((msLeft % 60_000) / 1000));

  if (!end || !mounted) return null;

  // ถ้าสิ้นสุดแล้ว แสดง badge สีแดง
  if (isEnded) {
    return (
      <Badge variant="destructive" className="font-semibold">
        END
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[color:var(--text)]/80">{label}</span>
      <div className="flex items-center gap-1.5">
        <TimeBox v={h} label="ชม." />
        <span className="text-[color:var(--text)]/40">:</span>
        <TimeBox v={m} label="นาที" />
        <span className="text-[color:var(--text)]/40">:</span>
        <TimeBox v={s} label="วินาที" />
      </div>
    </div>
  );
}

function TimeBox({ v, label }: { v: number; label?: string }) {
  const t = String(v).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono tabular-nums text-sm">{t}</span>
      {label && <span className="text-[10px] text-[color:var(--text)]/50 mt-0.5">{label}</span>}
    </div>
  );
}



