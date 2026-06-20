'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Clock3, Flame, ShoppingCart, TrendingDown, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
import { cn } from '@/lib/utils';

interface FlashSaleProduct {
  id: number;
  itemId: number;
  name: string;
  key: string;
  image_url: string | null;
  badge_enabled: boolean;
  badge_percent: number | null;
  badge_text: string | null;
  badge_apply_price: boolean;
  item: {
    id: number;
    name: string;
    price: string;
    originalPrice: string;
    icon_url: string | null;
  } | null;
  savings: string;
  totalSold: number;
  todaySold: number;
  maxQuantity: number | null;
  quantitySold: number;
  quantityRemaining: number | null;
  daysRemaining: number | null;
}

function formatPrice(value: string | number) {
  return Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString('th-TH');
}

export default function FlashSaleSection() {
  const [products, setProducts] = useState<FlashSaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { openLoginDialog } = useAuthDialog();

  const fetchFlashSale = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const res = await fetch(`/api/products/flashsale?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch flashsale products');
      const json = await res.json();
      setProducts(json.data || []);
    } catch (error) {
      console.error('Error fetching flashsale:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFlashSale();
    const interval = setInterval(fetchFlashSale, 60000);
    return () => clearInterval(interval);
  }, [fetchFlashSale]);

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
    const amount = Math.max(Math.floor(container.clientWidth * 0.82), 320);
    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const handleBuy = async (productKey: string) => {
    try {
      const res = await fetch(`/api/products/${productKey}`);
      if (res.status === 401) {
        openLoginDialog();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch product');
      window.location.href = `/products/${productKey}`;
    } catch (error) {
      console.error('Error opening product:', error);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเข้าถึงสินค้าได้',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/15 bg-black/55 p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>

        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[280px] w-[300px] flex-shrink-0 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/55 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(249,115,22,0.2),transparent_38%),radial-gradient(circle_at_86%_82%,rgba(251,191,36,0.14),transparent_36%)]" />

      <div className="relative mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/40 bg-orange-500/20 text-orange-100 sm:h-11 sm:w-11 sm:rounded-2xl">
            <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white sm:text-xl lg:text-2xl">แฟลชเซลล์</h2>
            <p className="text-[10px] uppercase tracking-[0.12em] text-orange-200/85 sm:text-xs">Hot deals, limited stock</p>
          </div>
        </div>

        <Link
          href="/products"
          className="inline-flex shrink-0 items-center gap-1 self-start whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/35 hover:bg-white/20 sm:self-auto sm:text-sm"
        >
          ดูทั้งหมด
        </Link>
      </div>

      <div className="relative">
        {products.length > 1 && (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden items-center justify-between px-1 sm:flex">
            <button
              type="button"
              onClick={() => scrollByDirection('left')}
              disabled={!canScrollLeft}
              className={cn(
                'pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition-all duration-200',
                canScrollLeft ? 'hover:border-orange-300/60 hover:bg-orange-500/20' : 'opacity-0'
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
                canScrollRight ? 'hover:border-orange-300/60 hover:bg-orange-500/20' : 'opacity-0'
              )}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="scrollbar-hide relative flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 pr-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => {
            if (!product.item) return null;

            const originalPrice = Number(product.item.originalPrice || 0);
            const salePrice = Number(product.item.price || 0);
            const savings = Number(product.savings || 0);
            const soldOut = product.quantityRemaining !== null && product.quantityRemaining <= 0;
            const soldPercent = product.maxQuantity
              ? Math.max(0, Math.min(100, Math.round((product.quantitySold / product.maxQuantity) * 100)))
              : 0;

            return (
              <article
                key={`${product.id}-${product.itemId}`}
                className="group min-w-[270px] snap-start overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03] transition-all duration-300 hover:border-orange-300/55 hover:bg-white/[0.05] sm:min-w-[300px] lg:min-w-[330px]"
              >
                <div className="relative h-36 overflow-hidden bg-black/55 sm:h-40">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 270px, (max-width: 1024px) 300px, 330px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/35">
                      <ShoppingCart className="h-12 w-12" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

                  <div className="absolute left-3 top-3 flex gap-2">
                    <span className="inline-flex items-center rounded-full border border-orange-300/50 bg-orange-500/20 px-2.5 py-1 text-[11px] font-semibold text-orange-100">
                      Flash Sale
                    </span>
                    {soldOut && (
                      <span className="inline-flex items-center rounded-full border border-red-300/50 bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-100">
                        Sold out
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <p className="mb-1 line-clamp-1 text-xs text-white/55">{product.name}</p>
                    <h3 className="line-clamp-2 min-h-[40px] text-base font-semibold leading-tight text-white">{product.item.name}</h3>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xl font-bold leading-none text-orange-200">฿{formatPrice(salePrice)}</p>
                      {originalPrice > salePrice && (
                        <p className="mt-1 text-xs text-white/45 line-through">฿{formatPrice(originalPrice)}</p>
                      )}
                    </div>
                    {savings > 0 && (
                      <div className="inline-flex items-center gap-1 rounded-full border border-emerald-300/45 bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                        <TrendingDown className="h-3.5 w-3.5" />
                        ประหยัด ฿{formatPrice(savings)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-white/65">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 text-orange-300" />
                        ขายแล้ว {formatNumber(product.quantitySold || product.totalSold || 0)}
                      </span>
                      {product.maxQuantity !== null && <span>{soldPercent}%</span>}
                    </div>
                    {product.maxQuantity !== null && (
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300" style={{ width: `${soldPercent}%` }} />
                      </div>
                    )}
                    {product.quantityRemaining !== null && (
                      <p className="text-[11px] text-white/60">คงเหลือ {formatNumber(product.quantityRemaining)} ชิ้น</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/65">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5 text-orange-200" />
                      เหลืออีก {Math.max(0, product.daysRemaining || 0)} วัน
                    </span>
                    <span>วันนี้ขาย {formatNumber(product.todaySold)} รายการ</span>
                  </div>

                  <Button
                    onClick={() => handleBuy(product.key)}
                    size="sm"
                    disabled={soldOut}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-black hover:from-orange-400 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ShoppingCart className="mr-1.5 h-4 w-4" />
                    {soldOut ? 'สินค้าหมด' : 'สั่งซื้อทันที'}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
