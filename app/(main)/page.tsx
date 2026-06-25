import Link from 'next/link';
import Image from 'next/image';
import dynamicImport from 'next/dynamic';
import { getBaseUrl } from '@/lib/url';
import { ChevronRight, Users, PackageCheck, AppWindow, Gamepad2, ShoppingBag, Share2 } from 'lucide-react';

const CashcardCarouselSection = dynamicImport(() => import('@/components/CashcardCarouselSection'), {
  loading: () => (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="h-64 w-full bg-gray-900/50 rounded-xl animate-pulse" />
    </section>
  ),
});

const GtopupCarouselSection = dynamicImport(() => import('@/components/GtopupCarouselSection'), {
  loading: () => (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="h-64 w-full bg-gray-900/50 rounded-xl animate-pulse" />
    </section>
  ),
});

const GameAccountsBannerSection = dynamicImport(() => import('@/components/GameAccountsBannerSection'), {
  loading: () => (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="h-64 w-full bg-gray-900/50 rounded-xl animate-pulse" />
    </section>
  ),
});

const RecommendMenuSection = dynamicImport(() => import('@/components/RecommendMenuSection'), {
  loading: () => (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="h-64 w-full bg-gray-900/50 rounded-xl animate-pulse" />
    </section>
  ),
});
import { cache } from 'react';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

const NewsSection = dynamicImport(() => import('@/components/NewsSection'), {
  loading: () => (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="h-64 w-full bg-gray-900/50 rounded-xl animate-pulse" />
    </section>
  ),
});

const PremiumAppCategoryCard = dynamicImport(() => import('@/components/PremiumAppCategoryCard').then(mod => ({ default: mod.PremiumAppCategoryCard })), {
  loading: () => <div className="h-32 w-full bg-gray-900/50 rounded-2xl animate-pulse" />,
  ssr: true,
});

const FlashSaleSection = dynamicImport(() => import('@/components/FlashSaleSection'), {
  loading: () => <div className="h-96 w-full bg-gray-900/50 rounded-2xl animate-pulse" />,
});

const LatestSoldAppPremiumCarousel = dynamicImport(() => import('@/components/LatestSoldAppPremiumCarousel'), {
  loading: () => <div className="h-32 w-full bg-gray-900/50 rounded-xl animate-pulse" />,
});

const getSite = cache(async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/site`, {
    // cache global settings à¸£à¸°à¸¢à¸°à¸ªà¸±à¹‰à¸™ à¸¥à¸” DB round-trip à¸•à¸­à¸™à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸«à¸™à¹‰à¸²
    next: { revalidate: 300, tags: ['site'] },
  });
  return res.ok ? res.json() : { title: 'à¹€à¸•à¸´à¸¡à¹€à¸à¸¡ à¸‡à¹ˆà¸²à¸¢ à¸£à¸§à¸”à¹€à¸£à¹‡à¸§', subtitle: 'à¹€à¸¥à¸·à¸­à¸à¹€à¸à¸¡à¸¢à¸­à¸”à¸™à¸´à¸¢à¸¡à¹à¸¥à¸°à¹€à¸£à¸´à¹ˆà¸¡à¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­à¹„à¸”à¹‰à¸—à¸±à¸™à¸—à¸µ', posters: [] };
});

const getLatestSoldAppPremium = cache(async () => {
  try {
    const sb = createServiceClient();
    
    // ดึงประวัติการขายล่าสุด (orders ทั้งหมด ไม่ซ้ำ product)
    const { data: orders, error } = await sb
      .from('app_premium_orders')
      .select(`
        id,
        created_at,
        app_premium_products (
          id,
          display_name,
          name,
          image_url,
          icon_url
        )
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching latest sold app premium orders:', error);
      return [];
    }

    // แสดงประวัติการขายล่าสุดทั้งหมด (ไม่ต้อง unique)
    const result = (orders || [])
      .filter((order: any) => order.app_premium_products)
      .map((order: any) => {
        const product = order.app_premium_products;
        return {
          id: product.id,
          order_id: order.id,
          display_name: product.display_name || product.name,
          name: product.name,
          image_url: product.image_url,
          icon_url: product.icon_url,
          sold_at: order.created_at,
        };
      })
      .slice(0, 20); // แสดง 20 orders ล่าสุด

    return result;
  } catch (error) {
    console.error('Latest sold app premium fetch error:', error);
    return [];
  }
});

