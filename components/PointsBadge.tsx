'use client';

import { useEffect, useRef, useState } from 'react';
import { Wallet } from 'lucide-react';
import Link from 'next/link';
import { useWalletBalance } from '@/hooks/useWalletBalance';

function useAnimatedNumber(value: number, durationMs = 600) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    startRef.current = null;
    const from = fromRef.current;
    const to = value;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return display;
}

export default function PointsBadge() {
  const { points, loading } = useWalletBalance();
  const animated = useAnimatedNumber(points ?? 0);

  return (
    <Link 
      href="/wallet/topup" 
      className="group inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
    >
      <Wallet className="h-5 w-5 text-yellow-300 group-hover:text-yellow-100 transition-colors" strokeWidth={2.5} />
      <span className="font-bold text-base tabular-nums text-white">
        {loading && points === null ? '—' : animated.toFixed(2)}
      </span>
    </Link>
  );
}


