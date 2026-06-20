'use client';

import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import PublicProductsSearch from '@/components/PublicProductsSearch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ArrowUpDown,
  CreditCardIcon,
  Flame,
  Gamepad2Icon,
  ListFilter,
  ListIcon,
  Monitor,
  Package,
  RotateCcw,
  ShoppingBasketIcon,
  Smartphone,
  X,
} from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type Category = { id: number; name: string; slug: string };
type Product = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  items: { id: number; name: string; sku: string; price: string; originalPrice: string }[];
  ordersCount?: number;
  categories?: { slug: string; name: string }[];
  badge?: { text?: string | null; percent?: number | null } | null;
};

type SortMode = 'featured' | 'popular' | 'name';

type ProductsBrowserProps = {
  products: Product[];
  categories: Category[];
  initialCategory?: string;
  leftNode?: ReactNode;
  flashStart?: string | null;
  flashEnd?: string | null;
  isLoading?: boolean;
};

function ProductsBrowser({
  products,
  categories,
  initialCategory,
  leftNode,
  flashStart,
  flashEnd,
  isLoading,
}: ProductsBrowserProps) {
  const [selected, setSelected] = useState<string | undefined>(initialCategory);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('featured');
  const [hasInteracted, setHasInteracted] = useState(false);

  const categoriesFromProducts = useMemo(() => {
    if (categories.length > 0) return categories;
    const map = new Map<string, Category>();
    for (const product of products) {
      for (const category of product.categories || []) {
        if (!category.slug || map.has(category.slug)) continue;
        map.set(category.slug, {
          id: map.size + 1,
          slug: category.slug,
          name: category.name || category.slug,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [categories, products]);

  const categoryCount = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const product of products) {
      const slugs = new Set((product.categories || []).map((category) => category.slug).filter(Boolean));
      for (const slug of slugs) {
        countMap.set(slug, (countMap.get(slug) || 0) + 1);
      }
    }
    return countMap;
  }, [products]);

  const categoryFiltered = useMemo(() => {
    if (!selected) return products;
    return products.filter((product) => (product.categories || []).some((category) => category.slug === selected));
  }, [products, selected]);

  const sorted = useMemo(() => {
    const list = [...categoryFiltered];

    if (sortMode === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
      return list;
    }

    if (sortMode === 'popular') {
      list.sort((a, b) => {
        const byOrders = (b.ordersCount || 0) - (a.ordersCount || 0);
        if (byOrders !== 0) return byOrders;
        return a.name.localeCompare(b.name, 'th');
      });
      return list;
    }

    list.sort((a, b) => {
      const aHasBadge = Boolean(a.badge && (a.badge.text || a.badge.percent));
      const bHasBadge = Boolean(b.badge && (b.badge.text || b.badge.percent));
      if (aHasBadge !== bHasBadge) return aHasBadge ? -1 : 1;

      const byOrders = (b.ordersCount || 0) - (a.ordersCount || 0);
      if (byOrders !== 0) return byOrders;
      return a.name.localeCompare(b.name, 'th');
    });

    return list;
  }, [categoryFiltered, sortMode]);

  const queryMatchedCount = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sorted.length;
    return sorted.filter((product) => `${product.name} ${product.key}`.toLowerCase().includes(normalized)).length;
  }, [query, sorted]);

  const selectedCategoryName = useMemo(() => {
    if (!selected) return null;
    return categoriesFromProducts.find((category) => category.slug === selected)?.name || selected;
  }, [categoriesFromProducts, selected]);

  const hasActiveFilters = Boolean(selected || query.trim() || sortMode !== 'featured');

  const selectCategory = useCallback((slug: string | undefined) => {
    setHasInteracted(true);
    setSelected(slug);
  }, []);

  const clearCategory = useCallback(() => {
    setHasInteracted(true);
    setSelected(undefined);
  }, []);

  const clearQuery = useCallback(() => {
    setHasInteracted(true);
    setQuery('');
  }, []);

  const clearAll = useCallback(() => {
    setHasInteracted(true);
    setSelected(undefined);
    setQuery('');
    setSortMode('featured');
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Search</p>
            <div className="relative mt-2">
              <Input
                placeholder="ค้นหาเกม, รหัสสินค้า หรือชื่อบริการ..."
                value={query}
                onChange={(event) => {
                  setHasInteracted(true);
                  setQuery(event.target.value);
                }}
                className="h-11 rounded-xl border border-white/15 bg-black/40 pl-4 pr-10 text-white placeholder:text-gray-500 focus:border-emerald-400/70 focus:ring-emerald-500/30"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearQuery}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="clear query"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Sort</p>
            <div className="flex flex-wrap gap-2">
              <SortPill
                active={sortMode === 'featured'}
                icon={<Flame className="h-4 w-4" />}
                label="แนะนำ"
                onClick={() => {
                  setHasInteracted(true);
                  setSortMode('featured');
                }}
              />
              <SortPill
                active={sortMode === 'popular'}
                icon={<Flame className="h-4 w-4" />}
                label="ยอดนิยม"
                onClick={() => {
                  setHasInteracted(true);
                  setSortMode('popular');
                }}
              />
              <SortPill
                active={sortMode === 'name'}
                icon={<ArrowUpDown className="h-4 w-4" />}
                label="ชื่อ A-Z"
                onClick={() => {
                  setHasInteracted(true);
                  setSortMode('name');
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm text-gray-200">
              <ListFilter className="h-4 w-4 text-emerald-300" />
              หมวดหมู่
            </div>
            {selected && (
              <button
                type="button"
                onClick={clearCategory}
                className="text-xs font-semibold text-gray-300 transition hover:text-white"
              >
                ล้างหมวดหมู่
              </button>
            )}
          </div>

          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            <CategoryPill
              active={!selected}
              onClick={() => selectCategory(undefined)}
              icon={<ListIcon className="h-4 w-4" />}
              label={`ทั้งหมด (${products.length})`}
            />
            {categoriesFromProducts.map((category) => (
              <CategoryPill
                key={category.id}
                active={selected === category.slug}
                onClick={() => selectCategory(category.slug)}
                icon={resolveIcon(category.slug)}
                label={`${category.name} (${categoryCount.get(category.slug) || 0})`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
          <p className="text-sm text-gray-200">
            พบสินค้า <span className="font-semibold text-white">{queryMatchedCount.toLocaleString('th-TH')}</span> รายการ
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCategoryName && (
              <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                หมวด {selectedCategoryName}
              </span>
            )}
            {query.trim() && (
              <span className="inline-flex items-center rounded-full border border-sky-400/35 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-200">
                ค้นหา: {query.trim()}
              </span>
            )}
            {leftNode}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 gap-1 rounded-full border border-white/15 bg-white/5 px-3 text-xs text-gray-100 hover:bg-white/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                รีเซ็ต
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className={hasInteracted ? 'animate-filter' : ''}>
        {isLoading ? (
          <PublicProductsSearch
            products={[]}
            controlledQuery={query}
            onQueryChange={setQuery}
            hideSearch
            flashStart={flashStart}
            flashEnd={flashEnd}
            isLoading
            preserveOrder
          />
        ) : sorted.length === 0 ? (
          <Empty className="rounded-2xl border border-white/10 bg-black/35 py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package className="h-12 w-12 text-gray-400" />
              </EmptyMedia>
              <EmptyTitle className="text-white">ยังไม่พบบริการในหมวดนี้</EmptyTitle>
              <EmptyDescription className="text-gray-400">
                ลองเปลี่ยนหมวดหมู่ หรือกดรีเซ็ตตัวกรองเพื่อดูรายการทั้งหมด
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <PublicProductsSearch
            products={sorted}
            controlledQuery={query}
            onQueryChange={setQuery}
            hideSearch
            flashStart={flashStart}
            flashEnd={flashEnd}
            preserveOrder
          />
        )}
      </section>
    </div>
  );
}

const CategoryPill = memo(function CategoryPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]'
          : 'border-white/15 bg-white/5 text-gray-200 hover:border-white/25 hover:bg-white/10'
      }`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
});

const SortPill = memo(function SortPill({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
          : 'border-white/15 bg-white/5 text-gray-200 hover:border-white/25 hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  );
});

function resolveIcon(slug: string) {
  const normalized = slug.toLowerCase();

  if (normalized.includes('pc') || normalized.includes('คอม') || normalized.includes('computer') || normalized.includes('desktop')) {
    return <Monitor className="size-4" />;
  }

  if (
    normalized.includes('มือถือ') ||
    normalized.includes('mobile') ||
    normalized.includes('phone') ||
    normalized.includes('smartphone') ||
    normalized.includes('ios') ||
    normalized.includes('android')
  ) {
    return <Smartphone className="size-4" />;
  }

  if (normalized.includes('game') || normalized.includes('เกม') || normalized.includes('เติม')) {
    return <Gamepad2Icon className="size-4" />;
  }

  if (normalized.includes('card') || normalized.includes('บัตร') || normalized.includes('เติมเงิน')) {
    return <CreditCardIcon className="size-4" />;
  }

  if (normalized.includes('shop') || normalized.includes('อื่น') || normalized.includes('อื่นๆ')) {
    return <ShoppingBasketIcon className="size-4" />;
  }

  return <ListIcon className="size-4" />;
}

export default memo(ProductsBrowser);
