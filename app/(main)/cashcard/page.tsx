import { getBaseUrl } from '@/lib/url';
import CashcardProductsLayout from '@/components/CashcardProductsLayout';
import ProductsHeroBanner from '@/components/ProductsHeroBanner';
import { cache } from 'react';
import type { Metadata } from 'next';
import { CreditCard } from 'lucide-react';

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
  const p = await fetch(`${base}/api/cashcard/wepay`, { cache: 'no-store' });
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
  title: 'บัตรเติมเงิน - ราคาถูก ซื้อเร็ว ปลอดภัย',
  description: 'บัตรเติมเงินเกมออนไลน์ทุกเกม ราคาถูกที่สุด ซื้อไว ปลอดภัย 100% จาก WeXPlus',
  alternates: { canonical: '/cashcard' },
  openGraph: {
    title: 'บัตรเติมเงิน - ราคาถูก ซื้อเร็ว ปลอดภัย',
    description: 'บัตรเติมเงินเกมออนไลน์ทุกเกม ราคาถูกที่สุด ซื้อไว ปลอดภัย 100% จาก WeXPlus',
    url: '/cashcard',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'บัตรเติมเงิน - ราคาถูก ซื้อเร็ว ปลอดภัย', description: 'บัตรเติมเงินเกมออนไลน์ทุกเกม ราคาถูกที่สุด ซื้อไว ปลอดภัย 100% จาก WeXPlus' },
};

export default async function CashcardPage() {
  const products = await fetchProducts();
  const site = await fetchSite();
  return (
    <>
      {/* Hero Banner */}
      <ProductsHeroBanner
        title="บัตรเติมเงิน"
        subtitle="บริการซื้อบัตรเติมเงินเกมออนไลน์ รวดเร็ว ปลอดภัย ราคาถูก"
        iconName="creditcard"
        gradientFrom="from-emerald-950"
        gradientVia="via-emerald-900"
        gradientTo="to-emerald-950"
        primaryButtonText="บัตรเติมเงิน"
        primaryButtonHref="/cashcard"
        primaryButtonIconName="creditcard"
      />

      {/* Main Content */}
      <main className="bg-black py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
        <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 shadow-md">
                <CreditCard className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">บัตรเติมเงิน</h1>
                <p className="text-sm text-gray-400">Cash Card</p>
              </div>
        </div>
          </div>
          
          {/* Products Layout */}
          <CashcardProductsLayout products={products} />
      </div>
      </main>
    </>
  );
}

