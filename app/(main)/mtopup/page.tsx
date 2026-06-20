import dynamicImport from 'next/dynamic';
import { getBaseUrl } from '@/lib/url';

const MtopupProductsLayout = dynamicImport(() => import('@/components/MtopupProductsLayout'), {
  loading: () => (
    <div className="space-y-4">
      <div className="h-12 w-full bg-gray-900/50 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 w-full bg-gray-900/50 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  ),
  ssr: true,
});

const ProductsHeroBanner = dynamicImport(() => import('@/components/ProductsHeroBanner'), {
  loading: () => <div className="h-64 w-full bg-gray-900/50 rounded-2xl animate-pulse" />,
  ssr: true,
});
import { cache } from 'react';
import type { Metadata } from 'next';
import { Smartphone, Phone } from 'lucide-react';

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
  const p = await fetch(`${base}/api/mtopup`, {
    next: { revalidate: 60, tags: ['mtopup-products'] },
  });
  const products = p.ok ? (await p.json()).data : [];
  return products;
});

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'เติมเงินมือถือ - ราคาถูก เติมเร็ว ปลอดภัย',
  description: 'เติมเงินมือถือทุกเครือข่าย ราคาถูกที่สุด เติมไว ปลอดภัย 100% จาก WeXPlus',
  alternates: { canonical: '/mtopup' },
  openGraph: {
    title: 'เติมเงินมือถือ - ราคาถูก เติมเร็ว ปลอดภัย',
    description: 'เติมเงินมือถือทุกเครือข่าย ราคาถูกที่สุด เติมไว ปลอดภัย 100% จาก WeXPlus',
    url: '/mtopup',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'เติมเงินมือถือ - ราคาถูก เติมเร็ว ปลอดภัย', description: 'เติมเงินมือถือทุกเครือข่าย ราคาถูกที่สุด เติมไว ปลอดภัย 100% จาก WeXPlus' },
};

export default async function MtopupPage() {
  const products = await fetchProducts();
  return (
    <>
      {/* Hero Banner */}
      <ProductsHeroBanner
        title="เติมเงินมือถือ"
        subtitle="บริการเติมเงินมือถือทุกเครือข่าย รวดเร็ว ปลอดภัย ราคาถูก"
        iconName="phone"
        gradientFrom="from-emerald-950"
        gradientVia="via-emerald-900"
        gradientTo="to-emerald-950"
        primaryButtonText="เติมเงินมือถือ"
        primaryButtonHref="/mtopup"
        primaryButtonIconName="phone"
      />
      
      {/* Main Content */}
      <main className="bg-black py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-md">
                <Smartphone className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">เติมเงินมือถือ</h1>
                <p className="text-sm text-gray-400">Mobile Topup</p>
              </div>
            </div>
          </div>
          
          {/* Products Layout */}
          <MtopupProductsLayout products={products} />
        </div>
      </main>
    </>
  );
}

