'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Search, ShoppingCart, Info, CreditCard, RefreshCcw } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type CashcardProduct = {
  id: number;
  provider_product_id: number;
  category: string | null;
  category_display_name: string | null;
  name: string;
  display_name: string;
  price: number;
  base_price: number;
  recommended_price: number | null;
  discount: number | null;
  image_url: string | null;
  info: string | null;
  format_id: string | null;
};

type Props = {
  products: CashcardProduct[];
};

// Product Card Component with scroll animation
function ProductCard({ 
  product, 
  index, 
  currencyFormatter,
  onQuickBuy 
}: { 
  product: CashcardProduct; 
  index: number;
  currencyFormatter: Intl.NumberFormat;
  onQuickBuy: (product: CashcardProduct) => void;
}) {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div
      ref={ref}
      className={`card p-4 space-y-3 hover:border-accent/50 transition-all duration-300 group relative ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
        transitionDelay: isVisible ? `${index * 20}ms` : '0ms',
      }}
    >
      <Link 
        href={`/cashcard/${product.id}`}
        className="block space-y-3"
      >
        {product.image_url && (
          <div className="aspect-square w-full rounded-lg overflow-hidden bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={product.image_url} 
              alt={product.display_name} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--text)] mb-1">
            {product.display_name}
          </h3>
          {product.category_display_name && (
            <div className="text-xs text-[color:var(--text)]/50 mb-1">
              {product.category_display_name}
            </div>
          )}
          {product.info && (
            <p className="text-sm text-[color:var(--text)]/60 mb-2 line-clamp-2">
              {product.info}
            </p>
          )}
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="text-2xl font-bold text-accent">
                {currencyFormatter.format(product.price)}
              </div>
              {product.recommended_price && (
                <div className="text-xs text-[color:var(--text)]/50 mt-1 line-through">
                  ราคาแนะนำ: {currencyFormatter.format(product.recommended_price)}
                </div>
              )}
              {product.discount && product.discount > 0 && (
                <div className="text-xs text-green-400 mt-1">
                  ส่วนลด: {currencyFormatter.format(product.discount)}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
      
      {/* Quick Buy Buttons */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          className="w-full bg-accent hover:opacity-90 text-[color:var(--text)] font-medium gap-2"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onQuickBuy(product);
          }}
        >
          <ShoppingCart className="size-4" />
          ซื้อสินค้านี้
        </Button>
        <Link href={`/cashcard/${product.id}`} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="w-full border-white/20 hover:bg-white/10"
          >
            <Info className="size-4 mr-2" />
            รายละเอียด
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function CashcardProductsList({ products }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [quickBuyProduct, setQuickBuyProduct] = useState<CashcardProduct | null>(null);
  const [quickBuyLoading, setQuickBuyLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const currencyFormatter = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  });

  // Prevent body scroll lock when dialog is open - maintain scrollbar visibility
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    let savedScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    const recalculateScrollbarWidth = () => {
      const originalOverflow = body.style.overflow;
      body.style.overflow = 'auto';
      savedScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = originalOverflow;
    };
    
    recalculateScrollbarWidth();
    
    let rafId: number | null = null;
    let isActive = true;
    
    const maintainScrollbar = () => {
      if (!isActive) return;
      
      const bodyOverflow = body.style.overflow;
      const htmlOverflow = html.style.overflow;
      const hasScrollLock = body.hasAttribute('data-scroll-locked');
      
      if (bodyOverflow === 'hidden' || htmlOverflow === 'hidden' || hasScrollLock) {
        body.style.overflow = 'auto';
        html.style.overflow = 'auto';
        body.removeAttribute('data-scroll-locked');
        
        if (savedScrollbarWidth > 0) {
          const currentPaddingRight = parseInt(body.style.paddingRight) || 0;
          if (currentPaddingRight < savedScrollbarWidth) {
            body.style.paddingRight = `${savedScrollbarWidth}px`;
          }
        }
      } else {
        if (bodyOverflow === '' || bodyOverflow === 'auto') {
          const currentScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
          if (currentScrollbarWidth > 0) {
            savedScrollbarWidth = currentScrollbarWidth;
          }
        }
      }
      
      if (isActive) {
        rafId = requestAnimationFrame(maintainScrollbar);
      }
    };
    
    rafId = requestAnimationFrame(maintainScrollbar);
    
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (target === body || target === html) {
            shouldCheck = true;
          }
        }
      });
      if (shouldCheck) {
        maintainScrollbar();
      }
    });

    observer.observe(body, {
      attributes: true,
      attributeFilter: ['style', 'data-scroll-locked'],
    });
    
    observer.observe(html, {
      attributes: true,
      attributeFilter: ['style'],
    });
    
    const recalcInterval = setInterval(() => {
      recalculateScrollbarWidth();
    }, 1000);

    return () => {
      isActive = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      clearInterval(recalcInterval);
      observer.disconnect();
      if (body.style.paddingRight) {
        body.style.paddingRight = '';
      }
    };
  }, []);

  // Get unique categories from products with display names
  // Note: The API already filters by published categories, so we just extract them
  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();
    products.forEach(product => {
      if (product.category && product.category.trim()) {
        const displayName = product.category_display_name || product.category;
        categoryMap.set(product.category, displayName);
      }
    });
    return Array.from(categoryMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category
    if (filterCategory !== null) {
      filtered = filtered.filter(product => 
        product.category === filterCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.display_name.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query) ||
        (product.category && product.category.toLowerCase().includes(query)) ||
        (product.info && product.info.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [products, filterCategory, searchQuery]);

  // Paginate products
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory]);

  // Adjust current page if it exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--text)]/40" />
          <Input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filter Buttons */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory(null)}
            className={filterCategory === null 
              ? 'bg-accent hover:opacity-90 text-[color:var(--text)]' 
              : 'border-white/20 hover:bg-white/10'}
          >
            ทั้งหมด
          </Button>
          {categories.map(([categoryValue, displayName]) => (
            <Button
              key={categoryValue}
              variant={filterCategory === categoryValue ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory(categoryValue)}
              className={filterCategory === categoryValue 
                ? 'bg-accent hover:opacity-90 text-[color:var(--text)]' 
                : 'border-white/20 hover:bg-white/10'}
            >
              {displayName}
            </Button>
          ))}
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-[color:var(--text)]/60">
        {filterCategory !== null || searchQuery.trim()
          ? `พบ ${filteredProducts.length} รายการ`
          : `พบสินค้า ${filteredProducts.length} รายการ`}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCard className="size-6" />
            </EmptyMedia>
            <EmptyTitle>
            {searchQuery ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีบัตรเติมเงิน'}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery 
                ? 'ลองค้นหาด้วยคำอื่น หรือดูรายการทั้งหมด'
                : 'บัตรเติมเงินจะแสดงที่นี่เมื่อมีการเพิ่มสินค้าใหม่'}
            </EmptyDescription>
          </EmptyHeader>
          {searchQuery && (
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCcw className="size-4" />
                รีเฟรช
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {paginatedProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                currencyFormatter={currencyFormatter}
                onQuickBuy={setQuickBuyProduct}
              />
            ))}
          </div>

          {/* Quick Buy Dialog */}
          {quickBuyProduct && (
            <Dialog open={!!quickBuyProduct} onOpenChange={(open) => {
              if (!open) {
                setQuickBuyProduct(null);
              }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">ซื้อบัตรเติมเงิน</DialogTitle>
                  <DialogDescription className="pt-4">
                    <div className="space-y-4">
                      {/* Product Info */}
                      <div className="space-y-2 pb-3 border-b border-white/10">
                        <div className="font-semibold text-[color:var(--text)]">{quickBuyProduct.display_name}</div>
                        {quickBuyProduct.category && (
                          <div className="text-sm text-[color:var(--text)]/60">
                            หมวดหมู่: {quickBuyProduct.category}
                          </div>
                        )}
                        {quickBuyProduct.info && (
                          <div className="text-sm text-[color:var(--text)]/60 line-clamp-2">
                            {quickBuyProduct.info}
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-black/40">
                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                          <span className="font-semibold">ราคารวม:</span>
                          <span className="text-xl font-bold text-accent">
                            {currencyFormatter.format(quickBuyProduct.price)}
                          </span>
                        </div>
                        {quickBuyProduct.recommended_price && (
                          <div className="text-xs text-[color:var(--text)]/40 pt-1 line-through">
                            ราคาแนะนำ: {currencyFormatter.format(quickBuyProduct.recommended_price)}
                          </div>
                        )}
                        {quickBuyProduct.discount && quickBuyProduct.discount > 0 && (
                          <div className="text-xs text-green-400 pt-1">
                            ส่วนลด: {currencyFormatter.format(quickBuyProduct.discount)}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm text-blue-300">
                          โปรดรอ 1-2 นาที เพื่อให้การดำเนินการซื้อบัตรเติมเงินเสร็จสิ้น หลังจากซื้อ คุณจะได้รับข้อมูลสินค้าที่หน้าประวัติ
                        </p>
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuickBuyProduct(null);
                    }}
                    disabled={quickBuyLoading}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!quickBuyProduct) return;

                      setQuickBuyLoading(true);
                      try {
                        // Generate reference
                        const timestamp = Date.now();
                        const random = Math.random().toString(36).substring(2, 9).toUpperCase();
                        const reference = `CASH_${timestamp}_${random}`;
                        
                        const res = await fetch('/api/cashcard/orders', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            product_id: quickBuyProduct.id,
                            reference: reference
                          })
                        });

                        const json = await res.json();
                        if (json.ok) {
                          toast.show({
                            title: 'สำเร็จ',
                            description: json.message || 'ซื้อบัตรเติมเงินเรียบร้อยแล้ว ตรวจสอบที่หน้าประวัติ (โปรดรอ 1-2 นาที)'
                          });
                          window.dispatchEvent(new Event('wallet:changed'));
                          setQuickBuyProduct(null);
                          // Refresh page
                          window.location.reload();
                        } else {
                          toast.show({
                            title: 'เกิดข้อผิดพลาด',
                            description: json.detail || json.error || 'ไม่สามารถซื้อได้',
                            variant: 'destructive'
                          });
                        }
                      } catch (err) {
                        console.error('Quick buy error:', err);
                        toast.show({
                          title: 'เกิดข้อผิดพลาด',
                          description: 'ไม่สามารถซื้อได้',
                          variant: 'destructive'
                        });
                      } finally {
                        setQuickBuyLoading(false);
                      }
                    }}
                    disabled={quickBuyLoading}
                    className="bg-accent hover:opacity-90"
                  >
                    {quickBuyLoading ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        กำลังซื้อ...
                      </>
                    ) : (
                      'ยืนยันซื้อ'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ก่อนหน้า
              </Button>
              <span className="text-sm text-[color:var(--text)]/70">
                หน้า {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                ถัดไป
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

