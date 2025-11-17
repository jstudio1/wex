import { getBaseUrl } from '@/lib/url';
import GameCategoryList from '@/components/GameCategoryList';
import { cache } from 'react';
import { CACHE_CONFIG } from '@/lib/cache';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'หมวดหมู่เกมทั้งหมด - เติมเกม ราคาถูก รวดเร็ว',
  description: 'เลือกหมวดหมู่เกมที่ต้องการเติม รวมทุกเกมดัง ราคาถูก เติมเร็ว ปลอดภัย จาก wexplus เว็บเติมเกมอันดับ 1',
  keywords: ['หมวดหมู่เกม', 'เติมเกม', 'ราคาถูก', 'เติมเกมรวดเร็ว', 'สินค้าเกม', 'บริการเกม', 'wexplus', 'เว็บเติมเกม'],
  alternates: { canonical: '/categories' },
  openGraph: {
    title: 'หมวดหมู่เกมทั้งหมด - เติมเกม ราคาถูก รวดเร็ว',
    description: 'เลือกหมวดหมู่เกมที่ต้องการเติม รวมทุกเกมดัง ราคาถูก เติมเร็ว ปลอดภัย จาก wexplus เว็บเติมเกมอันดับ 1',
    url: '/categories',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'หมวดหมู่เกมทั้งหมด - เติมเกม ราคาถูก รวดเร็ว', description: 'เลือกหมวดหมู่เกมที่ต้องการเติม รวมทุกเกมดัง ราคาถูก เติมเร็ว ปลอดภัย จาก wexplus เว็บเติมเกมอันดับ 1' },
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

const fetchCategories = cache(async (): Promise<GameCategory[]> => {
  const base = getBaseUrl();
  const categoriesRes = await fetch(`${base}/api/game-categories`, { next: { revalidate: 120, tags: ['game-categories'] } });
  const categories = categoriesRes.ok ? (await categoriesRes.json()).data : [];
  return categories;
});

export default async function CategoriesPage() {
  const categories = await fetchCategories();
  
  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <GameCategoryList categories={categories} />
    </main>
  );
}

