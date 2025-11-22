import Link from 'next/link';
import Image from 'next/image';
import dynamicImport from 'next/dynamic';
import { getBaseUrl } from '@/lib/url';
import { ChevronRight, Users, PackageCheck, AppWindow, Gamepad2, CreditCard, User } from 'lucide-react';

const CashcardCarouselSection = dynamicImport(() => import('@/components/CashcardCarouselSection'), {
  loading: () => (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="h-64 w-full bg-gray-900/50 rounded-xl animate-pulse" />
    </section>
  ),
  ssr: false,
});

const GtopupCarouselSection = dynamicImport(() => import('@/components/GtopupCarouselSection'), {
  loading: () => (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="h-64 w-full bg-gray-900/50 rounded-xl animate-pulse" />
    </section>
  ),
  ssr: false,
});

const GameAccountsBannerSection = dynamicImport(() => import('@/components/GameAccountsBannerSection'), {
  loading: () => (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="h-64 w-full bg-gray-900/50 rounded-xl animate-pulse" />
    </section>
  ),
  ssr: false,
});

const RecommendMenuSection = dynamicImport(() => import('@/components/RecommendMenuSection'), {
  loading: () => (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="h-64 w-full bg-gray-900/50 rounded-xl animate-pulse" />
    </section>
  ),
  ssr: false,
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
  ssr: false,
});

const PremiumAppCategoryCard = dynamicImport(() => import('@/components/PremiumAppCategoryCard').then(mod => ({ default: mod.PremiumAppCategoryCard })), {
  loading: () => <div className="h-32 w-full bg-gray-900/50 rounded-2xl animate-pulse" />,
  ssr: true,
});

const FlashSaleSection = dynamicImport(() => import('@/components/FlashSaleSection'), {
  loading: () => <div className="h-96 w-full bg-gray-900/50 rounded-2xl animate-pulse" />,
  ssr: false,
});

