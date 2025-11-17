'use client';

import GameCategoryCard from '@/components/GameCategoryCard';

type GameCategory = {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  accountCount?: number;
  minPrice?: number;
  maxPrice?: number;
};

type Props = {
  categories: GameCategory[];
  title?: string;
};

export default function GameCategoryList({ categories, title = 'รายการหมวดหมู่' }: Props) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-lg border-2 border-red-200">
        <p className="text-red-600 font-semibold text-lg">ยังไม่มีหมวดหมู่</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-red-600 pl-4 bg-gradient-to-r from-red-50 to-transparent py-3 rounded-r-lg">
        <h2 className="text-red-600 text-2xl font-bold mb-1">{title}</h2>
        <p className="text-gray-500 text-sm">เลือกหมวดหมู่เกมที่คุณต้องการ</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {categories.map((category) => (
          <GameCategoryCard
            key={category.id}
            id={category.id}
            name={category.name}
            slug={category.slug}
            accountCount={category.accountCount || 0}
            minPrice={category.minPrice}
            maxPrice={category.maxPrice}
            imageUrl={category.image_url}
          />
        ))}
      </div>
    </div>
  );
}

