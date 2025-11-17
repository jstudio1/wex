import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';
import AppPremiumProductsList from '@/components/AppPremiumProductsList';

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchAppPremiumProducts() {
  try {
    const sb = createServiceClient();
    
    // Get global markup first
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();
    
    // Fetch products with error handling and retry logic
    let products: any[] | null = null;
    let productsError: any = null;
    
    // Try up to 3 times if the first attempt fails
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await sb
        .from('app_premium_products')
        .select('id, provider_product_id, name, display_name, base_price, markup_percent, markup_fixed, stock, image_url, description, is_published')
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
      return { products: [], globalMarkup: { percent: globalPct || 0, fixed: globalFix || 0 } };
    }

    // Calculate final price for each product
    const productsWithPrice = (products || []).map((prod: any) => {
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
        description: prod.description,
      };
    });

    return {
      products: productsWithPrice,
      globalMarkup: { percent: globalPct, fixed: globalFix }
    };
  } catch (error) {
    console.error('fetchAppPremiumProducts error:', error);
    return { products: [], globalMarkup: { percent: 0, fixed: 0 } };
  }
}

export default async function PremiumAppPage() {
  const data = await fetchAppPremiumProducts();
  
  // แสดงข้อความเตือนถ้ายังไม่ได้ sync
  if (data.products.length === 0) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Starry Night Background Effect */}
        <div className="fixed inset-0 bg-black" style={{
          backgroundImage: `
            radial-gradient(2px 2px at 20% 30%, white, transparent),
            radial-gradient(2px 2px at 60% 70%, white, transparent),
            radial-gradient(1px 1px at 50% 50%, white, transparent),
            radial-gradient(1px 1px at 80% 10%, white, transparent),
            radial-gradient(2px 2px at 90% 40%, white, transparent),
            radial-gradient(1px 1px at 33% 60%, white, transparent),
            radial-gradient(2px 2px at 10% 80%, white, transparent),
            radial-gradient(1px 1px at 70% 20%, white, transparent),
            radial-gradient(2px 2px at 40% 90%, white, transparent),
            radial-gradient(1px 1px at 15% 50%, white, transparent)
          `,
          backgroundSize: '200% 200%',
          backgroundPosition: '0% 0%',
          opacity: 0.3
        }} />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="card p-12 text-center max-w-md mx-auto bg-black/50 border-purple-500/20 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">ยังไม่มีสินค้าแอพพรีเมี่ยม</h1>
            <p className="text-white/70 mb-2">
              กรุณาไปที่ Backoffice → แอพพรีเมี่ยม → กดปุ่ม "ซิงก์จากผู้ให้บริการ" เพื่อดึงข้อมูลล่าสุด
            </p>
            <p className="text-sm text-white/50">
              (Sync จะดึงข้อมูลจาก External API ลง Database)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Starry Night Background Effect */}
      <div className="fixed inset-0 bg-black" style={{
        backgroundImage: `
          radial-gradient(2px 2px at 20% 30%, white, transparent),
          radial-gradient(2px 2px at 60% 70%, white, transparent),
          radial-gradient(1px 1px at 50% 50%, white, transparent),
          radial-gradient(1px 1px at 80% 10%, white, transparent),
          radial-gradient(2px 2px at 90% 40%, white, transparent),
          radial-gradient(1px 1px at 33% 60%, white, transparent),
          radial-gradient(2px 2px at 10% 80%, white, transparent),
          radial-gradient(1px 1px at 70% 20%, white, transparent),
          radial-gradient(2px 2px at 40% 90%, white, transparent),
          radial-gradient(1px 1px at 15% 50%, white, transparent)
        `,
        backgroundSize: '200% 200%',
        backgroundPosition: '0% 0%',
        opacity: 0.3
      }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-purple-600/10 rounded-2xl"></div>
          <div className="relative bg-black/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 lg:p-8">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/30 mb-4">
                <span className="text-xs font-medium text-purple-400">แอพพรีเมี่ยม</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                แอพพรีเมี่ยม
              </h1>
              <p className="text-sm lg:text-base text-white/70">
                รายการสินค้าแอพพรีเมี่ยมที่เปิดขาย - Netflix, Disney+, Bilibili, Canva, CAPCUT และอื่นๆ
              </p>
            </div>
          </div>
        </div>

        <AppPremiumProductsList products={data.products} />
      </div>
    </div>
  );
}

