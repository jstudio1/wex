'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Coins, Flame, Gamepad2, Zap } from 'lucide-react';

interface GtopupProduct {
  id: number;
  name: string;
  key: string;
  image_url: string | null;
  badge_enabled?: boolean;
  badge_percent?: number | null;
  badge_text?: string | null;
  item: {
    price: string;
    originalPrice: string;
  } | null;
}

interface GtopupCarouselSectionProps {
  products: GtopupProduct[];
}

function formatPrice(value: number) {
  return value.toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

export default function GtopupCarouselSection({ products }: GtopupCarouselSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/55 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_86%_84%,rgba(16,185,129,0.14),transparent_38%)]" />

      <div className="relative mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-300/40 bg-blue-500/20 text-blue-200 sm:h-11 sm:w-11 sm:rounded-2xl">
            <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white sm:text-xl lg:text-2xl">เติมเกมยอดนิยม</h2>
            <p className="text-[10px] uppercase tracking-[0.12em] text-blue-200/85 sm:text-xs">Game Top-up Collection</p>
          </div>
        </div>

        <Link
          href="/products"
          className="inline-flex shrink-0 items-center gap-1 self-start whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/35 hover:bg-white/20 sm:self-auto sm:text-sm"
        >
          ดูทั้งหมด
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Link>
      </div>

      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {products.map((product, index) => {
          const startPrice = Number(product.item?.price || 0);
          const originalPrice = Number(product.item?.originalPrice || 0);
          const hasDiscount = originalPrice > startPrice;

          return (
            <Link key={product.id} href={`/products/${product.key}`} className="group block h-full" prefetch={index < 6}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/55 hover:shadow-[0_16px_34px_rgba(59,130,246,0.22)]">
                <div className="relative h-32 w-full overflow-hidden bg-black/45 sm:h-36 md:h-40">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 180px"
                      loading={index < 6 ? 'eager' : 'lazy'}
                      priority={index < 3}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/35">
                      <Gamepad2 className="h-12 w-12" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  <div className="absolute left-2 top-2 flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full border border-blue-300/45 bg-blue-500/20 px-2 py-1 text-[10px] font-semibold text-blue-100">
                      เติมเกม
                    </span>
                    {product.badge_enabled && (product.badge_percent || product.badge_text) && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/50 bg-rose-500/25 px-2 py-1 text-[10px] font-semibold text-rose-100">
                        <Zap className="h-3 w-3" />
                        {[product.badge_text?.trim(), product.badge_percent ? `-${Math.round(product.badge_percent)}%` : null]
                          .filter(Boolean)
                          .join(' ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-3.5">
                  <p className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-tight text-white">{product.name}</p>

                  <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-2.5 py-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-white/55">
                        <Coins className="h-3.5 w-3.5" />
                        เริ่มต้น
                      </span>
                      <span className="text-sm font-bold text-emerald-300">{startPrice > 0 ? `${formatPrice(startPrice)} ฿` : '-'}</span>
                    </div>
                    {hasDiscount && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-200/90">
                        <Flame className="h-3 w-3" />
                        จากราคาเดิม {formatPrice(originalPrice)} ฿
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
