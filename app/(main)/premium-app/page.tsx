import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';
import { normalizePremiumAppDisplayMode } from '@/lib/premium-app';
import type { PremiumAppDisplayMode } from '@/lib/premium-app';
import AppPremiumProductsList from '@/components/AppPremiumProductsList';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Package } from 'lucide-react';

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PremiumAppProductRecord = {
  id: number;
  provider_product_id: number;
  name: string;
  display_name: string | null;
  base_price: number | null;
  markup_percent: number | null;
  markup_fixed: number | null;
  stock: number | null;
  image_url: string | null;
  icon_url: string | null;
  description: string | null;
  app_category: string | null;
  sub_category: string | null;
};

type PremiumAppProduct = {
  id: number;
  provider_product_id: number;
  name: string;
  display_name: string;
  price: number;
  base_price: number;
  stock: number;
  image_url: string | null;
  icon_url: string | null;
  description: string | null;
  app_category: string | null;
  sub_category: string | null;
};

type PremiumAppData = {
  products: PremiumAppProduct[];
  globalMarkup: { percent: number; fixed: number };
  displayMode: PremiumAppDisplayMode;
};

async function fetchAppPremiumProducts(): Promise<PremiumAppData> {
  noStore();
  try {
    const sb = createServiceClient();
    
    // Get global markup first
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();
    
    // Fetch products with error handling and retry logic
    let products: PremiumAppProductRecord[] | null = null;
    let productsError: any = null;
    
    // Try up to 3 times if the first attempt fails
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await sb
        .from('app_premium_products')
        .select('id, provider_product_id, name, display_name, base_price, markup_percent, markup_fixed, stock, image_url, icon_url, description, is_published, app_category, sub_category')
        .eq('is_published', true)
        .order('name');
      
      if (result.error) {
        productsError = result.error;
        console.error(`Error fetching app premium products (attempt ${attempt}/3):`, result.error);
        
        // Wait before retry (exponential backoff)
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          continue;
        }
        break;
      } else {
        products = result.data;
        productsError = null;
        break;
      }
    }

    if (productsError || !products) {
      console.error('Failed to fetch app premium products after retries:', productsError);
      return { products: [], globalMarkup: { percent: globalPct || 0, fixed: globalFix || 0 }, displayMode: 'list' };
    }

    // Calculate final price for each product
    const productsWithPrice: PremiumAppProduct[] = (products || []).map((prod: PremiumAppProductRecord) => {
      const finalPrice = computePrice(
        Number(prod.base_price || 0),
        Number(prod.markup_percent || 0),
        Number(prod.markup_fixed || 0),
        globalPct,
        globalFix
      );
      return {
        id: prod.id,
        provider_product_id: prod.provider_product_id,
        name: prod.name,
        display_name: prod.display_name || prod.name,
        price: finalPrice,
        base_price: Number(prod.base_price || 0),
        stock: prod.stock || 0,
        image_url: prod.image_url,
        icon_url: prod.icon_url,
        description: prod.description,
        app_category: prod.app_category || null,
        sub_category: prod.sub_category || null,
      };
    });

    const { data: displaySetting } = await sb
      .from('settings')
      .select('value')
      .eq('key', 'PREMIUM_APP_DISPLAY_MODE')
      .maybeSingle();

    const displayMode = normalizePremiumAppDisplayMode(displaySetting?.value);

    return {
      products: productsWithPrice,
      globalMarkup: { percent: globalPct, fixed: globalFix },
      displayMode,
    };
  } catch (error) {
    console.error('fetchAppPremiumProducts error:', error);
    return { products: [], globalMarkup: { percent: 0, fixed: 0 }, displayMode: 'list' };
  }
}

export default async function PremiumAppPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  noStore();
  const categoryParam = searchParams?.category;

  if (categoryParam) {
    try {
      const sb = createServiceClient();
      const { data: category, error } = await sb
        .from('app_premium_categories')
        .select('id')
        .eq('category', categoryParam)
        .eq('is_published', true)
        .maybeSingle();

      if (error || !category) {
        redirect('/premium-app');
      }
    } catch (error) {
      console.error('validate premium app category error:', error);
      redirect('/premium-app');
    }
  }

  const data = await fetchAppPremiumProducts();
  
  // แสดง empty state ถ้ายังไม่มีสินค้า
  if (data.products.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <div className="relative mb-8">
          <div className="relative bg-[#0a0a0a] border border-emerald-800 rounded-2xl p-6 lg:p-8 shadow-sm">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/20 border border-emerald-800 mb-4">
                <span className="text-xs font-medium text-emerald-600">แอพพรีเมี่ยม</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
                แอพพรีเมี่ยม
              </h1>
              <p className="text-sm lg:text-base text-gray-300">
                รายการสินค้าแอพพรีเมี่ยมที่เปิดขาย - Netflix, Disney+, Bilibili, Canva, CAPCUT และอื่นๆ
              </p>
            </div>
          </div>
        </div>

        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package className="size-8 text-gray-400" />
            </EmptyMedia>
            <EmptyTitle className="text-white">ยังไม่มีบริการ</EmptyTitle>
            <EmptyDescription className="text-gray-400">
              บริการจะแสดงที่นี่เมื่อมีการเพิ่มบริการใหม่
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      {/* Hero Section */}
      <div className="relative mb-8">
        <div className="relative bg-[#0a0a0a] border border-emerald-800 rounded-2xl p-6 lg:p-8 shadow-sm">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/20 border border-emerald-800 mb-4">
              <span className="text-xs font-medium text-emerald-600">แอพพรีเมี่ยม</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              แอพพรีเมี่ยม
            </h1>
            <p className="text-sm lg:text-base text-gray-300">
              รายการสินค้าแอพพรีเมี่ยมที่เปิดขาย - Netflix, Disney+, Bilibili, Canva, CAPCUT และอื่นๆ
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="text-center py-8 text-white">กำลังโหลด...</div>}>
        <AppPremiumProductsList products={data.products} displayMode={data.displayMode} />
      </Suspense>
    </main>
  );
}

