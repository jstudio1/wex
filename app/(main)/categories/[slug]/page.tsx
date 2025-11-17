import { getBaseUrl } from '@/lib/url';
import GameAccountsBrowser from '@/components/GameAccountsBrowser';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cache } from 'react';
import { CACHE_CONFIG } from '@/lib/cache';

type GameAccount = {
  id: number;
  game_name: string;
  game_category_id: number | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  additional_images: string[];
  price: number;
  stock: number;
  created_at: string;
  category: { id: number; name: string; slug: string } | null;
  original_price?: number | null;
  discount_percent?: number | null;
};

type GameCategory = {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  accountCount?: number;
  minPrice?: number;
  maxPrice?: number;
};

const fetchCategoryAndAccounts = cache(async (slug: string): Promise<{ category: GameCategory | null; accounts: GameAccount[] }> => {
  const base = getBaseUrl();
  
  // Fetch categories
  const categoriesRes = await fetch(`${base}/api/game-categories`, { next: { revalidate: 120, tags: ['game-categories'] } });
  const categories = categoriesRes.ok ? (await categoriesRes.json()).data : [];
  const category = categories.find((cat: GameCategory) => cat.slug === slug) || null;
  
  if (!category) {
    return { category: null, accounts: [] };
  }
  
  // Fetch accounts for this category
  const accountsRes = await fetch(`${base}/api/game-accounts?category_slug=${slug}`, CACHE_CONFIG.DYNAMIC);
  const accounts = accountsRes.ok ? (await accountsRes.json()).data : [];
  
  return { category, accounts };
});

export default async function CategoryDetailPage({ params }: { params: { slug: string } }) {
  const { category, accounts } = await fetchCategoryAndAccounts(params.slug);
  
  if (!category) {
    notFound();
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
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
                <Link href="/categories" className="text-white/70 hover:text-white">ซื้อไอดี</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
              <BreadcrumbPage className="text-white">{category.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

        {/* Hero Section */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-purple-600/10 rounded-2xl"></div>
          <div className="relative bg-black/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 lg:p-8">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/30 mb-4">
                <span className="text-xs font-medium text-purple-400">ซื้อไอดีเกม</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                {category.name}
              </h1>
              <p className="text-sm lg:text-base text-white/70">
                {accounts.length > 0 
                  ? `พบไอดีเกม ${accounts.length} รายการ` 
                  : 'ยังไม่มีไอดีเกมในหมวดหมู่นี้'}
              </p>
            </div>
          </div>
        </div>

      <GameAccountsBrowser 
        accounts={accounts} 
        categories={[]}
        initialCategory={params.slug}
        hideCategoryPills={true}
      />
      </div>
    </div>
  );
}

