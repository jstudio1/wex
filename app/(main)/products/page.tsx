import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { cache } from 'react';
import type { Metadata } from 'next';
import { ArrowRight, Clock3, Flame, Gamepad2, Grid2x2, ShieldCheck } from 'lucide-react';
import { getBaseUrl } from '@/lib/url';

const ProductsBrowser = dynamicImport(() => import('@/components/ProductsBrowser'), {
  loading: () => (
    <div className="space-y-4">
      <div className="h-52 w-full rounded-2xl bg-gray-900/60 animate-pulse" />
      <div className="h-16 w-full rounded-2xl bg-gray-900/60 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-40 w-full rounded-2xl bg-gray-900/60 animate-pulse" />
        ))}
      </div>
    </div>
  ),
  ssr: true,
});

type ProductCard = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  items: { id: number; name: string; sku: string; price: string; originalPrice: string }[];
  ordersCount?: number;
  categories?: { slug: string; name: string }[];
  badge?: { text?: string | null; percent?: number | null } | null;
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

const fetchProducts = cache(async (): Promise<ProductCard[]> => {
  const base = getBaseUrl();
  const response = await fetch(`${base}/api/products`, {
    next: { revalidate: 60, tags: ['products'] },
  });
  return response.ok ? (await response.json()).data : [];
});

const fetchSite = cache(async () => {
  const base = getBaseUrl();
  const response = await fetch(`${base}/api/site`, {
    next: { revalidate: 300, tags: ['site'] },
  });
  return response.ok ? response.json() : { flashStart: null, flashEnd: null };
});

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'รวมบริการเติมเกมทั้งหมด | WeXPlus',
  description: 'เลือกเติมเกมออนไลน์ได้ครบในหน้าเดียว ค้นหาไว กรองหมวดง่าย และปลอดภัยทุกออเดอร์',
  alternates: { canonical: '/products' },
  openGraph: {
    title: 'รวมบริการเติมเกมทั้งหมด | WeXPlus',
    description: 'เลือกเติมเกมออนไลน์ได้ครบในหน้าเดียว ค้นหาไว กรองหมวดง่าย และปลอดภัยทุกออเดอร์',
    url: '/products',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'รวมบริการเติมเกมทั้งหมด | WeXPlus',
    description: 'เลือกเติมเกมออนไลน์ได้ครบในหน้าเดียว ค้นหาไว กรองหมวดง่าย และปลอดภัยทุกออเดอร์',
  },
};

function extractCategories(products: ProductCard[]): Category[] {
  const seen = new Map<string, Category>();

  for (const product of products) {
    for (const category of product.categories || []) {
      if (!category.slug || seen.has(category.slug)) {
        continue;
      }
      seen.set(category.slug, {
        id: seen.size + 1,
        slug: category.slug,
        name: category.name || category.slug,
      });
    }
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'th'));
}

export default async function ProductsPage() {
  const [products, site] = await Promise.all([fetchProducts(), fetchSite()]);

  const productsWithItems = products.filter((product) => (product.items || []).length > 0);
  const categories = extractCategories(productsWithItems);
  const flashSaleCount = productsWithItems.filter((product) => product.badge && (product.badge.text || product.badge.percent)).length;
  const totalPackages = productsWithItems.reduce((sum, product) => sum + (product.items || []).length, 0);

  const stats = [
    {
      icon: Gamepad2,
      label: 'บริการที่พร้อมขาย',
      value: productsWithItems.length.toLocaleString('th-TH'),
      tone: 'from-emerald-500/30 to-emerald-500/5',
    },
    {
      icon: Grid2x2,
      label: 'จำนวนแพ็กเกจทั้งหมด',
      value: totalPackages.toLocaleString('th-TH'),
      tone: 'from-sky-500/30 to-sky-500/5',
    },
    {
      icon: Flame,
      label: 'บริการที่มีโปรโมชัน',
      value: flashSaleCount.toLocaleString('th-TH'),
      tone: 'from-orange-500/30 to-orange-500/5',
    },
  ] as const;

  return (
    <div className="relative overflow-hidden">
      <section className="relative isolate border-b border-emerald-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.18),transparent_45%),linear-gradient(180deg,rgba(7,10,16,0.95)_0%,rgba(0,0,0,0.95)_100%)]" />
        <div className="absolute -right-16 top-6 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-gray-200 transition hover:bg-white/10"
              >
                <Clock3 className="h-3.5 w-3.5 text-emerald-300" />
                หน้าแรก / บริการเติมเกม
              </Link>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <Flame className="h-3.5 w-3.5" />
                UX ใหม่ ค้นหาไวขึ้น
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                เลือกเติมเกมได้ไว
                <span className="block text-emerald-300">ในหน้าเดียวครบทุกหมวด</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-gray-300 sm:text-base">
                รวมบริการเติมเกมทั้งหมดของ WeXPlus พร้อมตัวกรองหมวดและค้นหาทันที ให้ลูกค้าเลือกสินค้าได้ง่ายขึ้นทั้งบนมือถือและเดสก์ท็อป
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#products-catalog"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
                >
                  เริ่มเลือกสินค้า
                  <ArrowRight className="h-4 w-4" />
                </a>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  ปลอดภัยทุกออเดอร์
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`rounded-2xl border border-white/10 bg-gradient-to-br ${stat.tone} p-4 backdrop-blur-md`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-300">{stat.label}</p>
                        <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/30 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <main id="products-catalog" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ProductsBrowser
          products={productsWithItems}
          categories={categories}
          flashStart={site.flashStart}
          flashEnd={site.flashEnd}
        />
      </main>
    </div>
  );
}
