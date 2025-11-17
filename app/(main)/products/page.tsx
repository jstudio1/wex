import { getBaseUrl } from '@/lib/url';
import ProductsBrowser from '@/components/ProductsBrowser';
import { cache } from 'react';
import { CACHE_CONFIG } from '@/lib/cache';
import type { Metadata } from 'next';

type ProductCard = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  items: { id: number; name: string; sku: string; price: string; originalPrice: string }[];
  badge?: { text?: string | null; percent?: number | null } | null;
};

const fetchProducts = cache(async (category?: string): Promise<{ products: ProductCard[], categories: { id: number; name: string; slug: string }[] }> => {
  const base = getBaseUrl();
  const p = await fetch(`${base}/api/products${category ? `?category=${category}` : ''}`, { next: { revalidate: 120, tags: ['products'] } });
  const c = await fetch(`${base}/api/categories`, { next: { revalidate: 120, tags: ['categories'] } });
  const products = p.ok ? (await p.json()).data : [];
  const categories = c.ok ? (await c.json()).data : [];
  return { products, categories };
});

const fetchSite = cache(async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/site`, { next: { revalidate: 120, tags: ['site'] } });
  return res.ok ? res.json() : { flashStart: null, flashEnd: null };
});

export const metadata: Metadata = {
  title: 'รายการบริการเติมเกมทั้งหมด - ราคาถูก เติมเร็ว ปลอดภัย',
  description: 'รวมบริการเติมเกมทุกเกมดัง ราคาถูกที่สุด เติมไว ปลอดภัย 100% จาก wexplus เว็บเติมเกมอันดับ 1',
  alternates: { canonical: '/products' },
  openGraph: {
    title: 'รายการบริการเติมเกมทั้งหมด - ราคาถูก เติมเร็ว ปลอดภัย',
    description: 'รวมบริการเติมเกมทุกเกมดัง ราคาถูกที่สุด เติมไว ปลอดภัย 100% จาก wexplus เว็บเติมเกมอันดับ 1',
    url: '/products',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'รายการบริการเติมเกมทั้งหมด - ราคาถูก เติมเร็ว ปลอดภัย', description: 'รวมบริการเติมเกมทุกเกมดัง ราคาถูกที่สุด เติมไว ปลอดภัย 100% จาก wexplus เว็บเติมเกมอันดับ 1' },
};

export default async function ProductsPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const category = typeof searchParams?.category === 'string' ? searchParams?.category : undefined;
  const { products, categories } = await fetchProducts(category);
  const site = await fetchSite();
  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-3">
      <h1 className="text-xl font-semibold">รายการบริการ</h1>
      <ProductsBrowser products={products} categories={categories} initialCategory={category} flashStart={site.flashStart} flashEnd={site.flashEnd} />
    </main>
  );
}


