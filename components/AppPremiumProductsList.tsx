'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Search, ShoppingCart, Info, Package, RefreshCcw, Sparkles, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  icon_url: string | null;
  description: string | null;
  app_category: string | null;
  sub_category: string | null;
};

type Props = {
  products: AppPremiumProduct[];
  displayMode?: 'list' | 'cards';
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
  const [mounted, setMounted] = useState(false);
  // Use mounted state to prevent hydration mismatch
  const canBuy = mounted ? (product.stock === null || product.stock > 0) : true;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      ref={ref}
      className={`group relative bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] border border-gray-800/50 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all duration-500 flex flex-col h-full backdrop-blur-sm ${
        mounted && isVisible 
          ? 'opacity-100 translate-y-0' 
          : mounted
          ? 'opacity-0 translate-y-8'
          : 'opacity-100 translate-y-0'
      } ${!canBuy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out, box-shadow 0.4s ease-out',
        transitionDelay: mounted && isVisible ? `${index * 30}ms` : '0ms',
      }}
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      {/* Shine Effect on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </div>
      
      {/* Stock Badge */}
      {mounted && product.stock !== null && product.stock > 0 && product.stock <= 5 && (
        <div className="absolute top-3 right-3 z-20">
          <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white shadow-lg backdrop-blur-sm border-0">
            <Sparkles className="size-3 mr-1" />
            เหลือน้อย
          </Badge>
        </div>
      )}
      
      {!canBuy && (
        <div className="absolute top-3 right-3 z-20">
          <Badge variant="secondary" className="bg-gray-700/90 text-gray-300 backdrop-blur-sm border-0">
            สินค้าหมด
          </Badge>
        </div>
      )}
      
      <div className="relative flex flex-col h-full p-5 z-10">
        {/* Image Section with Overlay */}
        {product.image_url && (
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 mb-4 group/image flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={product.image_url} 
              alt={product.display_name} 
              className="w-full h-full object-contain p-3 transition-transform duration-700 group-hover:scale-105"
              suppressHydrationWarning
            />
            {/* Image Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/image:translate-x-full transition-transform duration-1000"></div>
          </div>
        )}
        
        {/* Content Section */}
        <div className="flex flex-col flex-grow space-y-3 mb-4">
          {/* Title */}
          <h3
            className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors duration-300 line-clamp-2 min-h-[3.5rem] leading-tight"
            dangerouslySetInnerHTML={{ __html: product.display_name || '' }}
            suppressHydrationWarning
          />
          
          {/* Description */}
          <p
            className="text-sm text-gray-400/80 line-clamp-2 min-h-[2.5rem] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: product.description || '&#x00A0;' }}
            suppressHydrationWarning
          />
          
          {/* Price and Stock Section */}
          <div className="flex items-end justify-between gap-3 pt-2">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors duration-300">
                {currencyFormatter.format(product.price)}
                </div>
                <span className="text-xs text-gray-500">พอยต์</span>
              </div>
              {mounted && product.stock !== null && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                  <TrendingUp className="size-3" />
                  <span>คงเหลือ: <span className="font-semibold text-emerald-400">{product.stock}</span> ชิ้น</span>
                </div>
              )}
              {!mounted && product.stock !== null && (
                <div className="text-xs text-gray-500 mt-2 min-h-[1.25rem]">
                  &nbsp;
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Divider with Gradient */}
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent mb-4 flex-shrink-0"></div>
        
        {/* Action Buttons */}
        {mounted ? (
          <div className="flex flex-col gap-2.5 mt-auto flex-shrink-0">
          <Button
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold gap-2 shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 h-11"
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
            <Link href={`/premium-app/${product.id}`} onClick={(e) => e.stopPropagation()} className="w-full">
            <Button
              variant="outline"
                className="w-full border-gray-700/50 hover:bg-gray-800/50 hover:border-emerald-500/50 text-white transition-all duration-300 h-11 backdrop-blur-sm"
            >
              <Info className="size-4 mr-2" />
              รายละเอียด
            </Button>
          </Link>
        </div>
        ) : (
          <div className="flex flex-col gap-2.5 mt-auto flex-shrink-0">
            <div className="w-full h-11 bg-gray-800/50 rounded-lg animate-pulse"></div>
            <div className="w-full h-11 bg-gray-800/50 rounded-lg animate-pulse"></div>
          </div>
        )}
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

function AppPremiumListLayout({
  products,
  onQuickBuy,
}: {
  products: AppPremiumProduct[];
  onQuickBuy: (product: AppPremiumProduct) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubCategory, setFilterSubCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const handledInvalidCategoryRef = useRef(false);
  const itemsPerPage = 25;

  useEffect(() => {
    setMounted(true);
  }, []);

  const currencyFormatter = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  });

  // Read category from URL query parameter after categories are loaded
  useEffect(() => {
    if (loadingCategories || !searchParams) return;
    
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      // Verify that the category exists in the categories list
      const categoryExists = categories.some(cat => cat.category === categoryParam);
      if (categoryExists) {
        setFilterCategory(categoryParam);
        handledInvalidCategoryRef.current = false;
      } else if (!handledInvalidCategoryRef.current) {
        handledInvalidCategoryRef.current = true;
        toast.show({
          title: 'ไม่พบหมวดหมู่',
          description: 'หมวดหมู่ที่คุณเลือกถูกปิดการเผยแพร่หรือไม่มีอยู่แล้ว',
          variant: 'destructive'
        });
        const params = new URLSearchParams(searchParams.toString());
        params.delete('category');
        const queryString = params.toString();
        router.replace(queryString ? `/premium-app?${queryString}` : '/premium-app', { scroll: false });
        setFilterCategory('all');
      }
    } else {
      handledInvalidCategoryRef.current = false;
    }
  }, [searchParams, categories, loadingCategories, router, toast]);

  // Fetch categories
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/app-premium/categories?' + Date.now(), { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
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

  // Get sub categories for current main category with icon from products
  const subCategoriesWithIcon = useMemo(() => {
    if (filterCategory === 'all') return [];
    
    const categoryProducts = products.filter((product: any) => {
      const productAppCategory = (product.app_category || '').toLowerCase();
      return productAppCategory === filterCategory.toLowerCase();
    });
    
    // Group by sub_category and get icon from first product in each group
    const subCatMap = new Map<string, string | null>();
    categoryProducts.forEach((product: any) => {
      if (product.sub_category && product.sub_category.trim()) {
        const subCat = product.sub_category.trim();
        // Use icon_url from product if not already set
        if (!subCatMap.has(subCat)) {
          subCatMap.set(subCat, product.icon_url || null);
        }
      }
    });
    
    return Array.from(subCatMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, iconUrl]) => ({
        name,
        iconUrl
      }));
  }, [products, filterCategory]);

  // Reset sub category when main category changes
  useEffect(() => {
    setFilterSubCategory('all');
  }, [filterCategory]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category - ใช้ app_category ตรงๆ
    if (filterCategory !== 'all') {
      filtered = filtered.filter((product: any) => {
        const productAppCategory = (product.app_category || '').toLowerCase();
        return productAppCategory === filterCategory.toLowerCase();
      });
    }

    // Filter by sub category
    if (filterSubCategory !== 'all') {
      filtered = filtered.filter((product: any) => {
        const productSubCategory = (product.sub_category || '').trim();
        return productSubCategory === filterSubCategory;
          });
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
  }, [products, filterCategory, filterSubCategory, searchQuery, categories]);

  // Paginate products
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterSubCategory, categories]);

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
    <div className="space-y-6" suppressHydrationWarning>
      {/* Products Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-emerald-600 to-transparent"></div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShoppingCart className="size-5 text-emerald-600" />
          รายการสินค้า
        </h2>
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-emerald-600 to-transparent"></div>
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4" suppressHydrationWarning>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
          <Input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-600 hover:border-emerald-600"
          />
        </div>
      </div>

      {/* Filter Buttons - Main Categories */}
      {loadingCategories ? (
        <div className="flex flex-wrap gap-3">
          <div className="h-11 w-24 bg-gray-800 rounded-lg animate-pulse"></div>
          <div className="h-11 w-28 bg-gray-800 rounded-lg animate-pulse"></div>
          <div className="h-11 w-24 bg-gray-800 rounded-lg animate-pulse"></div>
        </div>
      ) : filterButtons.length > 1 ? (
        <div className="flex flex-wrap gap-3" suppressHydrationWarning>
          {filterButtons.map((button) => (
            <Button
              key={button.value}
              variant={filterCategory === button.value ? 'default' : 'outline'}
              size="default"
              onClick={() => {
                setFilterCategory(button.value);
                // Update URL without page reload
                const params = new URLSearchParams(searchParams?.toString() || '');
                if (button.value === 'all') {
                  params.delete('category');
                } else {
                  params.set('category', button.value);
                }
                router.push(`/premium-app?${params.toString()}`, { scroll: false });
              }}
              className={
                filterCategory === button.value
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-base font-semibold shadow-md'
                  : 'border-2 border-gray-700 hover:bg-gray-800 hover:border-emerald-600 text-white px-6 py-2.5 text-base font-medium'
              }
            >
              {button.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400 italic">กำลังโหลดหมวดหมู่...</div>
      )}

      {/* Sub Categories - Show when main category is selected */}
      {filterCategory !== 'all' && subCategoriesWithIcon.length > 0 && (
        <div className="space-y-2" suppressHydrationWarning>
          <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Package className="size-4 text-emerald-600" />
            หมวดหมู่ย่อย:
          </div>
          <div className="flex flex-wrap gap-1.5" suppressHydrationWarning>
            <Button
              variant={filterSubCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSubCategory('all')}
              className={
                filterSubCategory === 'all'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 h-7'
                  : 'border-gray-700 hover:bg-gray-800 hover:border-emerald-600 text-white text-xs px-3 py-1.5 h-7'
              }
            >
              ทั้งหมด
            </Button>
            {subCategoriesWithIcon.map((subCat) => (
              <Button
                key={subCat.name}
                variant={filterSubCategory === subCat.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSubCategory(subCat.name)}
                className={
                  filterSubCategory === subCat.name
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 h-7'
                    : 'border-gray-700 hover:bg-gray-800 hover:border-emerald-600 text-white text-xs px-3 py-1.5 h-7'
                }
              >
                {subCat.iconUrl && (
                  <span className="mr-1.5 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={subCat.iconUrl} 
                      alt={subCat.name}
                      className="w-3.5 h-3.5 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                      suppressHydrationWarning
                    />
                  </span>
                )}
                {subCat.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-white" suppressHydrationWarning>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" suppressHydrationWarning>
            {paginatedProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                currencyFormatter={currencyFormatter}
                onQuickBuy={onQuickBuy}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8" suppressHydrationWarning>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-gray-700 hover:bg-gray-800 text-white disabled:opacity-50"
              >
                ก่อนหน้า
              </Button>
              <span className="text-sm text-white" suppressHydrationWarning>
                หน้า {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-700 hover:bg-gray-800 text-white disabled:opacity-50"
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

type CategoryGroup = {
  key: string;
  title: string;
  iconUrl: string | null;
  imageUrl: string | null;
  description: string | null;
  minPrice: number;
  products: AppPremiumProduct[];
  subCategoryBadges: string[];
};

function AppPremiumGroupedLayout({
  products,
  onQuickBuy,
}: {
  products: AppPremiumProduct[];
  onQuickBuy: (product: AppPremiumProduct) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<CategoryGroup | null>(null);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
      }),
    [],
  );

  const groupedCategories = useMemo<CategoryGroup[]>(() => {
    if (!products.length) return [];
    const map = new Map<string, CategoryGroup>();
    products.forEach((product) => {
      const rawCategory = (product.app_category || 'บริการอื่นๆ').trim();
      const key = rawCategory.toLowerCase() || 'others';
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: rawCategory || 'บริการอื่นๆ',
          iconUrl: product.icon_url || product.image_url || null,
          imageUrl: product.image_url || null,
          description: product.description,
          minPrice: Number(product.price) || 0,
          products: [],
          subCategoryBadges: [],
        });
      }
      const group = map.get(key)!;
      group.products.push(product);
      if (!group.iconUrl && (product.icon_url || product.image_url)) {
        group.iconUrl = product.icon_url || product.image_url;
      }
      const currentPrice = Number(product.price) || 0;
      if (group.minPrice === 0 || currentPrice < group.minPrice) {
        group.minPrice = currentPrice;
      }
    });

    return Array.from(map.values())
      .map((group) => {
        const badges = Array.from(
          new Set(
            group.products
              .map((prod) => (prod.sub_category || '').trim())
              .filter((name) => name.length > 0),
          ),
        ).slice(0, 3);
        return {
          ...group,
          subCategoryBadges: badges,
          minPrice: group.minPrice || 0,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'th'));
  }, [products]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedCategories;
    const query = searchQuery.toLowerCase();
    return groupedCategories.filter(
      (group) =>
        group.title.toLowerCase().includes(query) ||
        group.products.some((product) =>
          product.display_name.toLowerCase().includes(query),
        ),
    );
  }, [groupedCategories, searchQuery]);

  const activeGroupSubCategories = useMemo(() => {
    if (!activeGroup) return [];
    const map = new Map<string, AppPremiumProduct[]>();
    activeGroup.products.forEach((product) => {
      const key = (product.sub_category || 'แพ็กเกจอื่นๆ').trim() || 'แพ็กเกจอื่นๆ';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(product);
    });
    return Array.from(map.entries()).map(([name, items]) => ({
      name,
      items: items.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)),
    }));
  }, [activeGroup]);

  if (!products.length) {
    return (
      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Package className="size-8 text-gray-400" />
          </EmptyMedia>
          <EmptyTitle className="text-white">ยังไม่มีบริการ</EmptyTitle>
          <EmptyDescription className="text-gray-400">
            บริการจะแสดงที่นี่เมื่อมีการเพิ่มบริการใหม่
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/40 via-black/60 to-black/70 p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">
                โหมดการ์ดหมวดรวม
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                เลือกบริการตามหมวดหลัก
              </h2>
              <p className="text-sm text-gray-400">
                คลิกการ์ดเพื่อดูแพ็กเกจทั้งหมดของบริการนั้น ๆ ในหน้าต่างเดียว
              </p>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
              <Input
                type="text"
                placeholder="ค้นหาบริการหรือแพ็กเกจ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0f0f0f] border-gray-800 text-white placeholder:text-gray-500 focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package className="size-6" />
              </EmptyMedia>
              <EmptyTitle>ไม่พบบริการที่ค้นหา</EmptyTitle>
              <EmptyDescription>
                ลองค้นหาด้วยคำอื่น หรือดูบริการทั้งหมด
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => {
                  setActiveGroup(group);
                  setSheetOpen(true);
                }}
                className="flex w-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b0b0b] to-[#050505] p-4 text-left shadow-sm transition hover:border-emerald-500/60 hover:shadow-emerald-500/20 focus:outline-none"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    {group.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={group.iconUrl}
                        alt={group.title}
                        className="h-10 w-10 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package className="size-6 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {group.title}
                      </h3>
                      <Badge className="bg-emerald-600/20 text-emerald-300">
                        {group.products.length} แพ็กเกจ
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {group.description
                        ? group.description.replace(/<[^>]+>/g, '')
                        : 'คลิกเพื่อดูรายละเอียดและเลือกแพ็กเกจทั้งหมด'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.subCategoryBadges.map((badge) => (
                    <Badge
                      key={badge}
                      variant="outline"
                      className="border-emerald-800/40 bg-emerald-900/10 text-xs text-emerald-300"
                    >
                      {badge}
                    </Badge>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-gray-300">
                  <span>ราคาเริ่มต้น</span>
                  <span className="text-base font-semibold text-emerald-400">
                    {currencyFormatter.format(group.minPrice || 0)} / แพ็ก
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setActiveGroup(null);
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="h-[85vh] overflow-y-auto bg-[#050505] text-white"
        >
          {activeGroup && (
            <>
              <SheetHeader className="space-y-1">
                <SheetTitle className="text-2xl font-bold">
                  {activeGroup.title}
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-400">
                  เลือกแพ็กเกจที่ต้องการซื้อ หรือดูรายละเอียดเพิ่มเติม
                </SheetDescription>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-600/20 text-emerald-300">
                    ทั้งหมด {activeGroup.products.length} แพ็กเกจ
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-white">
                    เริ่มต้น {currencyFormatter.format(activeGroup.minPrice || 0)}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {activeGroupSubCategories.map((subGroup) => (
                  <div key={subGroup.name} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-white">
                          {subGroup.name}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {subGroup.items.length} แพ็กเกจ
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {subGroup.items.map((product) => (
                        <div
                          key={product.id}
                          className="rounded-lg border border-white/10 bg-black/30 p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <div
                                className="text-sm font-semibold text-white"
                                dangerouslySetInnerHTML={{
                                  __html: product.display_name || '',
                                }}
                              />
                              {product.description && (
                                <p className="text-xs text-gray-400 line-clamp-2">
                                  {product.description.replace(/<[^>]+>/g, '')}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-emerald-400">
                                {currencyFormatter.format(product.price)}
                              </p>
                              {product.stock !== null && (
                                <p className="text-xs text-gray-400">
                                  สต็อก: {product.stock} ชิ้น
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                              onClick={() => onQuickBuy(product)}
                            >
                              <ShoppingCart className="mr-2 size-4" />
                              ซื้อด่วน
                            </Button>
                            <Link
                              href={`/premium-app/${product.id}`}
                              className="flex-1"
                              onClick={() => setSheetOpen(false)}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-white/20 text-white hover:border-emerald-400 hover:text-emerald-300"
                              >
                                <Info className="mr-2 size-4" />
                                รายละเอียด
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {activeGroupSubCategories.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
                    ยังไม่มีแพ็กเกจให้เลือก
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function QuickBuyDialog({
  product,
  onClose,
}: {
  product: AppPremiumProduct | null;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
      }),
    [],
  );

  const handleConfirm = async () => {
    if (!product) return;
    const canBuy = product.stock === null || product.stock > 0;
    if (!canBuy) {
      show({
        title: 'เกิดข้อผิดพลาด',
        description: 'สินค้าหมด',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9).toUpperCase();
      const reference = `APP_${timestamp}_${random}`;
      const res = await fetch('/api/app-premium/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          reference,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        show({
          title: 'สำเร็จ',
          description: 'ซื้อสินค้าแอพพรีเมี่ยมเรียบร้อยแล้ว ตรวจสอบที่หน้าประวัติ',
        });
        window.dispatchEvent(new Event('wallet:changed'));
        onClose();
        window.location.reload();
      } else {
        show({
          title: 'เกิดข้อผิดพลาด',
          description: json.detail || json.error || 'ไม่สามารถซื้อได้',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Quick buy error:', err);
      show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถซื้อได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={!!product}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setLoading(false);
        }
      }}
    >
      {product && (
        <DialogContent className="max-w-md bg-[#0a0a0a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">ซื้อแอพพรีเมี่ยม</DialogTitle>
            <DialogDescription className="pt-4">
              <div className="space-y-4">
                <div className="space-y-2 pb-3 border-b border-gray-800">
                  <div
                    className="font-semibold text-white"
                    dangerouslySetInnerHTML={{ __html: product.display_name || '' }}
                    suppressHydrationWarning
                  />
                  {product.description && (
                    <div
                      className="text-sm text-gray-400 max-h-96 overflow-y-auto"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
                      dangerouslySetInnerHTML={{ __html: product.description }}
                      suppressHydrationWarning
                    />
                  )}
                </div>
                <div className="space-y-2 p-4 rounded-lg border border-emerald-800 bg-emerald-900/20">
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-800">
                    <span className="font-semibold text-white">ราคารวม:</span>
                    <span className="text-xl font-bold text-emerald-600">
                      {currencyFormatter.format(product.price)}
                    </span>
                  </div>
                  {product.stock !== null && product.stock > 0 && (
                    <div className="text-xs text-gray-400 pt-1" suppressHydrationWarning>
                      สต็อกคงเหลือ: {product.stock} ชิ้น
                    </div>
                  )}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-emerald-900/20 border border-emerald-800">
                  <p className="text-sm text-emerald-400">
                    หลังจากซื้อ คุณจะได้รับข้อมูลสินค้าที่หน้าประวัติ
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onClose()}
              disabled={loading}
              className="border-gray-700 hover:bg-gray-800 text-gray-300"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
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
      )}
    </Dialog>
  );
}

export default function AppPremiumProductsList({
  products,
  displayMode = 'list',
}: Props) {
  const [quickBuyProduct, setQuickBuyProduct] = useState<AppPremiumProduct | null>(null);

  return (
    <>
      {displayMode === 'cards' ? (
        <AppPremiumGroupedLayout products={products} onQuickBuy={setQuickBuyProduct} />
      ) : (
        <AppPremiumListLayout products={products} onQuickBuy={setQuickBuyProduct} />
      )}
      <QuickBuyDialog product={quickBuyProduct} onClose={() => setQuickBuyProduct(null)} />
    </>
  );
}
