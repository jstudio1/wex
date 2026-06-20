import { getBaseUrl } from '@/lib/url';
import GameAccountsBrowser from '@/components/GameAccountsBrowser';
import { cache } from 'react';

export const dynamic = 'force-dynamic';

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
};

type GameCategory = {
  id: number;
  name: string;
  slug: string;
};

const fetchGameAccounts = cache(async (categorySlug?: string): Promise<{ accounts: GameAccount[]; categories: GameCategory[] }> => {
  const base = getBaseUrl();
  const url = categorySlug 
    ? `${base}/api/game-accounts?category_slug=${categorySlug}`
    : `${base}/api/game-accounts`;
  const [accountsRes, categoriesRes] = await Promise.all([
    fetch(url, { next: { revalidate: 120, tags: ['game-accounts'] } }),
    fetch(`${base}/api/game-categories`, { next: { revalidate: 120, tags: ['game-categories'] } }),
  ]);
  
  const accounts = accountsRes.ok ? (await accountsRes.json()).data : [];
  const categories = categoriesRes.ok ? (await categoriesRes.json()).data : [];
  return { accounts, categories };
});

export default async function AccountsPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const categorySlug = typeof searchParams?.category === 'string' ? searchParams?.category : undefined;
  const { accounts, categories } = await fetchGameAccounts(categorySlug);
  
  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <h1 className="text-xl font-semibold">ซื้อไอดีเกม</h1>
      <GameAccountsBrowser 
        accounts={accounts} 
        categories={categories} 
        initialCategory={categorySlug}
      />
    </main>
  );
}

