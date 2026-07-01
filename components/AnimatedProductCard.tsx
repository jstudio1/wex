'use client';

import { useState, useEffect } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

type ProductCard = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  items: { id: number; name: string; sku: string; price: string; originalPrice: string; is_recommended?: boolean }[];
  badge?: { text?: string | null; percent?: number | null } | null;
};

type Props = {
  product: ProductCard;
  isHighlight?: boolean;
  index?: number;
  flashStart?: string | null;
  flashEnd?: string | null;
  basePath?: string;
};

function CountdownBadge({ flashStart, flashEnd }: { flashStart?: string | null; flashEnd?: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!mounted || now === null) return null;

  const endMs = flashEnd ? new Date(flashEnd).getTime() : NaN;
  const startMs = flashStart ? new Date(flashStart).getTime() : NaN;

  if (!Number.isFinite(endMs)) return null;
  if (Number.isFinite(startMs) && now < startMs) return null;
  if (now > endMs) return null;

  const msLeft = endMs - now;
  const hours = Math.max(0, Math.floor(msLeft / 3_600_000));
  const minutes = Math.max(0, Math.floor((msLeft % 3_600_000) / 60_000));
  const seconds = Math.max(0, Math.floor((msLeft % 60_000) / 1000));
  const timeStr = hours > 0 
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` 
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <Badge variant="secondary" className="h-5 min-w-fit rounded-full px-2 font-mono tabular-nums text-xs bg-orange-500/20 border-orange-500/30 text-orange-200">
      {timeStr}
    </Badge>
  );
}

export default function AnimatedProductCard({ product: p, isHighlight = false, index = 0, flashStart, flashEnd, noAnimation = false, basePath = '/products' }: Props & { noAnimation?: boolean }) {
  const scrollAnimation = useScrollAnimation();
  const { ref, isVisible } = noAnimation ? { ref: null, isVisible: true } : scrollAnimation;
  const manualPercent = typeof p.badge?.percent === 'number' ? Math.round(Number(p.badge?.percent)) : null;
  const manualText = p.badge?.text?.trim();
  // แสดงทั้งข้อความป้ายและเปอร์เซ็นต์ลดใน badge เดียวกัน
  const badgeDisplayText = (() => {
    const parts: string[] = [];
    if (manualText && manualText.length) {
      parts.push(manualText);
    }
    if (manualPercent != null && manualPercent > 0) {
      parts.push(`ลด ${manualPercent}%`);
    }
    return parts.length > 0 ? parts.join(' ') : null;
  })();
  const recommendedItem = p.items?.find(item => item.is_recommended === true);
  
  return (
    <Link href={`${basePath}/${p.key}`} className="group block">
      <div 
        ref={ref}
        className={`flex flex-col items-center text-center ${
          isHighlight ? 'relative' : ''
        } ${noAnimation ? '' : `transition-all ease-out ${
          isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}`}
        style={noAnimation ? {} : {
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out'
        }}
      >
        {isHighlight && (
          <div className="absolute -top-2 -left-2 z-10">
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-2 py-0.5 shadow-lg">
              ★ Highlight
            </Badge>
          </div>
        )}
        <div className={`relative ${isHighlight ? 'border-2 border-yellow-500 rounded-xl p-1' : ''}`}>
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image_url}
              alt={p.name}
              className={`rounded-xl object-cover transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg ${isHighlight ? 'h-24 w-24 sm:h-40 sm:w-40 md:h-44 md:w-44 lg:h-48 lg:w-48' : 'h-24 w-24 sm:h-40 sm:w-40 md:h-44 md:w-44 lg:h-48 lg:w-48'}`}
              loading="eager"
              key={`${p.id}-${p.image_url}`}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.retried) {
                  img.dataset.retried = '1';
                  setTimeout(() => { img.src = p.image_url + '?r=' + Date.now(); }, 1500);
                }
              }}
            />
          ) : (
            <div className={`rounded-xl bg-gray-800 flex items-center justify-center ${isHighlight ? 'h-24 w-24 sm:h-40 sm:w-40 md:h-44 md:w-44 lg:h-48 lg:w-48' : 'h-24 w-24 sm:h-40 sm:w-40 md:h-44 md:w-44 lg:h-48 lg:w-48'}`}>
              <span className="text-xs text-gray-500 text-center px-2">ไม่มีรูป</span>
            </div>
          )}
          {badgeDisplayText && (
            <div className="absolute bottom-2 left-2 flex flex-col gap-1.5 z-10">
              <Badge variant="destructive" className="shadow-md gap-1 h-5 min-w-fit">
                <Zap className="h-3 w-3" />
                <span className="font-semibold whitespace-nowrap text-xs">{badgeDisplayText}</span>
              </Badge>
              {(flashStart || flashEnd) && (
                <CountdownBadge flashStart={flashStart} flashEnd={flashEnd} />
              )}
            </div>
          )}
        </div>
        <h2 className="mt-3 text-sm md:text-base font-semibold text-white truncate w-full text-center">{p.name}</h2>
        {isHighlight && recommendedItem && (
          <div className="mt-1 text-center">
            <div className="text-xs text-gray-400">{recommendedItem.name}</div>
            <div className="text-sm font-bold text-white">
              <span className="tabular-nums">{Number(recommendedItem.price)}฿</span>
              {Number(recommendedItem.originalPrice) > Number(recommendedItem.price) && (
                <span className="line-through opacity-60 ml-1 text-xs tabular-nums text-gray-500">{Number(recommendedItem.originalPrice)}฿</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

