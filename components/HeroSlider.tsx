'use client';

import { useEffect, useMemo, useState } from 'react';

export default function HeroSlider({ posters }: { posters: string[] }) {
  const items = useMemo(() => posters.filter(Boolean), [posters]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!items.length) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, 5000); // 5 seconds
    return () => clearInterval(id);
  }, [items.length]);

  if (!items.length) {
    return <div className="h-full w-full grid place-items-center text-[color:var(--text)]/60">เพิ่มรูปสไลด์ได้ที่หลังบ้าน</div>;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* current image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={items[idx]} alt="poster" className="h-full w-full object-cover transition-opacity duration-500" />
      <div className="absolute bottom-2 right-3 flex gap-1">
        {items.map((_, i) => (
          <span key={i} className={`h-1.5 w-4 rounded-full ${i === idx ? 'bg-white/90' : 'bg-white/30'}`} />)
        )}
      </div>
    </div>
  );
}



