'use client';

import { useMemo, useState, useCallback, memo } from 'react';
import PublicProductsSearch from '@/components/PublicProductsSearch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { SearchIcon, ListIcon, Gamepad2Icon, CreditCardIcon, ShoppingBasketIcon, Monitor, Smartphone, Package } from 'lucide-react';
import {
  Empty,
  EmptyContent,
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

function ProductsBrowser({ products, categories, initialCategory, leftNode, flashStart, flashEnd, isLoading }: { products: Product[]; categories: Category[]; initialCategory?: string; leftNode?: React.ReactNode; flashStart?: string | null; flashEnd?: string | null; isLoading?: boolean }) {
  const [selected, setSelected] = useState<string | undefined>(initialCategory);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let filteredProducts = products;
    if (selected) {
      filteredProducts = products.filter((p) => (p.categories || []).some((c) => c.slug === selected));
    }
    
    // เรียงบริการที่มี Flash Sale (badge) ให้แสดงก่อน
    const sorted = [...filteredProducts].sort((a, b) => {
      const aHasBadge = a.badge && (a.badge.text || a.badge.percent);
      const bHasBadge = b.badge && (b.badge.text || b.badge.percent);
      if (aHasBadge && !bHasBadge) return -1;
      if (!aHasBadge && bHasBadge) return 1;
      return 0;
    });
    
    return sorted;
  }, [products, selected]);

  const selectCategory = useCallback((slug: string | undefined) => {
    setHasInteracted(true);
    setSelected(slug);
  }, []);

  return (
    <div className="space-y-4">
      {/* Top bar: search + divider + categories (like reference) */}
      <div className="flex flex-wrap items-center gap-4">
        {leftNode && <div className="shrink-0">{leftNode}</div>}
        <div className="w-full max-w-md">
          <ButtonGroup className="w-full">
            <Input 
              placeholder="Search..." 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              className="rounded-none border-0 border-r border-white/10 flex-1 focus:ring-0 focus:border-r focus:border-white/10" 
            />
            <Button 
              variant="outline" 
              aria-label="Search" 
              className="rounded-none border-0 shrink-0"
              type="button"
            >
              <SearchIcon className="size-4" />
            </Button>
          </ButtonGroup>
        </div>
        <div className="hidden h-6 w-px bg-white/10 md:block" />
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <CategoryPill active={!selected} onClick={() => selectCategory(undefined)} icon={<ListIcon className="size-4" />} label="All" />
            {categories.map((cat) => (
              <CategoryPill key={cat.id} active={selected === cat.slug} onClick={() => selectCategory(cat.slug)} icon={resolveIcon(cat.slug)} label={cat.name} />
            ))}
          </div>
        )}
      </div>
      <div className={hasInteracted ? 'animate-filter' : ''}>
        {isLoading ? (
          <PublicProductsSearch products={[]} controlledQuery={query} onQueryChange={setQuery} hideSearch flashStart={flashStart} flashEnd={flashEnd} isLoading={true} />
        ) : filtered.length === 0 ? (
          <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package className="size-6" />
              </EmptyMedia>
              <EmptyTitle>ไม่พบบริการตามหมวดหมู่</EmptyTitle>
              <EmptyDescription>
                ลองเลือกหมวดหมู่อื่นหรือดูรายการทั้งหมด
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <PublicProductsSearch products={filtered} controlledQuery={query} onQueryChange={setQuery} hideSearch flashStart={flashStart} flashEnd={flashEnd} />
        )}
      </div>
    </div>
  );
}

const CategoryPill = memo(function CategoryPill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${active ? 'border-white/30 bg-white/10 text-[color:var(--text)]' : 'border-white/15 text-[color:var(--text)]/70 hover:bg-white/10'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
});

function resolveIcon(slug: string) {
  const s = slug.toLowerCase();
  
  // เกม PC
  if (s.includes('pc') || s.includes('คอม') || s.includes('computer') || s.includes('desktop')) {
    return <Monitor className="size-4" />;
  }
  
  // เกมมือถือ
  if (s.includes('มือถือ') || s.includes('mobile') || s.includes('phone') || s.includes('smartphone') || s.includes('ios') || s.includes('android')) {
    return <Smartphone className="size-4" />;
  }
  
  // เกมทั่วไป
  if (s.includes('game') || s.includes('เกม') || s.includes('เติม')) {
    return <Gamepad2Icon className="size-4" />;
  }
  
  // บัตรเติมเงิน
  if (s.includes('card') || s.includes('บัตร') || s.includes('เติมเงิน')) {
    return <CreditCardIcon className="size-4" />;
  }
  
  // อื่นๆ
  if (s.includes('shop') || s.includes('อื่น') || s.includes('อื่นๆ')) {
    return <ShoppingBasketIcon className="size-4" />;
  }
  
  return <ListIcon className="size-4" />;
}

export default memo(ProductsBrowser);