const getPremiumAppCategories = cache(async () => {
  try {
    const sb = createServiceClient();
    
    // Fetch published app premium categories
    const { data: categories, error: catError } = await sb
      .from('app_premium_categories')
      .select('id, category, display_name, icon_url, card_image_url, is_published, display_order')
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });

    if (catError || !categories) {
      console.error('premium app categories fetch error:', catError);
      return [];
    }

    // For each category, count the number of products
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat: any) => {
        // Get all products for this category
        const { data: products } = await sb
          .from('app_premium_products')
          .select('id, name, display_name')
          .eq('is_published', true);

        if (!products || products.length === 0) {
          return { ...cat, productCount: 0 };
        }

        // Filter products by category keywords (case-insensitive)
        const catName = cat.category.toLowerCase();
        const matchingProducts = products.filter((p: any) => {
          const productName = (p.display_name || p.name || '').toLowerCase();
          return productName.includes(catName);
        });

        return {
          id: cat.id,
          category: cat.category,
          display_name: cat.display_name || cat.category,
          icon_url: cat.icon_url,
          card_image_url: cat.card_image_url,
          productCount: matchingProducts.length,
        };
      })
    );

    // Filter out categories with no products
    return categoriesWithCount.filter((cat: any) => cat.productCount > 0);
  } catch (error) {
    console.error('premium app categories fetch error:', error);
    return [];
  }
});

