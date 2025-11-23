import { getBaseUrl } from '@/lib/url';
import GameCategoryList from '@/components/GameCategoryList';
import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';

// Force dynamic rendering - no cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: 'หมวดหมู่เกมทั้งหมด - เติมเกม ราคาถูก รวดเร็ว',
  description: 'เลือกหมวดหมู่เกมที่ต้องการเติม รวมทุกเกมดัง ราคาถูก เติมเร็ว ปลอดภัย จาก WeXPlus เว็บเติมเกมอันดับ 1',
  keywords: ['หมวดหมู่เกม', 'เติมเกม', 'ราคาถูก', 'เติมเกมรวดเร็ว', 'สินค้าเกม', 'บริการเกม', 'WeXPlus', 'เว็บเติมเกม'],
  alternates: { canonical: '/categories' },
  openGraph: {
    title: 'หมวดหมู่เกมทั้งหมด - เติมเกม ราคาถูก รวดเร็ว',
    description: 'เลือกหมวดหมู่เกมที่ต้องการเติม รวมทุกเกมดัง ราคาถูก เติมเร็ว ปลอดภัย จาก WeXPlus เว็บเติมเกมอันดับ 1',
    url: '/categories',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'หมวดหมู่เกมทั้งหมด - เติมเกม ราคาถูก รวดเร็ว', description: 'เลือกหมวดหมู่เกมที่ต้องการเติม รวมทุกเกมดัง ราคาถูก เติมเร็ว ปลอดภัย จาก WeXPlus เว็บเติมเกมอันดับ 1' },
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

async function fetchCategories(): Promise<GameCategory[]> {
  noStore();
  try {
  const base = getBaseUrl();
    const timestamp = Date.now();
    const categoriesRes = await fetch(`${base}/api/game-categories?t=${timestamp}&_=${Math.random()}`, { 
    cache: 'no-store',
      next: { revalidate: 0 },
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
  });
    
    if (!categoriesRes.ok) {
      return [];
    }
    
    const json = await categoriesRes.json();
    
    if (!json.ok) {
      return [];
    }
    
    return json.data || [];
  } catch (err) {
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await fetchCategories();
  
  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <GameCategoryList categories={categories} />
    </main>
  );
}

