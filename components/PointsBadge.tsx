'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Wallet } from 'lucide-react';
import Link from 'next/link';

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
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      // User-specific data should be fresh but can use short browser cache
      const res = await fetch('/api/wallet/balance', { 
        cache: 'default',
        headers: { 'Cache-Control': 'max-age=10' }
      });
      if (!res.ok) throw new Error('balance');
      const json = await res.json();
      setPoints(Number(json.points) || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const onChanged = () => fetchBalance();
    const onFocus = () => fetchBalance();
    window.addEventListener('wallet:changed', onChanged);
    window.addEventListener('focus', onFocus);
    const iv = setInterval(fetchBalance, 15000);
    return () => {
      clearInterval(iv);
      window.removeEventListener('wallet:changed', onChanged);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchBalance]);

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