const getSite = cache(async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/site`, { next: { revalidate: 120, tags: ['site'] } });
  return res.ok ? res.json() : { title: 'เติมเกม ง่าย รวดเร็ว', subtitle: 'เลือกเกมยอดนิยมและเริ่มสั่งซื้อได้ทันที', posters: [] };
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
    .replace(/<li[^>]*>/gi, '• ')
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
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();
    
    // Fetch products - เรียงตาม badge_enabled ก่อน (true มาก่อน), แล้วค่อยเรียงตาม id
    const { data: products, error: productsError } = await sb
      .from('products')
      .select('id, name, key, image_url, badge_enabled, badge_percent, badge_text, badge_apply_price')
      .eq('is_published', true)
      .eq('product_type', productType)
      .order('badge_enabled', { ascending: false }) // badge_enabled = true มาก่อน
      .order('id', { ascending: false })
      .limit(limit * 2); // ดึงมากกว่า limit เพื่อให้มีสินค้าที่มี badge เพียงพอ
    
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
      const publicPrice = Number((it as any).public_price ?? it.original_price ?? agentCost);
      const pct = Number((it as any).markup_percent ?? 0);
      const fix = Number((it as any).markup_fixed ?? 0);
      const computed = computePrice(agentCost, pct, fix, globalPct, globalFix);
      
      arr.push({
        id: it.id,
        name: it.name,
        sku: it.sku,
        price: computed.toFixed(2),
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
      const recommendedItem = productItems.find((item: any) => item.is_recommended) || productItems[0];
      
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
        item: recommendedItem || null,
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

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <HomeServer />
  );
}

async function HomeServer() {
  const site = await getSite();
  const stats = await getHomeStats();
  const premiumAppCategories = await getPremiumAppCategories();
  const premiumAppProductsByCategory = await getPremiumAppProductsByCategory();
  const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();
  
  // Fetch products by type in order: gtopup, cashcard, game_accounts
  const gtopupProducts = await getProductsByType('gtopup', 12);
  const cashcardProducts = await getProductsByType('cashcard', 12);
  const gameAccountProducts = await getGameAccounts(12);
  
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
    <div className="min-h-screen bg-black relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(16, 185, 129) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>
      
      {/* Decorative Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-emerald-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero Banner Section */}
      <div className="relative">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
          <div className="rounded-2xl overflow-hidden shadow-xl">
            <div className="relative w-full" style={{ aspectRatio: '3264/1173' }}>
              <Image
                src="https://www.overzoneshop.com/img/slide/20251105_051454.jpg"
                alt="Overzone Shop - เติมเกม ผ่อนได้เกม"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1600px) 100vw, 1600px"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recommend Menu Section - Under Hero Banner */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
        <RecommendMenuSection />
      </div>

      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-12 relative">
        {/* Flash Sale Section */}
        <FlashSaleSection />

        {/* Summary Stats Section */}
        <section className="grid grid-cols-2 gap-3 max-[380px]:grid-cols-1 md:grid-cols-3">
          {[
            {
              title: 'ผู้ใช้งาน',
              value: stats.totalUsers.toLocaleString('th-TH'),
              subtext: 'สมาชิกทั้งหมด',
              icon: Users,
            },
            {
              title: 'จำนวนออเดอร์',
              value: stats.totalOrders.toLocaleString('th-TH'),
              subtext: 'คำสั่งซื้อทั้งหมด',
              icon: PackageCheck,
            },
            {
              title: 'สต็อกแอพพรีเมี่ยม',
              value: stats.premiumStock.toLocaleString('th-TH'),
              subtext: 'รายการพร้อมจำหน่าย',
              icon: AppWindow,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-2xl border border-emerald-800 bg-[#0a0a0a] p-4 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/20 text-emerald-500 sm:h-12 sm:w-12">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-500">{item.title}</p>
                  <p className="text-xl font-bold tracking-tight text-white sm:text-2xl">{item.value}</p>
                  <p className="text-xs text-gray-400 sm:text-sm">{item.subtext}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Products Sections - Ordered by: Premium App, Gtopup, Cashcard, Game Accounts */}
        
        {/* 1. Premium App Products Section (Combined) */}
        {(() => {
          // Combine all products from all categories into one array
          const allPremiumProducts = categoriesWithProductsAndPrices.flatMap((catData: any) => 
            catData.products.map((product: any) => ({
              ...product,
              categoryName: catData.category.display_name,
            }))
          );
          
          // Shuffle array randomly (Fisher-Yates shuffle)
          const shuffledProducts = [...allPremiumProducts];
          for (let i = shuffledProducts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledProducts[i], shuffledProducts[j]] = [shuffledProducts[j], shuffledProducts[i]];
          }
          
          // Limit to 12 products (2 rows x 6 columns)
          const displayProducts = shuffledProducts.slice(0, 12);
          
          return displayProducts.length > 0 ? (
            <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-md">
                    <AppWindow className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">แอพพรีเมี่ยม</h2>
                    <p className="text-sm text-gray-400">Premium Applications</p>
                  </div>
                </div>
                <Link 
                  href="/premium-app" 
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors group"
                >
                  ดูทั้งหมด
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                {displayProducts.map((product: any, index: number) => (
                    <Link 
                      key={product.id} 
                      href={`/premium-app/${product.id}`} 
                      className="group block h-full"
                      prefetch={index < 6}
                    >
                      <div className="flex h-full flex-col rounded-xl sm:rounded-2xl border border-gray-800/60 bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] p-3 sm:p-4 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/70 hover:shadow-xl hover:shadow-emerald-900/20">
                        {/* Product Image - Fixed Height */}
                        <div className="relative h-32 sm:h-36 md:h-40 w-full rounded-lg sm:rounded-xl overflow-hidden bg-gray-900/60 flex items-center justify-center mb-3 sm:mb-4 flex-shrink-0">
                          {product.image_url || product.icon_url ? (
                            <Image 
                              src={product.image_url || product.icon_url} 
                              alt={product.display_name || product.name} 
                              fill
                              className="object-contain p-3 sm:p-4 transition-transform duration-300 group-hover:scale-105" 
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 180px"
                              loading={index < 6 ? 'eager' : 'lazy'}
                              priority={index < 3}
                            />
                          ) : (
                            <AppWindow className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-gray-600" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                        
                        {/* Product Info - Flex container with fixed bottom */}
                        <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-h-0">
                          {/* Product Name - Fixed height */}
                          <div
                            className="text-xs sm:text-sm font-semibold text-white line-clamp-2 h-[2.5rem] sm:h-[2.8rem] text-center leading-snug sm:leading-tight flex items-center justify-center"
                            dangerouslySetInnerHTML={{ __html: product.display_name || product.name || '' }}
                            suppressHydrationWarning
                          />
                          
                          {/* Product Details - Flexible middle section */}
                          <div className="flex-1 min-h-0 flex flex-col rounded-lg sm:rounded-xl border border-emerald-900/40 bg-emerald-900/5 px-2.5 sm:px-3 py-2 sm:py-3 shadow-inner">
                            {/* Summary - Flexible content area */}
                            <div className="flex-1 min-h-[3rem] sm:min-h-[3.5rem] flex flex-col justify-start">
                              {product.summary && product.summary.length > 0 ? (
                                <ul className="text-[10px] sm:text-xs text-gray-300 space-y-1">
                                  {product.summary.slice(0, 2).map((line: string, idx: number) => (
                                    <li key={`${product.id}-summary-${idx}`} className="flex items-start gap-1.5">
                                      <span className="text-emerald-500 leading-4 flex-shrink-0 mt-0.5 text-[10px]">•</span>
                                      <span className="flex-1 leading-4 line-clamp-2">{line.replace(/^•\s*/, '')}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[10px] sm:text-xs text-gray-500 text-center py-0.5">ยังไม่มีรายละเอียด</p>
                              )}
                            </div>
                            
                            {/* Price and Stock - Fixed at bottom */}
                            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 mt-auto border-t border-emerald-900/20 flex-shrink-0">
                              <div className="rounded-md sm:rounded-lg bg-black/30 px-2 sm:px-2.5 py-1.5 sm:py-2 border border-white/5">
                                <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-gray-500 mb-0.5 sm:mb-1">ราคา</div>
                                <div className="text-sm sm:text-base font-bold text-emerald-400 leading-none">{product.finalPrice.toFixed(0)} ฿</div>
                              </div>
                              <div className="rounded-md sm:rounded-lg bg-black/30 px-2 sm:px-2.5 py-1.5 sm:py-2 border border-white/5">
                                <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-gray-500 mb-0.5 sm:mb-1">คงเหลือ</div>
                                {product.stock > 0 ? (
                                  <div className="text-sm sm:text-base font-semibold text-white leading-none">{product.stock}</div>
                                ) : (
                                  <div className="text-xs sm:text-sm font-semibold text-red-400 leading-none">หมด</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
          ) : null;
        })()}


        {/* 2. Gtopup (เติมเกม) Section */}
        {(() => {
          // แยกสินค้าที่มี badge_enabled (มีโปรโมชั่น) กับไม่มี
          const productsWithBadge = gtopupProducts.filter((p: any) => p.badge_enabled === true);
          const productsWithoutBadge = gtopupProducts.filter((p: any) => !p.badge_enabled || p.badge_enabled === false);
          
          // สุ่มสินค้าที่มี badge
          const shuffledWithBadge = [...productsWithBadge];
          for (let i = shuffledWithBadge.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledWithBadge[i], shuffledWithBadge[j]] = [shuffledWithBadge[j], shuffledWithBadge[i]];
          }
          
          // สุ่มสินค้าที่ไม่มี badge
          const shuffledWithoutBadge = [...productsWithoutBadge];
          for (let i = shuffledWithoutBadge.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledWithoutBadge[i], shuffledWithoutBadge[j]] = [shuffledWithoutBadge[j], shuffledWithoutBadge[i]];
          }
          
          // รวมกัน โดยสินค้าที่มี badge มาก่อนเสมอ
          // เอา badge มาก่อน (สูงสุด 12 อัน), ถ้าไม่พอค่อยเอาไม่มี badge มาเติม
          const maxWithBadge = Math.min(shuffledWithBadge.length, 12);
          const remainingSlots = 12 - maxWithBadge;
          const displayProducts = [
            ...shuffledWithBadge.slice(0, maxWithBadge),
            ...shuffledWithoutBadge.slice(0, remainingSlots)
          ];
          
          return displayProducts.length > 0 ? (
            <GtopupCarouselSection products={displayProducts} />
          ) : null;
        })()}

        {/* 3. Cashcard (บัตรเติมเงิน) Section */}
        {cashcardProducts.length > 0 && (
          <CashcardCarouselSection products={cashcardProducts} />
        )}

        {/* 4. Game Accounts (ไอดีเกมส์) Section */}
        <GameAccountsBannerSection />

        {/* 5. News Section (ข่าวสาร) */}
        <NewsSection />
      </main>
    </div>
  );
}

const getHomeStats = cache(async () => {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/home/stats`, {
      next: { revalidate: 60, tags: ['home-stats'] },
    });
    if (!res.ok) {
      throw new Error(`home stats request failed: ${res.status}`);
    }
    const data = await res.json();
    const parseNumber = (value: unknown) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };
    return {
      totalUsers: parseNumber(data?.totalUsers),
      totalOrders: parseNumber(data?.totalOrders),
      totalTopup: parseNumber(data?.totalTopup),
      premiumStock: parseNumber(data?.premiumStock),
    };
  } catch (error) {
    console.error('home stats fetch error:', error);
    return {
      totalUsers: 0,
      totalOrders: 0,
      totalTopup: 0,
      premiumStock: 0,
    };
  }
});
