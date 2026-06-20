import { getBaseUrl } from '@/lib/url';
import GameCategoryList from '@/components/GameCategoryList';
import type { Metadata } from 'next';

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

export const revalidate = 300;

async function fetchCategories(): Promise<GameCategory[]> {
  try {
  const base = getBaseUrl();
    const categoriesRes = await fetch(`${base}/api/game-categories`, {
      next: { revalidate: 300, tags: ['game-categories'] },
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
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <GameCategoryList categories={categories} />
      </div>
    </main>
  );
}

