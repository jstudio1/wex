'use client';

import { useEffect, useMemo, useState } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ChevronLeft, ChevronRight, Search, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ProductRow from '@/components/ProductRow';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type ProductCard = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  items: { id: number; name: string; sku: string; price: string; originalPrice: string; is_recommended?: boolean }[];
  ordersCount?: number;
  badge?: { text?: string | null; percent?: number | null } | null;
};

type PublicProductsSearchProps = {
  products: ProductCard[];
  controlledQuery?: string;
  onQueryChange?: (value: string) => void;
  hideSearch?: boolean;
  flashStart?: string | null;
  flashEnd?: string | null;
  isLoading?: boolean;
  basePath?: string;
  preserveOrder?: boolean;
};

export default function PublicProductsSearch({
  products,
  controlledQuery,
  onQueryChange,
  hideSearch,
  flashStart,
  flashEnd,
  isLoading,
  basePath = '/products',
  preserveOrder = false,
}: PublicProductsSearchProps) {
  const [internal, setInternal] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const query = controlledQuery !== undefined ? controlledQuery : internal;
  const itemsPerPage = 54;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matched = normalized
      ? products.filter((product) => `${product.name} ${product.key}`.toLowerCase().includes(normalized))
      : products;

    if (preserveOrder) {
      return matched;
    }

    return [...matched].sort((a, b) => {
      const aHasBadge = Boolean(a.badge && (a.badge.text || a.badge.percent));
      const bHasBadge = Boolean(b.badge && (b.badge.text || b.badge.percent));
      if (aHasBadge !== bHasBadge) return aHasBadge ? -1 : 1;
      return 0;
    });
  }, [query, products, preserveOrder]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  if (isLoading) {
    return (
      <div>
        {!hideSearch && (
          <div className="mb-4 flex justify-center">
            <InputGroup>
              <Skeleton className="h-10 w-full max-w-md" />
            </InputGroup>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 md:grid-cols-6 md:gap-8">
          {Array.from({ length: 54 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <Skeleton className="h-24 w-24 rounded-xl sm:h-40 sm:w-40 md:h-44 md:w-44 lg:h-48 lg:w-48" />
              <Skeleton className="mt-3 h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {!hideSearch && (
        <div className="mb-4 flex justify-start">
          <InputGroup className="max-w-md rounded-xl border border-gray-800 bg-[#050505] transition-colors focus-within:border-emerald-500 focus-within:shadow-[0_0_0_1px_rgba(16,185,129,0.4)]">
            <InputGroupInput
              placeholder="ค้นหาเกม..."
              value={query}
              className="border-none bg-transparent text-white placeholder:text-gray-500 focus:border-none focus:ring-0"
              onChange={(event) =>
                controlledQuery !== undefined ? onQueryChange?.(event.target.value) : setInternal(event.target.value)
              }
            />
            <InputGroupAddon className="text-emerald-400">
              <SearchIcon size={16} />
            </InputGroupAddon>
          </InputGroup>
        </div>
      )}

      <div>
        <div className="grid grid-cols-3 gap-3 sm:gap-6 md:grid-cols-6 md:gap-8">
          {(() => {
            const rows: ProductCard[][] = [];
            let currentRow: ProductCard[] = [];
            const itemsPerRow = 6;

            paginatedProducts.forEach((product, index) => {
              currentRow.push(product);
              if (currentRow.length === itemsPerRow || index === paginatedProducts.length - 1) {
                rows.push([...currentRow]);
                currentRow = [];
              }
            });

            return rows.map((row, rowIndex) => (
              <ProductRow
                key={rowIndex}
                row={row}
                rowIndex={rowIndex}
                flashStart={flashStart}
                flashEnd={flashEnd}
                basePath={basePath}
              />
            ));
          })()}
        </div>

        {filtered.length === 0 && (
          <Empty className="from-muted/50 to-background mt-8 h-full bg-gradient-to-b from-30%">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search className="size-6" />
              </EmptyMedia>
              <EmptyTitle>ไม่พบผลการค้นหา</EmptyTitle>
              <EmptyDescription>ลองค้นหาด้วยคำอื่น หรือดูรายการทั้งหมด</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      {totalPages > 1 && filtered.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/10 pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="gap-2"
          >
            <ChevronLeft className="size-4" />
            ก่อนหน้า
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="min-w-[40px]"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="gap-2"
          >
            ถัดไป
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {totalPages > 1 && filtered.length > 0 && (
        <div className="mt-2 text-center text-sm text-[color:var(--text)]/60">
          หน้า {currentPage} / {totalPages} (แสดง {paginatedProducts.length} จาก {filtered.length} รายการ)
        </div>
      )}
    </div>
  );
}
