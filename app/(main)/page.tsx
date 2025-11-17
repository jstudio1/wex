import Link from 'next/link';
import Image from 'next/image';
import { getBaseUrl } from '@/lib/url';
import dynamicImport from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Zap, ChevronRight, Gamepad2, Users, PackageCheck, AppWindow } from 'lucide-react';
import { cache } from 'react';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';
import { PremiumAppCategoryCard } from '@/components/PremiumAppCategoryCard';
const FlashSaleCountdown = dynamicImport(() => import('@/components/FlashSaleCountdown'), { ssr: false });

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

const getHomepageCategories = cache(async () => {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('categories')
      .select('id, name, slug')
      .eq('is_published', true)
      .eq('show_on_homepage', true)
      .order('name');
    
    if (error) {
      console.error('homepage categories fetch error:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('homepage categories fetch error:', error);
    return [];
  }
});

const getGameAccountsByCategory = cache(async () => {
  try {
    const sb = createServiceClient();
    
    // Get all published game categories
    const { data: categories } = await sb
      .from('game_categories')
      .select('id, name, slug, image_url')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    if (!categories || categories.length === 0) return [];
    
    // Get game accounts for each category
    const categoriesWithAccounts = await Promise.all(
      categories.map(async (category) => {
        const { data } = await sb
          .from('game_accounts')
          .select('id, game_name, game_category_id, title, description, cover_image_url, additional_images, price, original_price, discount_percent, stock, created_at')
          .eq('is_published', true)
          .eq('game_category_id', category.id)
          .is('sold_at', null)
          .gt('stock', 0)
          .order('created_at', { ascending: false })
          .limit(12);
        
        if (!data || data.length === 0) return null;
        
        // Group by game_name and base title
        const grouped = new Map<string, any>();
        for (const acc of data) {
          const baseTitle = (acc.title as string).split(' #')[0];
          const key = `${acc.game_name}::${baseTitle}`;
          if (!grouped.has(key)) {
            grouped.set(key, {
              ...acc,
              title: baseTitle,
              stock: 0,
            });
          }
          grouped.get(key).stock += acc.stock || 0;
        }
        
        const accounts = Array.from(grouped.values()).slice(0, 12);
        
        return {
          category,
          accounts,
        };
      })
    );
    
    // Filter out categories with no accounts
    return categoriesWithAccounts.filter((item): item is NonNullable<typeof item> => item !== null && item.accounts.length > 0);
  } catch (error) {
    console.error('game accounts by category fetch error:', error);
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

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <HomeServer />
  );
}

async function HomeServer() {
  const site = await getSite();
  const allProducts = await getProducts();
  const homepageCategories = await getHomepageCategories();
  const stats = await getHomeStats();
  const gameAccountsByCategory = await getGameAccountsByCategory();
  const premiumAppCategories = await getPremiumAppCategories();
  
  // Filter products to show only those from homepage categories
  const homepageCategoryIds = new Set(homepageCategories.map(cat => cat.id));
  const products = homepageCategoryIds.size > 0 
    ? allProducts.filter((p: any) => homepageCategoryIds.has(p.category_id))
    : allProducts;
  
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

        {/* Flash Sale Section */}
        {(() => {
          const flash = (products || []).filter((p: any) => {
            const text = p?.badge?.text && String(p.badge.text).trim().length > 0;
            const pct = typeof p?.badge?.percent === 'number' && p.badge.percent > 0;
            return text || pct;
          });
          if (!flash.length) return null;
          return (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="https://img2.pic.in.th/pic/flashsale.webp" 
                    alt="Flash Sale" 
                    className="h-8 md:h-10 w-auto" 
                  />
                  <FlashSaleCountdown start={site.flashStart} end={site.flashEnd} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {flash.map((p: any, index: number) => {
                  const manualText = p?.badge?.text?.trim?.();
                  const manualPercent = typeof p?.badge?.percent === 'number' ? Math.round(Number(p.badge.percent)) : null;
                  const badgeText = manualText && manualText.length
                    ? manualText
                    : manualPercent != null && manualPercent > 0
                      ? `${manualPercent}% OFF`
                      : null;
                  return (
                    <Link 
                      key={p.id} 
                      href={`/products/${p.key}`} 
                      className="group block text-center"
                      prefetch={index < 6}
                    >
                      <div className="relative">
                        {p.image_url ? (
                          <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl overflow-hidden relative">
                            <Image 
                              src={p.image_url} 
                              alt={p.name} 
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-110" 
                              sizes="(max-width: 640px) 160px, 176px"
                              loading={index < 6 ? 'eager' : 'lazy'}
                              priority={index < 3}
                            />
                          </div>
                        ) : (
                          <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl bg-gray-800 flex items-center justify-center">
                            <Gamepad2 className="h-16 w-16 text-gray-600" />
                          </div>
                        )}
                        {badgeText && (
                          <div className="absolute -bottom-2 left-2">
                            <Badge variant="destructive" className="shadow-lg gap-1">
                              <Zap className="size-3" />
                              <span className="font-semibold text-xs">{badgeText}</span>
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 text-sm font-semibold text-white">{p.name}</div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Popular Games Section */}
        <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-md">
                <Gamepad2 className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">เติมเกมออนไลน์</h2>
                <p className="text-sm text-gray-400">Termgame Online</p>
              </div>
            </div>
            <Link 
              href="/products" 
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors group"
            >
              ดูทั้งหมด
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {products.slice(0, 12).map((p: any, index: number) => {
              const manualText = p?.badge?.text?.trim?.();
              const manualPercent = typeof p?.badge?.percent === 'number' ? Math.round(Number(p.badge.percent)) : null;
              const badgeText = manualText && manualText.length
                ? manualText
                : manualPercent != null && manualPercent > 0
                  ? `${manualPercent}% OFF`
                  : null;
              return (
                <Link 
                  key={p.id} 
                  href={`/products/${p.key}`} 
                  className="group block text-center"
                  prefetch={index < 6}
                >
                  <div className="relative">
                    {p.image_url ? (
                      <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl overflow-hidden relative">
                        <Image 
                          src={p.image_url} 
                          alt={p.name} 
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110" 
                          sizes="(max-width: 640px) 160px, 176px"
                          loading={index < 6 ? 'eager' : 'lazy'}
                          priority={index < 3}
                        />
                      </div>
                    ) : (
                      <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Gamepad2 className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                    {badgeText && (
                      <div className="absolute -bottom-2 left-2">
                        <Badge variant="destructive" className="shadow-lg gap-1">
                          <Zap className="size-3" />
                          <span className="font-semibold text-xs">{badgeText}</span>
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-white">{p.name}</div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Game Accounts Section */}
        {gameAccountsByCategory && gameAccountsByCategory.length > 0 && (() => {
          // รวมไอดีเกมจากทุกหมวดหมู่
          const allAccounts = gameAccountsByCategory.flatMap((categoryData: any) => categoryData.accounts);
          if (allAccounts.length === 0) return null;
          
          return (
            <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-md">
                    <Gamepad2 className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">สินค้า Roblox</h2>
                    <p className="text-sm text-gray-400">Roblox Products</p>
                  </div>
                </div>
                <Link 
                  href="/accounts"
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors group"
                >
                  ดูทั้งหมด
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {allAccounts.slice(0, 12).map((account: any, index: number) => {
                  const discountPercent = account.discount_percent || 0;
                  return (
                    <Link 
                      key={account.id} 
                      href={`/accounts/${account.id}`} 
                      className="group block text-center"
                      prefetch={index < 6}
                    >
                      <div className="relative">
                        {account.cover_image_url ? (
                          <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl overflow-hidden relative">
                            <Image 
                              src={account.cover_image_url} 
                              alt={account.title} 
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-110" 
                              sizes="(max-width: 640px) 160px, 176px"
                              loading={index < 6 ? 'eager' : 'lazy'}
                              priority={index < 3}
                            />
                          </div>
                        ) : (
                          <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl bg-gray-800 flex items-center justify-center">
                            <Gamepad2 className="h-16 w-16 text-gray-600" />
                          </div>
                        )}
                        {discountPercent > 0 && (
                          <div className="absolute -bottom-2 left-2">
                            <Badge variant="destructive" className="shadow-lg gap-1">
                              <Zap className="size-3" />
                              <span className="font-semibold text-xs">-{discountPercent}%</span>
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="text-sm font-semibold text-white">{account.title}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {account.original_price && account.original_price > account.price ? (
                            <>
                              <span className="text-emerald-500 font-bold">{Number(account.price).toFixed(0)} ฿</span>
                              <span className="line-through ml-1 text-gray-500">{Number(account.original_price).toFixed(0)} ฿</span>
                            </>
                          ) : (
                            <span className="text-emerald-500 font-bold">{Number(account.price).toFixed(0)} ฿</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })()}

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
