'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, CreditCard, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashcardProduct {
  id: number;
  name: string;
  key: string;
  image_url: string | null;
  item: {
    price: string;
    originalPrice: string;
  } | null;
}

interface CashcardCarouselSectionProps {
  products: CashcardProduct[];
}

function formatPrice(value: number) {
  return value.toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

export default function CashcardCarouselSection({ products }: CashcardCarouselSectionProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(container.scrollLeft > 8);
    setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollButtons();
    container.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [products.length, updateScrollButtons]);

  const scrollByDirection = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const amount = Math.max(Math.floor(container.clientWidth * 0.8), 320);
    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (products.length === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/55 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(168,85,247,0.2),transparent_42%),radial-gradient(circle_at_88%_84%,rgba(59,130,246,0.16),transparent_38%)]" />

      <div className="relative mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-300/40 bg-fuchsia-500/20 text-fuchsia-200 sm:h-11 sm:w-11 sm:rounded-2xl">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white sm:text-xl lg:text-2xl">บัตรเติมเงิน</h2>
            <p className="text-[10px] uppercase tracking-[0.12em] text-fuchsia-200/85 sm:text-xs">Cash Card Collection</p>
          </div>
        </div>

        <Link
          href="/cashcard"
          className="inline-flex shrink-0 items-center gap-1 self-start whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/35 hover:bg-white/20 sm:self-auto sm:text-sm"
        >
          ดูทั้งหมด
        </Link>
      </div>

      <div className="relative">
        {products.length > 2 && (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden items-center justify-between px-1 sm:flex">
            <button
              type="button"
              onClick={() => scrollByDirection('left')}
              disabled={!canScrollLeft}
              className={cn(
                'pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition-all duration-200',
                canScrollLeft ? 'hover:border-fuchsia-300/60 hover:bg-fuchsia-500/20' : 'opacity-0'
              )}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByDirection('right')}
              disabled={!canScrollRight}
              className={cn(
                'pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition-all duration-200',
                canScrollRight ? 'hover:border-fuchsia-300/60 hover:bg-fuchsia-500/20' : 'opacity-0'
              )}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        <div ref={scrollContainerRef} className="scrollbar-hide relative flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 pr-1">
          {products.map((product, index) => {
            const price = Number(product.item?.price || 0);
            return (
              <Link
                key={product.id}
                href={`/cashcard/${product.key}`}
                className="group block min-w-[188px] snap-start sm:min-w-[212px]"
                prefetch={index < 6}
              >
                <article className="overflow-hidden rounded-2xl border border-white/15 bg-black/45 shadow-[0_12px_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-300/55 hover:shadow-[0_15px_36px_rgba(168,85,247,0.24)]">
                  <div className="relative">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        width={212}
                        height={296}
                        className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 188px, 212px"
                        loading={index < 6 ? 'eager' : 'lazy'}
                        priority={index < 3}
                      />
                    ) : (
                      <div className="flex h-[296px] w-full items-center justify-center bg-white/[0.03] text-white/35">
                        <CreditCard className="h-14 w-14" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-fuchsia-300/45 bg-fuchsia-500/20 px-2 py-1 text-[10px] font-semibold text-fuchsia-100">
                      <Flame className="h-3 w-3" />
                      พร้อมส่ง
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">{product.name}</p>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="uppercase tracking-wide text-white/55">เริ่มต้น</span>
                        <span className="font-bold text-fuchsia-200">{price > 0 ? `${formatPrice(price)} ฿` : '-'}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
