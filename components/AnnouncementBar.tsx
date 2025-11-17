'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function AnnouncementBar() {
  const pathname = usePathname();
  const [text, setText] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const speed = 60; // ตั้งค่าคงที่ 60 วินาที
  
  // แสดงเฉพาะหน้าแรกเท่านั้น
  const isHomePage = pathname === '/';

  useEffect(() => {
    fetchAnnouncement();
    const interval = setInterval(fetchAnnouncement, 30000); // รีเฟรชทุก 30 วินาที
    return () => clearInterval(interval);
  }, []);

  const fetchAnnouncement = async () => {
    try {
      const res = await fetch('/api/announcement', { 
        cache: 'default',
        headers: { 'Cache-Control': 'max-age=60' }
      });
      if (!res.ok) return;
      const json = await res.json();
      setText(json.text || '');
      setEnabled(json.enabled || false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // แสดงเฉพาะหน้าแรกเท่านั้น
  if (!isHomePage) {
    return null;
  }
  
  if (loading) {
    return null;
  }
  
  if (!enabled || !text || text.trim() === '') {
    return null;
  }

  return (
    <div className="relative z-30 w-full overflow-hidden border-b border-white/10 bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 backdrop-blur-sm" style={{ position: 'relative', display: 'block', minHeight: '40px' }}>
      <div className="flex items-center justify-center h-10 md:h-12 mx-auto max-w-full">
        <div className="marquee-wrapper w-full overflow-hidden">
          <div 
            className="marquee-content inline-flex items-center gap-12 text-sm md:text-base font-medium text-[color:var(--text)]"
            style={{ 
              animationDuration: `${speed}s`,
              animationName: 'marquee',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite'
            }}
          >
            <span className="whitespace-nowrap">{text}</span>
            <span className="whitespace-nowrap">{text}</span>
            <span className="whitespace-nowrap">{text}</span>
            <span className="whitespace-nowrap">{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

