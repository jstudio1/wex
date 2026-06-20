'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Megaphone, Flame } from 'lucide-react';

const REFRESH_INTERVAL_MS = 30000;

function parseAnnouncementSlides(text: string): string[] {
  return text
    .split(/\r?\n|\s*\|\|\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AnnouncementBar() {
  const pathname = usePathname();
  const [text, setText] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const isHomePage = pathname === '/';
  const slides = useMemo(() => parseAnnouncementSlides(text), [text]);

  // รวมทุก slide เป็น ticker เดียว คั่นด้วย bullet
  const tickerText = slides.join('   •   ');

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const [announcementRes, siteRes, adminRes] = await Promise.all([
          fetch('/api/announcement', {
            cache: 'default',
            headers: { 'Cache-Control': 'max-age=60' },
          }),
          fetch('/api/site', { cache: 'no-store' }),
          fetch('/api/admin/check', { cache: 'no-store' }),
        ]);

        if (!cancelled && announcementRes.ok) {
          const announcementJson = await announcementRes.json();
          setText(announcementJson.text || '');
          setEnabled(announcementJson.enabled || false);
        }

        if (!cancelled && siteRes.ok) {
          const siteJson = await siteRes.json();
          setMaintenanceMode(siteJson.maintenanceMode === true);
        }

        if (!cancelled && adminRes.ok) {
          const adminJson = await adminRes.json();
          setIsAdmin(adminJson.isAdmin === true);
        }
      } catch {
        // ignore network failures
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    const refreshTimer = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };
  }, []);

  const canShow = isHomePage && !loading && enabled && slides.length > 0 && (!maintenanceMode || isAdmin);
  if (!canShow) return null;

  // คำนวณ duration จากความยาวข้อความ — ยิ่งยาวยิ่งช้า
  const duration = Math.max(15, tickerText.length * 0.25);

  return (
    <div className="relative z-30 w-full border-b border-white/10 bg-black/55 backdrop-blur-xl">
      <div className="mx-auto max-w-[1600px] px-4 py-2 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-900/35 via-slate-950/70 to-cyan-900/30 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(16,185,129,0.25),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(56,189,248,0.2),transparent_35%)]" />

          <div className="relative flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
            {/* Badge */}
            <span className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/45 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 sm:text-[11px]">
              <Flame className="h-3 w-3" />
              Promotion
            </span>

            {/* Marquee ticker */}
            <div
              className="marquee-wrapper flex-1 min-w-0"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            >
              <div
                className="marquee-content"
                style={{
                  animationDuration: `${duration}s`,
                  animationPlayState: isPaused ? 'paused' : 'running',
                  '--gap': '4rem',
                } as React.CSSProperties}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-50 sm:text-[15px] pr-16">
                  <Megaphone className="h-4 w-4 flex-shrink-0 text-emerald-300" />
                  {tickerText}
                </span>
                {/* ซ้ำสำหรับ loop ต่อเนื่อง */}
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-50 sm:text-[15px] pr-16">
                  <Megaphone className="h-4 w-4 flex-shrink-0 text-emerald-300" />
                  {tickerText}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
