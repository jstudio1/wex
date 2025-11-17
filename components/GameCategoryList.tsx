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
      <div className="text-center py-12 text-[color:var(--text)]/60">
        ยังไม่มีหมวดหมู่
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-accent text-xl font-semibold mb-1">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

