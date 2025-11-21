import Link from 'next/link';
import Image from 'next/image';
import dynamicImport from 'next/dynamic';
import { getBaseUrl } from '@/lib/url';
import { ChevronRight, Users, PackageCheck, AppWindow } from 'lucide-react';
import { cache } from 'react';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

const PremiumAppCategoryCard = dynamicImport(() => import('@/components/PremiumAppCategoryCard').then(mod => ({ default: mod.PremiumAppCategoryCard })), {
  loading: () => <div className="h-32 w-full bg-gray-900/50 rounded-2xl animate-pulse" />,
  ssr: true,
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

      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-12 relative">
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

        {/* Premium App Products by Category Section */}
        {categoriesWithProductsAndPrices && categoriesWithProductsAndPrices.length > 0 && (
          <div className="space-y-12">
            {categoriesWithProductsAndPrices.map((catData: any) => (
              <section key={catData.category.id} className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {catData.category.icon_url ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-md overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={catData.category.icon_url} 
                          alt={catData.category.display_name}
                          className="w-full h-full object-contain p-1.5"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-md">
                        <AppWindow className="h-6 w-6 text-white" strokeWidth={2.5} />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-white">{catData.category.display_name}</h2>
                      <p className="text-sm text-gray-400">Premium Applications</p>
                    </div>
                  </div>
                  <Link 
                    href={`/premium-app?category=${catData.category.category}`} 
                    className="inline-flex items-center gap-1 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors group"
                  >
                    ดูทั้งหมด
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                  {catData.products.map((product: any, index: number) => (
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
            ))}
          </div>
        )}

        {/* Premium Apps Categories Section */}
        {premiumAppCategories && premiumAppCategories.length > 0 && (
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:max-w-5xl md:mx-auto">
              {premiumAppCategories.map((category: any, index: number) => (
                <PremiumAppCategoryCard key={category.id} category={category} index={index} />
              ))}
            </div>
          </section>
        )}
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
