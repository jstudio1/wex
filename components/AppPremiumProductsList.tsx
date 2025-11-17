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
import { Search, ShoppingCart, Info, Package, RefreshCcw } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type AppPremiumProduct = {
  id: number;
  provider_product_id: number;
  name: string;
  display_name: string;
  price: number;
  base_price: number;
  stock: number;
  image_url: string | null;
  description: string | null;
};

type Props = {
  products: AppPremiumProduct[];
};

// Product Card Component with scroll animation
function ProductCard({ 
  product, 
  index, 
  currencyFormatter,
  onQuickBuy 
}: { 
  product: AppPremiumProduct; 
  index: number;
  currencyFormatter: Intl.NumberFormat;
  onQuickBuy: (product: AppPremiumProduct) => void;
}) {
  const { ref, isVisible } = useScrollAnimation();
  const canBuy = product.stock === null || product.stock > 0;

  return (
    <div
      ref={ref}
      className={`group relative bg-black/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-5 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      } ${!canBuy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
        transitionDelay: isVisible ? `${index * 20}ms` : '0ms',
      }}
    >
      {/* Gradient Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-purple-600/0 to-purple-600/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      <div className="relative space-y-4">
        {product.image_url && (
          <div className="aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-purple-600/20 to-purple-500/10 border border-purple-500/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={product.image_url} 
              alt={product.display_name} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div>
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
            {product.display_name}
          </h3>
          {product.description && (
            <p className="text-sm text-white/60 mb-3 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
                {currencyFormatter.format(product.price)}
              </div>
              {product.stock !== null && (
                <div className="text-xs text-white/50 mt-1">
                  คงเหลือ: <span className="font-medium">{product.stock}</span> ชิ้น
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
        
        {/* Quick Buy Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium gap-2"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (canBuy) {
                onQuickBuy(product);
              }
            }}
            disabled={!canBuy}
          >
            <ShoppingCart className="size-4" />
            ซื้อสินค้านี้
          </Button>
          <Link href={`/premium-app/${product.id}`} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              className="w-full border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white"
            >
              <Info className="size-4 mr-2" />
              รายละเอียด
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

type Category = {
  id: number;
  category: string;
  display_name: string | null;
  filter_keywords: string[];
  is_published: boolean;
  icon_url: string | null;
};

export default function AppPremiumProductsList({ products }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [quickBuyProduct, setQuickBuyProduct] = useState<AppPremiumProduct | null>(null);
  const [quickBuyLoading, setQuickBuyLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const currencyFormatter = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  });

  // Fetch categories
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/app-premium/categories?' + Date.now(), { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data)) {
            setCategories(data);
          }
        } else {
          if (mounted) {
            setCategories([]);
          }
        }
      } catch (error) {
        if (mounted) {
          setCategories([]);
        }
      } finally {
        if (mounted) {
          setLoadingCategories(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Prevent body scroll lock when select menu is open - maintain scrollbar visibility
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    // Calculate and store scrollbar width BEFORE any changes
    let savedScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Recalculate scrollbar width periodically (in case page content changes)
    const recalculateScrollbarWidth = () => {
      const originalOverflow = body.style.overflow;
      body.style.overflow = 'auto';
      savedScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = originalOverflow;
    };
    
    // Initial calculation
    recalculateScrollbarWidth();
    
    let rafId: number | null = null;
    let isActive = true;
    
    // Function to maintain scrollbar visibility
    const maintainScrollbar = () => {
      if (!isActive) return;
      
      const bodyOverflow = body.style.overflow;
      const htmlOverflow = html.style.overflow;
      const hasScrollLock = body.hasAttribute('data-scroll-locked');
      
      // If overflow is hidden or scroll is locked, restore it
      if (bodyOverflow === 'hidden' || htmlOverflow === 'hidden' || hasScrollLock) {
        body.style.overflow = 'auto';
        html.style.overflow = 'auto';
        body.removeAttribute('data-scroll-locked');
        
        // Add padding to maintain layout
        if (savedScrollbarWidth > 0) {
          const currentPaddingRight = parseInt(body.style.paddingRight) || 0;
          if (currentPaddingRight < savedScrollbarWidth) {
            body.style.paddingRight = `${savedScrollbarWidth}px`;
          }
        }
      } else {
        // Update saved width if scrollbar is visible
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
    
    // MutationObserver for immediate detection
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

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category
    if (filterCategory !== 'all') {
      const selectedCategory = categories.find(cat => cat.category === filterCategory);
      if (selectedCategory && selectedCategory.filter_keywords && selectedCategory.filter_keywords.length > 0) {
        filtered = filtered.filter(product => {
          const displayName = (product.display_name || '').toLowerCase();
          const name = (product.name || '').toLowerCase();
          
          // Check if product name matches any keyword
          return selectedCategory.filter_keywords.some(keyword => {
            const keywordLower = keyword.toLowerCase();
            return displayName.includes(keywordLower) || 
                   name.includes(keywordLower) ||
                   displayName.startsWith(keywordLower + ' ') ||
                   displayName.endsWith(' ' + keywordLower) ||
                   name.startsWith(keywordLower + ' ') ||
                   name.endsWith(' ' + keywordLower);
          });
        });
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.display_name.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query))
      );
    }

    // Sort by price: low to high (ราคาถูกๆ ขึ้นก่อน)
    filtered = [...filtered].sort((a, b) => {
      const priceA = Number(a.price) || 0;
      const priceB = Number(b.price) || 0;
      return priceA - priceB;
    });

    return filtered;
  }, [products, filterCategory, searchQuery, categories]);

  // Paginate products
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, categories]);

  // Adjust current page if it exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const filterButtons = useMemo(() => {
    const buttons = [
      { value: 'all', label: 'ทั้งหมด', iconUrl: null },
      ...categories.map(cat => ({
        value: cat.category,
        label: cat.display_name || cat.category,
        iconUrl: cat.icon_url || null,
      }))
    ];
    return buttons;
  }, [categories]);

  return (
    <div className="space-y-6">
      {/* Products Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShoppingCart className="size-5 text-purple-400" />
          รายการสินค้า
        </h2>
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
          <Input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black/50 border-purple-500/20 text-white placeholder:text-white/40 focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* Filter Buttons */}
      {loadingCategories ? (
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-20 bg-white/10 rounded-md animate-pulse"></div>
          <div className="h-9 w-24 bg-white/10 rounded-md animate-pulse"></div>
          <div className="h-9 w-20 bg-white/10 rounded-md animate-pulse"></div>
        </div>
      ) : filterButtons.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((button) => (
            <Button
              key={button.value}
              variant={filterCategory === button.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory(button.value)}
              className={
                filterCategory === button.value
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white'
              }
            >
              {button.iconUrl && (
                <span className="mr-1.5 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={button.iconUrl} 
                    alt={button.label}
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </span>
              )}
              {button.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-white/50 italic">กำลังโหลดหมวดหมู่...</div>
      )}

      {/* Results count */}
      <div className="text-sm text-white/70">
        {filterCategory === 'all' && !searchQuery 
          ? `พบสินค้า ${filteredProducts.length} รายการ`
          : `พบ ${filteredProducts.length} รายการ`}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package className="size-6" />
            </EmptyMedia>
            <EmptyTitle>
            {searchQuery ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้าแอพพรีเมี่ยม'}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery 
                ? 'ลองค้นหาด้วยคำอื่น หรือดูรายการทั้งหมด'
                : 'สินค้าจะแสดงที่นี่เมื่อมีการเพิ่มสินค้าใหม่'}
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

          {/* Quick Buy Dialog - Outside of card loop */}
          {quickBuyProduct && (
            <Dialog open={!!quickBuyProduct} onOpenChange={(open) => {
              if (!open) {
                setQuickBuyProduct(null);
              }
            }}>
              <DialogContent className="max-w-md bg-black/90 backdrop-blur-sm border-purple-500/20">
                <DialogHeader>
                  <DialogTitle className="text-xl text-white">ซื้อแอพพรีเมี่ยม</DialogTitle>
                  <DialogDescription className="pt-4">
                    <div className="space-y-4">
                      {/* Product Info */}
                      <div className="space-y-2 pb-3 border-b border-purple-500/20">
                        <div className="font-semibold text-white">{quickBuyProduct.display_name}</div>
                        {quickBuyProduct.description && (
                          <div className="text-sm text-white/60 line-clamp-2">
                            {quickBuyProduct.description}
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="space-y-2 p-4 rounded-lg border border-purple-500/20 bg-purple-600/10">
                        <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
                          <span className="font-semibold text-white">ราคารวม:</span>
                          <span className="text-xl font-bold text-purple-400">
                            {currencyFormatter.format(quickBuyProduct.price)}
                          </span>
                        </div>
                        {quickBuyProduct.stock !== null && quickBuyProduct.stock > 0 && (
                          <div className="text-xs text-white/40 pt-1">
                            สต็อกคงเหลือ: {quickBuyProduct.stock} ชิ้น
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-sm text-purple-300">
                          หลังจากซื้อ คุณจะได้รับข้อมูลสินค้าที่หน้าประวัติ
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
                    className="border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!quickBuyProduct) return;
                      
                      const canBuy = quickBuyProduct.stock === null || quickBuyProduct.stock > 0;
                      if (!canBuy) {
                        toast.show({
                          title: 'เกิดข้อผิดพลาด',
                          description: 'สินค้าหมด',
                          variant: 'destructive'
                        });
                        return;
                      }

                      setQuickBuyLoading(true);
                      try {
                        // Generate reference
                        const timestamp = Date.now();
                        const random = Math.random().toString(36).substring(2, 9).toUpperCase();
                        const reference = `APP_${timestamp}_${random}`;
                        
                        const res = await fetch('/api/app-premium/orders', {
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
                            description: 'ซื้อสินค้าแอพพรีเมี่ยมเรียบร้อยแล้ว ตรวจสอบที่หน้าประวัติ'
                          });
                          window.dispatchEvent(new Event('wallet:changed'));
                          setQuickBuyProduct(null);
                          // Refresh page to update stock
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
                    className="bg-purple-600 hover:bg-purple-700 text-white"
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
                className="border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white disabled:opacity-50"
              >
                ก่อนหน้า
              </Button>
              <span className="text-sm text-white/70">
                หน้า {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white disabled:opacity-50"
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
