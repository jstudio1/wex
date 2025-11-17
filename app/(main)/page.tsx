import Link from 'next/link';
import Image from 'next/image';
import { getBaseUrl } from '@/lib/url';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { cache } from 'react';
import { CACHE_CONFIG } from '@/lib/cache';
const FlashSaleCountdown = dynamic(() => import('@/components/FlashSaleCountdown'), { ssr: false });
const HeroSlider = dynamic(() => import('@/components/HeroSlider'), { ssr: false });
const GameCategoryList = dynamic(() => import('@/components/GameCategoryList'), { ssr: false, loading: () => <div className="h-32 animate-pulse bg-white/5 rounded" /> });

const getSite = cache(async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/site`, { next: { revalidate: 120, tags: ['site'] } });
  return res.ok ? res.json() : { title: 'เติมเกม ง่าย รวดเร็ว', subtitle: 'เลือกเกมยอดนิยมและเริ่มสั่งซื้อได้ทันที', posters: [] };
});

const getProducts = cache(async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/products`, { next: { revalidate: 120, tags: ['products'] } });
  return res.ok ? (await res.json()).data : [];
});

const getGameCategories = cache(async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/game-categories`, { next: { revalidate: 120, tags: ['game-categories'] } });
  return res.ok ? (await res.json()).data : [];
});

export default function HomePage() {
  return (
    <HomeServer />
  );
}

async function HomeServer() {
  const site = await getSite();
  const products = await getProducts();
  const gameCategories = await getGameCategories();
  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      {/* Flash Sale header */}
      {(site.flashStart || site.flashEnd) && (
        <div className="flex items-center justify-between">
          <Image 
            src="https://img2.pic.in.th/pic/flashsale.webp" 
            alt="Flash Sale" 
            width={200} 
            height={40} 
            className="h-8 md:h-10 w-auto" 
            priority
          />
          <FlashSaleCountdown start={site.flashStart} end={site.flashEnd} />
        </div>
      )}
      <section className="rounded-lg overflow-hidden border border-white/10">
        <div className="relative aspect-[16/6] bg-white/5">
          <HeroSlider posters={site.posters || []} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute left-6 bottom-6">
            <h1 className="text-2xl font-semibold">{site.title}</h1>
            <p className="text-[color:var(--text)]/80 text-sm mt-1">{site.subtitle}</p>
          </div>
        </div>
      </section>

      {/* Flash Sale products list (badge-enabled) */}
      {(() => {
        const flash = (products || []).filter((p: any) => {
          const text = p?.badge?.text && String(p.badge.text).trim().length > 0;
          const pct = typeof p?.badge?.percent === 'number' && p.badge.percent > 0;
          return text || pct;
        });
        if (!flash.length) return null;
        return (
          <section>
            <div className="flex items-center gap-3 mb-3">
              <Image 
                src="https://img2.pic.in.th/pic/flashsale.webp" 
                alt="Flash Sale" 
                width={200} 
                height={32} 
                className="h-6 md:h-8 w-auto" 
                priority
              />
              <FlashSaleCountdown start={site.flashStart} end={site.flashEnd} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8">
              {flash.map((p: any, index: number) => {
                const manualText = p?.badge?.text?.trim?.();
                const manualPercent = typeof p?.badge?.percent === 'number' ? Math.round(Number(p.badge.percent)) : null;
                const badgeText = manualText && manualText.length
                  ? manualText
                  : manualPercent != null && manualPercent > 0
                    ? `${manualPercent}% OFF`
                    : null;
                return (
                  <Link key={p.id} href={`/products/${p.key}`} className="group block text-center" prefetch={index < 6}>
                    <div className="relative">
                      {p.image_url ? (
                        <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl overflow-hidden relative">
                          <Image 
                            src={p.image_url} 
                            alt={p.name} 
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" 
                            sizes="(max-width: 640px) 160px, 176px"
                            loading={index < 6 ? 'eager' : 'lazy'}
                            priority={index < 3}
                          />
                        </div>
                      ) : (
                        <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl bg-white/10 flex items-center justify-center">
                          <span className="text-xs text-[color:var(--text)]/40 text-center px-2">ไม่มีรูป</span>
                        </div>
                      )}
                      {badgeText && (
                        <div className="absolute -bottom-2 left-2">
                          <Badge variant="destructive" className="shadow-sm gap-1">
                            <Zap className="size-3" />
                            <span className="font-semibold whitespace-nowrap">{badgeText}</span>
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-sm font-medium truncate">{p.name}</div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })()}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-accent text-xl font-semibold">เกมยอดนิยม</h2>
          <Link href="/products" className="text-sm text-[color:var(--text)]/70 hover:opacity-80">ดูทั้งหมด</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8">
          {products.slice(0, 8).map((p: any, index: number) => {
            const manualText = p?.badge?.text?.trim?.();
            const manualPercent = typeof p?.badge?.percent === 'number' ? Math.round(Number(p.badge.percent)) : null;
            const badgeText = manualText && manualText.length
              ? manualText
              : manualPercent != null && manualPercent > 0
                ? `${manualPercent}% OFF`
                : null;
            return (
              <Link key={p.id} href={`/products/${p.key}`} className="group block text-center" prefetch={index < 6}>
                <div className="relative">
                  {p.image_url ? (
                    <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl overflow-hidden relative">
                      <Image 
                        src={p.image_url} 
                        alt={p.name} 
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" 
                        sizes="(max-width: 640px) 160px, 176px"
                        loading={index < 6 ? 'eager' : 'lazy'}
                        priority={index < 3}
                      />
                    </div>
                  ) : (
                    <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl bg-white/10 flex items-center justify-center">
                      <span className="text-xs text-[color:var(--text)]/40 text-center px-2">ไม่มีรูป</span>
                    </div>
                  )}
                  {badgeText && (
                    <div className="absolute -bottom-2 left-2">
                      <Badge variant="destructive" className="shadow-sm gap-1">
                        <Zap className="size-3" />
                        <span className="font-semibold whitespace-nowrap">{badgeText}</span>
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-sm font-medium truncate">{p.name}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* สินค้าอื่นๆ - Game Categories */}
      {gameCategories && gameCategories.length > 0 && (
        <section>
          <GameCategoryList categories={gameCategories} title="สินค้าอื่นๆ" />
        </section>
      )}
    </main>
  );
}


