'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

export type LatestPurchaseItem = {
  id: string;
  type: 'product' | 'premium';
  title: string;
  price: number;
  createdAt: string;
  imageUrl?: string | null;
};

const typeStyles: Record<LatestPurchaseItem['type'], { label: string; className: string }> = {
  product: {
    label: 'เติมเกม',
    className: 'bg-red-100 text-red-600',
  },
  premium: {
    label: 'แอพพรีเมี่ยม',
    className: 'bg-rose-100 text-rose-600',
  },
};

function formatDate(value: string) {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }).format(date);
  } catch {
    return value;
  }
}

export default function LatestPurchasesMarquee({ items }: { items: LatestPurchaseItem[] }) {
  if (!items.length) return null;

  const repeated = [...items, ...items];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white via-white/90 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white via-white/90 to-transparent pointer-events-none" />
      <div className="relative flex items-center gap-3 border-b border-red-100/60 px-6 py-3">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <p className="text-sm font-semibold text-red-600">ออเดอร์ล่าสุด</p>
      </div>
      <div className="relative overflow-hidden py-4">
        <div className="marquee flex items-center">
          {repeated.map((item, index) => {
            const meta = typeStyles[item.type];
            return (
              <div
                key={`${item.id}-${index}`}
                className="mr-6 flex min-w-[260px] items-center gap-4 rounded-xl border border-red-50 bg-white px-5 py-3 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-red-50">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-red-500">LG</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', meta.className)}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">
                    {item.price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .marquee {
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        .marquee:hover {
          animation-play-state: paused;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

