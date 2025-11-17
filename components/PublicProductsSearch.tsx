'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SearchIcon, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AnimatedProductCard from '@/components/AnimatedProductCard';
import ProductRow from '@/components/ProductRow';
import {
  Empty,
  EmptyContent,
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

export default function PublicProductsSearch({ products, controlledQuery, onQueryChange, hideSearch, flashStart, flashEnd, isLoading }: { products: ProductCard[]; controlledQuery?: string; onQueryChange?: (v: string) => void; hideSearch?: boolean; flashStart?: string | null; flashEnd?: string | null; isLoading?: boolean }) {
  const [internal, setInternal] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const q = controlledQuery !== undefined ? controlledQuery : internal;
  // ใช้ 54 (9 rows × 6 columns) แทน 50 เพื่อให้แสดงเต็มหน้าบน desktop (md:grid-cols-6)
  const itemsPerPage = 54;

  const filtered = useMemo(() => {
    let result = products;
    const query = q.trim().toLowerCase();
    if (query) {
      result = products.filter((p) =>
        `${p.name} ${p.key}`.toLowerCase().includes(query)
      );
    }
    
    // เรียงบริการที่มี Flash Sale (badge) ให้แสดงก่อน
    return [...result].sort((a, b) => {
      const aHasBadge = a.badge && (a.badge.text || a.badge.percent);
      const bHasBadge = b.badge && (b.badge.text || b.badge.percent);
      if (aHasBadge && !bHasBadge) return -1;
      if (!aHasBadge && bHasBadge) return 1;
      return 0;
    });
  }, [q, products]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const renderProductCard = (p: ProductCard, isHighlight: boolean = false, index: number = 0) => {
    return (
      <AnimatedProductCard 
        key={p.id}
        product={p} 
        isHighlight={isHighlight} 
        index={index}
        flashStart={flashStart}
        flashEnd={flashEnd}
      />
    );
  };

  if (isLoading) {
    return (
      <div>
        {!hideSearch && (
          <div className="flex justify-center mb-4">
            <InputGroup>
              <Skeleton className="h-10 w-full max-w-md" />
            </InputGroup>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8">
          {Array.from({ length: 54 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <Skeleton className="h-36 w-36 sm:h-40 sm:w-40 md:h-44 md:w-44 lg:h-48 lg:w-48 rounded-xl" />
              <Skeleton className="h-4 w-24 mt-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {!hideSearch && (
        <div className="flex justify-center mb-4">
          <InputGroup>
            <InputGroupInput placeholder="ค้นหาเกม..." value={q} onChange={(e) => (controlledQuery !== undefined ? onQueryChange?.(e.target.value) : setInternal(e.target.value))} />
            <InputGroupAddon>
              <SearchIcon size={16} />
            </InputGroupAddon>
          </InputGroup>
        </div>
      )}
      
      {/* All Products Section */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8">
          {(() => {
            // แบ่ง products เป็น rows (6 cards ต่อ row สำหรับ md ขึ้นไป)
            const rows: ProductCard[][] = [];
            let currentRow: ProductCard[] = [];
            const itemsPerRow = 6; // ใช้จำนวนสูงสุด (md:grid-cols-6)
            
            paginatedProducts.forEach((p, index) => {
              currentRow.push(p);
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
              />
            ));
          })()}
        </div>
        {filtered.length === 0 && (
          <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% mt-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search className="size-6" />
              </EmptyMedia>
              <EmptyTitle>ไม่พบผลการค้นหา</EmptyTitle>
              <EmptyDescription>
                ลองค้นหาด้วยคำอื่น หรือดูรายการทั้งหมด
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
      {totalPages > 1 && filtered.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-white/10">
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
        <div className="text-center text-sm text-[color:var(--text)]/60 mt-2">
          หน้า {currentPage} / {totalPages} (แสดง {paginatedProducts.length} จาก {filtered.length} รายการ)
        </div>
      )}
    </div>
  );
}

function CountdownBadge({ flashStart, flashEnd }: { flashStart?: string | null; flashEnd?: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!mounted || now === null) return null;

  const endMs = flashEnd ? new Date(flashEnd).getTime() : NaN;
  const startMs = flashStart ? new Date(flashStart).getTime() : NaN;

  if (!Number.isFinite(endMs)) return null;
  if (Number.isFinite(startMs) && now < startMs) return null;
  if (now > endMs) return null;

  const msLeft = endMs - now;
  const hours = Math.max(0, Math.floor(msLeft / 3_600_000));
  const minutes = Math.max(0, Math.floor((msLeft % 3_600_000) / 60_000));
  const seconds = Math.max(0, Math.floor((msLeft % 60_000) / 1000));
  const timeStr = hours > 0 
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` 
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <Badge variant="secondary" className="h-5 min-w-fit rounded-full px-2 font-mono tabular-nums text-xs bg-orange-500/20 border-orange-500/30 text-orange-200">
      {timeStr}
    </Badge>
  );
}