function extractDescriptionSummary(html?: string | null, limit = 2): string[] {
  if (!html) return [];
  const sanitized = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div)>/gi, '\n')
    .replace(/<li[^>]*>/gi, 'â€¢ ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '');
  return sanitized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

const getGameAccounts = cache(async (limit: number = 12) => {
  try {
    const sb = createServiceClient();
    
    // Fetch game accounts with banner images
    const { data: accounts, error: accountsError } = await sb
      .from('game_accounts')
      .select('id, game_name, title, cover_image_url, banner_image_url, price, original_price, is_published')
      .eq('is_published', true)
      .not('banner_image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (accountsError || !accounts) {
      console.error('Error fetching game accounts:', accountsError);
      return [];
    }
    
    if (accounts.length === 0) {
      return [];
    }
    
    return accounts.map((account: any) => ({
      id: account.id,
      name: account.title || account.game_name,
      image_url: account.cover_image_url,
      banner_image_url: account.banner_image_url,
      price: Number(account.price || 0),
      originalPrice: Number(account.original_price || account.price || 0),
    })).filter((a: any) => a.banner_image_url);
  } catch (error) {
    console.error('Error fetching game accounts:', error);
    return [];
  }
});

const getProductsByType = cache(async (productType: 'gtopup' | 'cashcard', limit: number = 12) => {
  try {
    const sb = createServiceClient();

    // Fetch products - à¹€à¸£à¸µà¸¢à¸‡à¸•à¸²à¸¡ badge_enabled à¸à¹ˆà¸­à¸™ (true à¸¡à¸²à¸à¹ˆà¸­à¸™), à¹à¸¥à¹‰à¸§à¸„à¹ˆà¸­à¸¢à¹€à¸£à¸µà¸¢à¸‡à¸•à¸²à¸¡ id
    const { data: products, error: productsError } = await sb
      .from('products')
      .select('id, name, key, image_url, badge_enabled, badge_percent, badge_text, badge_apply_price')
      .eq('is_published', true)
      .eq('product_type', productType)
      .order('badge_enabled', { ascending: false }) // badge_enabled = true à¸¡à¸²à¸à¹ˆà¸­à¸™
      .order('id', { ascending: false })
      .limit(limit * 2); // à¸”à¸¶à¸‡à¸¡à¸²à¸à¸à¸§à¹ˆà¸² limit à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸«à¹‰à¸¡à¸µà¸ªà¸´à¸™à¸„à¹‰à¸²à¸—à¸µà¹ˆà¸¡à¸µ badge à¹€à¸žà¸µà¸¢à¸‡à¸žà¸­
    
    if (productsError || !products) {
      console.error(`Error fetching ${productType} products:`, productsError);
      return [];
    }
    
    if (products.length === 0) {
      return [];
    }
    
    const productIds = products.map((p: any) => p.id);
    
    // Fetch product items
    const { data: items, error: itemsError } = await sb
      .from('product_items')
      .select('id, product_id, name, sku, price, original_price, public_price, agent_discount_percent, agent_cost_price, markup_percent, markup_fixed, is_recommended, icon_url')
      .in('product_id', productIds);
    
    if (itemsError) {
      console.error(`Error fetching ${productType} items:`, itemsError);
      return [];
    }
    
    // Calculate prices and group items by product
    const itemsByProduct = new Map<number, any[]>();
    for (const it of items || []) {
      const arr = itemsByProduct.get(it.product_id as number) || [];
      const agentCost = Number((it as any).agent_cost_price ?? it.price ?? 0);
      const sellBase = Number(it.price ?? agentCost ?? 0);
      const publicPrice = Number((it as any).public_price ?? it.original_price ?? sellBase);

      arr.push({
        id: it.id,
        name: it.name,
        sku: it.sku,
        price: sellBase.toFixed(2),
        originalPrice: publicPrice.toFixed(2),
        is_recommended: Boolean((it as any).is_recommended),
        icon_url: (it as any).icon_url || null
      });
      itemsByProduct.set(it.product_id as number, arr);
    }
    
    // Get orders count
    const { data: orderRows } = await sb
      .from('orders')
      .select('product_id')
      .in('product_id', productIds);
    
    const countByProduct = new Map<number, number>();
    for (const r of orderRows || []) {
      const pid = (r as any).product_id as number;
      countByProduct.set(pid, (countByProduct.get(pid) || 0) + 1);
    }
    
    // Build result
    return products.map((p: any) => {
      const productItems = itemsByProduct.get(p.id) || [];
      // "เริ่มต้น" คือราคาต่ำสุดที่มีขาย ไม่ใช่ไอเทมแรก/ไอเทมแนะนำ
      const cheapestItem = productItems.reduce((min: any, item: any) => {
        if (!min) return item;
        return Number(item.price) < Number(min.price) ? item : min;
      }, null as any);

      return {
        id: p.id,
        name: p.name,
        key: p.key,
        image_url: p.image_url,
        badge_enabled: p.badge_enabled,
        badge_percent: p.badge_percent,
        badge_text: p.badge_text,
        badge_apply_price: p.badge_apply_price,
        badge: p.badge_enabled
          ? {
              text: p.badge_text as string | null,
              percent: p.badge_percent as number | null,
            }
          : null,
        item: cheapestItem || null,
        totalSold: countByProduct.get(p.id) || 0,
      };
    }).filter((p: any) => p.item !== null);
  } catch (error) {
    console.error(`Error fetching ${productType} products:`, error);
    return [];
  }
});

const getPremiumAppProductsByCategory = cache(async () => {
  try {
    const sb = createServiceClient();
    
    // Fetch published app premium categories
    const { data: categories, error: catError } = await sb
      .from('app_premium_categories')
      .select('id, category, display_name, icon_url, is_published, display_order')
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });

    if (catError || !categories) {
      console.error('premium app categories fetch error:', catError);
      return [];
    }

    // For each category, fetch products
    const categoriesWithProducts = await Promise.all(
      categories.map(async (cat: any) => {
        // Get products for this category using app_category field
        const { data: products, error: productsError } = await sb
          .from('app_premium_products')
          .select('id, name, display_name, description, image_url, icon_url, base_price, stock, is_published, app_category')
          .eq('is_published', true)
          .gt('stock', 0)
          .ilike('app_category', `%${cat.category}%`)
          .order('created_at', { ascending: false })
          .limit(12);

        if (productsError) {
          console.error(`Error fetching products for category ${cat.category}:`, productsError);
          return null;
        }

        if (!products || products.length === 0) {
          return null;
        }

        return {
          category: {
            id: cat.id,
            category: cat.category,
            display_name: cat.display_name || cat.category,
            icon_url: cat.icon_url,
          },
          products: products || [],
        };
      })
    );

    // Filter out categories with no products
    return categoriesWithProducts.filter((item): item is NonNullable<typeof item> => item !== null && item.products.length > 0);
  } catch (error) {
    console.error('premium app products by category fetch error:', error);
    return [];
  }
});

