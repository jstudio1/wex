'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AppWindow, CheckCircle2, Clock3 } from 'lucide-react';
import { Marquee } from '@/components/ui/marquee';

interface LatestSoldProduct {
  id: number;
  order_id: number;
  display_name: string;
  name: string;
  image_url: string | null;
  icon_url: string | null;
  sold_at: string;
}

interface LatestSoldAppPremiumCarouselProps {
  products: LatestSoldProduct[];
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'เมื่อสักครู่';
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่ผ่านมา`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่ผ่านมา`;
  return `${diffDays} วันที่ผ่านมา`;
}

export default function LatestSoldAppPremiumCarousel({ products }: LatestSoldAppPremiumCarouselProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <Marquee pauseOnHover className="w-full max-w-full [--duration:32s] [--gap:0.875rem]">
      {products.map((product) => (
        <Link
          key={`${product.order_id}-${product.id}`}
          href={`/premium-app/${product.id}`}
          className="group block flex-shrink-0"
        >
          <article className="flex h-32 w-[min(18rem,calc(100vw-6.5rem))] items-center gap-3 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] p-3.5 transition-all duration-300 hover:border-emerald-300/55 hover:bg-emerald-500/[0.08] hover:shadow-[0_12px_28px_rgba(16,185,129,0.2)] sm:w-80">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/40 sm:h-24 sm:w-24">
              {product.image_url || product.icon_url ? (
                <Image
                  src={product.image_url || product.icon_url || ''}
                  alt={product.display_name || product.name}
                  fill
                  className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 80px, 96px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/35">
                  <AppWindow className="h-10 w-10" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="mb-2 line-clamp-1 text-sm font-semibold text-white transition-colors group-hover:text-emerald-200 sm:text-base">
                <span dangerouslySetInnerHTML={{ __html: product.display_name || product.name }} />
              </h4>

              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/35 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-100">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  ขายแล้ว
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/35 bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatTimeAgo(product.sold_at)}
                </span>
              </div>
            </div>
          </article>
        </Link>
      ))}
    </Marquee>
  );
}
