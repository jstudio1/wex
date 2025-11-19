import { getBaseUrl } from '@/lib/url';
import PublicProductsSearch from '@/components/PublicProductsSearch';
import ProductsHeroBanner from '@/components/ProductsHeroBanner';
import ProductsBreadcrumb from '@/components/ProductsBreadcrumb';
import { cache } from 'react';
import type { Metadata } from 'next';
import { Gamepad2 } from 'lucide-react';

type ProductCard = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  items: { id: number; name: string; sku: string; price: string; originalPrice: string }[];
  badge?: { text?: string | null; percent?: number | null } | null;
};

const fetchProducts = cache(async (): Promise<ProductCard[]> => {
  const base = getBaseUrl();
  const p = await fetch(`${base}/api/products`, { cache: 'no-store' });
  const products = p.ok ? (await p.json()).data : [];
  return products;
});

const fetchSite = cache(async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/site`, { cache: 'no-store' });
  return res.ok ? res.json() : { flashStart: null, flashEnd: null };
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'รายการบริการเติมเกมทั้งหมด - ราคาถูก เติมเร็ว ปลอดภัย',
  description: 'รวมบริการเติมเกมทุกเกมดัง ราคาถูกที่สุด เติมไว ปลอดภัย 100% จาก WeXPlus เว็บเติมเกมอันดับ 1',
  alternates: { canonical: '/products' },
  openGraph: {
    title: 'รายการบริการเติมเกมทั้งหมด - ราคาถูก เติมเร็ว ปลอดภัย',
    description: 'รวมบริการเติมเกมทุกเกมดัง ราคาถูกที่สุด เติมไว ปลอดภัย 100% จาก WeXPlus เว็บเติมเกมอันดับ 1',
    url: '/products',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'รายการบริการเติมเกมทั้งหมด - ราคาถูก เติมเร็ว ปลอดภัย', description: 'รวมบริการเติมเกมทุกเกมดัง ราคาถูกที่สุด เติมไว ปลอดภัย 100% จาก WeXPlus เว็บเติมเกมอันดับ 1' },
};

export default async function ProductsPage() {
  const products = await fetchProducts();
  const site = await fetchSite();
  return (
    <>
      {/* Hero Banner */}
      <ProductsHeroBanner />
      
      {/* Main Content */}
      <main className="bg-black py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-md">
                <Gamepad2 className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">เติมเกมออนไลน์</h1>
                <p className="text-sm text-gray-400">Termgame Online</p>
              </div>
            </div>
          </div>
          
          {/* Products Grid */}
          <PublicProductsSearch 
            products={products} 
            flashStart={site.flashStart} 
            flashEnd={site.flashEnd} 
          />
        </div>
      </main>
    </>
  );
}