// à¹ƒà¸«à¹‰ homepage à¹€à¸›à¹‡à¸™ ISR à¹à¸—à¸™ dynamic à¸—à¸¸à¸à¸„à¸£à¸±à¹‰à¸‡ à¹€à¸žà¸·à¹ˆà¸­à¸¥à¸”à¹€à¸§à¸¥à¸²à¹‚à¸«à¸¥à¸”à¹à¸¥à¸° DB load
export const revalidate = 60;

export default function HomePage() {
  return <HomeServer />;
}

async function HomeServer() {
  const [
    site,
    stats,
    premiumAppProductsByCategory,
    latestSoldAppPremium,
    globalMarkup,
  ] = await Promise.all([
    getSite(),
    getHomeStats(),
    getPremiumAppProductsByCategory(),
    getLatestSoldAppPremium(),
    getGlobalMarkup(),
  ]);

  const { pct: globalPct, fix: globalFix } = globalMarkup;

  // à¸”à¸¶à¸‡à¸ªà¸´à¸™à¸„à¹‰à¸²à¹à¸•à¹ˆà¸¥à¸°à¸›à¸£à¸°à¹€à¸ à¸—à¹à¸šà¸šà¸‚à¸™à¸²à¸™ à¸¥à¸”à¹€à¸§à¸¥à¸² TTFB
  const [gtopupProducts, cashcardProducts, gameAccountProducts] = await Promise.all([
    getProductsByType('gtopup', 12),
    getProductsByType('cashcard', 12),
    getGameAccounts(12),
  ]);
  
  // Calculate prices for products in each category
  const categoriesWithProductsAndPrices = premiumAppProductsByCategory.map((catData: any) => {
    const productsWithPrice = catData.products.map((product: any) => {
      const basePrice = Number(product.base_price || 0);
      const finalPrice = computePrice(
        basePrice,
        0,
        0,
        globalPct,
        globalFix
      );
      return {
        ...product,
        finalPrice,
        summary: extractDescriptionSummary(product.description),
      };
    });
    return {
      ...catData,
      products: productsWithPrice,
    };
  });
  
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.24),transparent_60%),radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.18),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:34px_34px]" />

      <div className="relative mx-auto max-w-[1600px] px-4 pb-14 pt-6 sm:px-6 lg:px-8">
        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(340px,1fr)]">
          <div className="relative min-w-0 self-start overflow-hidden rounded-[28px] border border-white/15 bg-black/45 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            {/* Image block */}
            <div className="relative">
              {site.posters && site.posters.length > 0 ? (
                <>
                  {/* Mobile: natural image ratio, no crop, no letterbox */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={site.posters[0]}
                    alt={site.title || 'Wexplus hero banner'}
                    className="block w-full h-auto sm:hidden"
                    loading="eager"
                    fetchPriority="high"
                  />
                  {/* Desktop: fixed-ratio cover crop */}
                  <div className="relative hidden w-full sm:block sm:aspect-[16/6]">
                    <Image
                      src={site.posters[0]}
                      alt={site.title || 'Wexplus hero banner'}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 1024px) 100vw, (max-width: 1600px) 1050px, 1050px"
                    />
                  </div>
                </>
              ) : (
                <div className="relative w-full bg-gradient-to-br from-emerald-900/30 via-[#0a0a0a] to-cyan-900/30 aspect-[16/9] sm:aspect-[16/6]">
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-white/90">Hero banner area</p>
                      <p className="text-sm text-white/60">Recommended size: 1920 x 720 (16:6)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Caption section below the image, not overlapping */}
            <div className="bg-gradient-to-b from-black/55 to-black/70 px-4 py-4 space-y-2 sm:px-7 sm:py-6 sm:space-y-4 lg:px-10 lg:py-7">
              <span className="inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 sm:px-3 sm:py-1 sm:text-xs">
                24/7 automated checkout
              </span>
              <h1 className="text-base font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                {site.title || 'Fast digital top-up and game services'}
              </h1>
              <p className="line-clamp-2 max-w-xl text-xs text-white/80 sm:text-base sm:line-clamp-none">
                {site.subtitle || 'Top up games, mobile credits, premium apps, and social services from one trusted storefront.'}
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-400 sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  Browse products
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
                <Link
                  href="/premium-app"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/35 px-3.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:border-white/45 hover:bg-white/10 sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  Explore premium apps
                </Link>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-4">
            <div className="min-w-0 overflow-hidden rounded-3xl border border-white/15 bg-black/45 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-300">Platform Snapshot</p>
                <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                  Live
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Users', value: stats.totalUsers.toLocaleString('th-TH'), icon: Users },
                  { label: 'Orders', value: stats.totalOrders.toLocaleString('th-TH'), icon: PackageCheck },
                  { label: 'Premium stock', value: stats.premiumStock.toLocaleString('th-TH'), icon: AppWindow },
                  { label: 'Game accounts', value: gameAccountProducts.length.toLocaleString('th-TH'), icon: Gamepad2 },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-[11px] uppercase tracking-wide text-white/55">{item.label}</p>
                      <p className="text-lg font-semibold text-white">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {latestSoldAppPremium.length > 0 && (
              <div className="min-w-0 overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-900/20 via-black/50 to-cyan-900/20 p-5 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                    <AppWindow className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-300">Latest Sold Premium Apps</h2>
                    <p className="text-xs text-white/60">Updated from recent completed orders</p>
                  </div>
                </div>
                <LatestSoldAppPremiumCarousel products={latestSoldAppPremium} />
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <RecommendMenuSection />
        </section>

        <main className="mt-8 space-y-10">
          <FlashSaleSection />

          <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {[
              {
                title: 'Users',
                value: stats.totalUsers.toLocaleString('th-TH'),
                subtext: 'registered customers',
                icon: Users,
              },
              {
                title: 'Orders',
                value: stats.totalOrders.toLocaleString('th-TH'),
                subtext: 'completed transactions',
                icon: PackageCheck,
              },
              {
                title: 'Premium stock',
                value: stats.premiumStock.toLocaleString('th-TH'),
                subtext: 'ready-to-sell apps',
                icon: AppWindow,
              },
              {
                title: 'Games',
                value: stats.totalGames.toLocaleString('th-TH'),
                subtext: 'available game list',
                icon: Gamepad2,
              },
              {
                title: 'Other products',
                value: stats.totalProducts.toLocaleString('th-TH'),
                subtext: 'top-up and gift cards',
                icon: ShoppingBag,
              },
              {
                title: 'Social services',
                value: stats.totalSocialServices.toLocaleString('th-TH'),
                subtext: 'boost services ready',
                icon: Share2,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex flex-col items-center rounded-xl border border-white/15 bg-black/45 p-3 text-center shadow-[0_12px_35px_rgba(0,0,0,0.35)] sm:rounded-2xl sm:p-4"
                >
                  <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 sm:mb-3 sm:h-9 sm:w-9">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wide text-white/55 sm:text-[11px]">{item.title}</p>
                  <p className="text-lg font-bold leading-tight text-white sm:text-2xl">{item.value}</p>
                  <p className="text-[11px] text-white/55 sm:text-xs">{item.subtext}</p>
                </div>
              );
            })}
          </section>

          {(() => {
            const allPremiumProducts = categoriesWithProductsAndPrices.flatMap((catData: any) =>
              catData.products.map((product: any) => ({
                ...product,
                categoryName: catData.category.display_name,
              }))
            );

            const shuffledProducts = [...allPremiumProducts];
            for (let i = shuffledProducts.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledProducts[i], shuffledProducts[j]] = [shuffledProducts[j], shuffledProducts[i]];
            }

            const displayProducts = shuffledProducts.slice(0, 12);

            return displayProducts.length > 0 ? (
              <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/55 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(16,185,129,0.2),transparent_40%),radial-gradient(circle_at_86%_82%,rgba(6,182,212,0.14),transparent_38%)]" />

                <div className="relative mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-500/15 text-emerald-200 sm:h-11 sm:w-11 sm:rounded-2xl">
                      <AppWindow className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-white sm:text-xl lg:text-2xl">Premium App Picks</h2>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-200/85 sm:text-xs">Fresh inventory highlights</p>
                    </div>
                  </div>

                  <Link
                    href="/premium-app"
                    className="inline-flex shrink-0 items-center gap-1 self-start whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/35 hover:bg-white/20 sm:self-auto sm:text-sm"
                  >
                    ดูทั้งหมด
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Link>
                </div>

                <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {displayProducts.map((product: any, index: number) => (
                    <Link
                      key={product.id}
                      href={`/premium-app/${product.id}`}
                      className="group block h-full"
                      prefetch={index < 6}
                    >
                      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/55 hover:shadow-[0_16px_34px_rgba(16,185,129,0.22)]">
                        <div className="relative h-32 w-full overflow-hidden bg-black/45 sm:h-36 md:h-40">
                          {product.image_url || product.icon_url ? (
                            <Image
                              src={product.image_url || product.icon_url}
                              alt={product.display_name || product.name}
                              fill
                              className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 180px"
                              loading={index < 6 ? 'eager' : 'lazy'}
                              priority={index < 3}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-white/35">
                              <AppWindow className="h-12 w-12" />
                            </div>
                          )}

                          <div className="absolute left-2 top-2 inline-flex rounded-full border border-emerald-300/45 bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-100">
                            {product.categoryName || 'Premium App'}
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col p-3.5">
                          <div
                            className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-tight text-white"
                            dangerouslySetInnerHTML={{ __html: product.display_name || product.name || '' }}
                            suppressHydrationWarning
                          />

                          <div className="mt-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-2.5 py-2 text-[11px] text-white/70">
                            {product.summary && product.summary.length > 0 ? (
                              <p className="line-clamp-2">{product.summary.slice(0, 2).join(' • ')}</p>
                            ) : (
                              <p className="line-clamp-2 text-white/45">รายละเอียดบริการจะอัปเดตเพิ่มเติมในหน้าสินค้า</p>
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
                              <p className="text-[10px] uppercase tracking-wide text-white/45">Price</p>
                              <p className="text-sm font-semibold text-emerald-300">฿{Number(product.finalPrice || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
                              <p className="text-[10px] uppercase tracking-wide text-white/45">Stock</p>
                              <p className="text-sm font-semibold text-white">{product.stock > 0 ? product.stock.toLocaleString('th-TH') : 'หมด'}</p>
                            </div>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null;
          })()}

          {(() => {
            const productsWithBadge = gtopupProducts.filter((p: any) => p.badge_enabled === true);
            const productsWithoutBadge = gtopupProducts.filter((p: any) => !p.badge_enabled || p.badge_enabled === false);

            const shuffledWithBadge = [...productsWithBadge];
            for (let i = shuffledWithBadge.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledWithBadge[i], shuffledWithBadge[j]] = [shuffledWithBadge[j], shuffledWithBadge[i]];
            }

            const shuffledWithoutBadge = [...productsWithoutBadge];
            for (let i = shuffledWithoutBadge.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledWithoutBadge[i], shuffledWithoutBadge[j]] = [shuffledWithoutBadge[j], shuffledWithoutBadge[i]];
            }

            const maxWithBadge = Math.min(shuffledWithBadge.length, 12);
            const remainingSlots = 12 - maxWithBadge;
            const displayProducts = [
              ...shuffledWithBadge.slice(0, maxWithBadge),
              ...shuffledWithoutBadge.slice(0, remainingSlots),
            ];

            return site.navbarMenus?.products !== false && displayProducts.length > 0 ? <GtopupCarouselSection products={displayProducts} /> : null;
          })()}

          {site.navbarMenus?.cashcard !== false && cashcardProducts.length > 0 && <CashcardCarouselSection products={cashcardProducts} />}

          {site.navbarMenus?.categories !== false && <GameAccountsBannerSection bannerUrl={site.gameAccountsBannerUrl || null} />}

          <NewsSection />
        </main>
      </div>
    </div>
  );
}
const getHomeStats = cache(async () => {
  try {
    const sb = createServiceClient();
    const [
      usersRes,
      ordersRes,
      gameOrdersRes,
      socialOrdersRes,
      cashcardOrdersRes,
      premiumOrdersRes,
      slipData,
      redeemData,
      premiumStockData,
      gtopupProductsRes,
      gameAccountsRes,
      socialServicesRes,
    ] = await Promise.all([
      sb.from('users').select('id', { count: 'exact', head: true }),
      sb.from('orders').select('id', { count: 'exact', head: true }),
      sb.from('game_account_orders').select('id', { count: 'exact', head: true }),
      sb.from('social_orders').select('id', { count: 'exact', head: true }),
      sb.from('cashcard_orders').select('id', { count: 'exact', head: true }),
      sb.from('app_premium_orders').select('id', { count: 'exact', head: true }),
      sb.from('slip_history').select('amount').in('status', ['success', 'completed']),
      sb.from('redeem_code_usage').select('points'),
      sb.from('app_premium_products').select('stock').eq('is_published', true),
      sb.from('products').select('id', { count: 'exact', head: true }).eq('is_published', true).eq('product_type', 'gtopup'),
      sb.from('game_accounts').select('id', { count: 'exact', head: true }).eq('is_published', true).not('game_category_id', 'is', null),
      sb.from('social_services').select('id', { count: 'exact', head: true }).eq('is_published', true),
    ]);

    const totalUsers = usersRes?.count ?? 0;
    const totalOrders =
      (ordersRes?.count ?? 0) +
      (gameOrdersRes?.count ?? 0) +
      (socialOrdersRes?.count ?? 0) +
      (cashcardOrdersRes?.count ?? 0) +
      (premiumOrdersRes?.count ?? 0);

    // Calculate topup sum manually
    const slipSum = (slipData?.data || []).reduce((sum, row: any) => {
      const amount = Number(row?.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const redeemSum = (redeemData?.data || []).reduce((sum, row: any) => {
      const points = Number(row?.points);
      return sum + (Number.isFinite(points) ? points : 0);
    }, 0);

    const totalTopup = slipSum + redeemSum;

    // Calculate premium stock sum manually
    const premiumStock = Math.max(
      0,
      Math.floor(
        (premiumStockData?.data || []).reduce((sum, row: any) => {
          const stock = Number(row?.stock);
          return sum + (Number.isFinite(stock) ? stock : 0);
        }, 0)
      )
    );

    // จำนวนเกม = products ที่เป็น gtopup (เกมที่เปิดให้เติม)
    const totalGames = gtopupProductsRes?.count ?? 0;
    
    // สินค้าอื่นๆ = game_accounts ที่ is_published = true
    const totalProducts = gameAccountsRes?.count ?? 0;
    
    const totalSocialServices = socialServicesRes?.count ?? 0;

    const parseNumber = (value: unknown) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    return {
      totalUsers: parseNumber(totalUsers),
      totalOrders: parseNumber(totalOrders),
      totalTopup: parseNumber(totalTopup),
      premiumStock: parseNumber(premiumStock),
      totalGames: parseNumber(totalGames),
      totalProducts: parseNumber(totalProducts),
      totalSocialServices: parseNumber(totalSocialServices),
    };
  } catch (error) {
    console.error('home stats fetch error:', error);
    return {
      totalUsers: 0,
      totalOrders: 0,
      totalTopup: 0,
      premiumStock: 0,
      totalGames: 0,
      totalProducts: 0,
      totalSocialServices: 0,
    };
  }
});

