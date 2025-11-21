'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Search, ShoppingCart, Info, Package, RefreshCcw, Sparkles, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
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

// Helper function to strip HTML tags and replace <br> with space for dropdown display
function sanitizeForDropdown(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ') // Replace <br> with space
    .replace(/<\/?(p|div|span|strong|em|b|i|u)[^>]*>/gi, '') // Remove common HTML tags but keep content
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

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
      
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        {mounted && product.stock !== null && product.stock > 0 && product.stock <= 5 && (
          <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white shadow-lg backdrop-blur-sm border-0">
            <Sparkles className="size-3 mr-1" />
            เหลือน้อย
          </Badge>
        )}

        {!canBuy && (
          <Badge variant="secondary" className="bg-gray-700/90 text-gray-300 backdrop-blur-sm border-0">
            สินค้าหมด
          </Badge>
        )}
      </div>
      
      <div className="relative flex flex-col h-full p-5 z-10">
        {/* Image Section with Overlay */}
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 mb-4 group/image flex items-center justify-center">
          {product.image_url ? (
            <>
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
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800 text-emerald-300 text-xl font-semibold">
                {product.display_name?.trim().charAt(0).toUpperCase() || '?'}
              </div>
              <p className="text-xs text-gray-500">ไม่มีภาพสินค้า</p>
            </div>
          )}
        </div>
        
        {/* Content Section */}
        <div className="flex flex-col flex-grow space-y-3 mb-4">
          {/* Title */}
          <h3
            className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors duration-300 line-clamp-2 min-h-[3.5rem] leading-tight"
            dangerouslySetInnerHTML={{ __html: product.display_name || '' }}
            suppressHydrationWarning
          />
          {/* Description removed to keep consistent height */}
          
          {/* Price and Stock Section */}
          <div className="flex items-end justify-between gap-3 pt-2 min-h-[4.5rem]">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors duration-300">
                {currencyFormatter.format(product.price)}
                </div>
                <span className="text-xs text-gray-500">พอยต์</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 min-h-[1.25rem]">
                {product.stock !== null ? (
                  <>
                    <TrendingUp className="size-3" />
                    <span>
                      คงเหลือ:{' '}
                      <span className="font-semibold text-emerald-400">{product.stock}</span> ชิ้น
                    </span>
                  </>
                ) : (
                  <span className="text-gray-600">สต็อกไม่จำกัด</span>
                )}
              </div>
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

function ProductCompactCard({
  product,
  currencyFormatter,
  onQuickBuy,
}: {
  product: AppPremiumProduct;
  currencyFormatter: Intl.NumberFormat;
  onQuickBuy: (product: AppPremiumProduct) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onQuickBuy(product)}
      className="flex w-full flex-col items-center rounded-2xl border border-gray-800/70 bg-gradient-to-br from-[#101010] to-[#050505] p-3 text-center shadow-sm transition hover:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-900">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.display_name}
            className="h-12 w-12 object-contain"
            suppressHydrationWarning
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800 text-lg font-semibold text-emerald-300">
            {product.display_name?.trim().charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-500">ราคาเริ่มต้น</p>
      <p className="text-base font-semibold text-emerald-400">{currencyFormatter.format(product.price)}</p>
    </button>
  );
}

type SubCategoryCardGroup = {
  name: string;
  iconUrl: string | null;
  products: AppPremiumProduct[];
  minPrice: number;
};

type SubCategoryInfo = {
  name: string;
  iconUrl: string | null;
  count: number;
};

function sanitizeHtmlContent(html?: string | null): string {
  if (!html) return '';
  const baseSanitized = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '');

  if (typeof window === 'undefined') {
    return baseSanitized;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(baseSanitized, 'text/html');
  doc.querySelectorAll('script,style').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

function SubCategoryCompactCard({
  group,
  currencyFormatter,
  onOpen,
}: {
  group: SubCategoryCardGroup;
  currencyFormatter: Intl.NumberFormat;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-center gap-2 rounded-2xl border border-gray-800/70 bg-gradient-to-br from-[#0c0c0c] to-[#050505] p-3 text-center transition hover:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-900">
        {group.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={group.iconUrl} alt={group.name} className="h-10 w-10 object-contain" />
        ) : (
          <Package className="size-5 text-emerald-400" />
        )}
      </div>
      <p className="text-xs font-semibold text-white line-clamp-2 h-8">{group.name}</p>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">ราคาเริ่มต้น</div>
      <div className="text-base font-semibold text-emerald-400">
        {currencyFormatter.format(group.minPrice || 0)}
      </div>
    </button>
  );
}

function CategoryFilterButton({
  active,
  label,
  iconUrl,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  iconUrl?: string | null;
  count?: number;
  onClick: () => void;
}) {
  const initial = label?.trim().charAt(0).toUpperCase() || '';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-w-[140px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
        active
          ? 'border-emerald-400/70 bg-gradient-to-r from-emerald-600/90 to-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)]'
          : 'border-white/10 bg-gradient-to-br from-[#0b0b0b] to-[#050505] text-gray-200 hover:border-emerald-400/40'
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
          active ? 'border-white/20 bg-white/10' : 'border-white/5 bg-white/5'
        }`}
      >
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt={label} className="h-7 w-7 object-contain" />
        ) : (
          <span className="text-sm font-semibold uppercase">{initial}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-semibold tracking-wide">{label}</span>
        <span className={`text-[11px] ${active ? 'text-white/90' : 'text-gray-400'}`}>
          {count ?? 0} รายการ
        </span>
      </div>
      <span
        className={`pointer-events-none absolute -bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent transition-opacity ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  );
}

function SubCategoryFilterChip({
  active,
  label,
  iconUrl,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  iconUrl?: string | null;
  count?: number;
  onClick: () => void;
}) {
  const initial = label?.trim().charAt(0).toUpperCase() || '';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 ${
        active
          ? 'border-emerald-400/70 bg-emerald-500/15 text-white'
          : 'border-white/10 bg-white/5 text-gray-300 hover:border-emerald-400/40'
      }`}
    >
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          active ? 'bg-emerald-500/30' : 'bg-white/10'
        }`}
      >
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt={label} className="h-4 w-4 object-contain" />
        ) : (
          <span className="text-[10px] font-bold text-emerald-300">{initial}</span>
        )}
      </div>
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className="text-[10px] font-medium text-gray-400 normal-case">{count}</span>
      )}
    </button>
  );
}

function SubCategoryPriceRow({
  product,
  currencyFormatter,
  onQuickBuy,
}: {
  product: AppPremiumProduct;
  currencyFormatter: Intl.NumberFormat;
  onQuickBuy: (product: AppPremiumProduct) => void;
}) {
  const stockLabel =
    product.stock === null
      ? 'ไม่จำกัด'
      : product.stock <= 0
      ? 'หมดชั่วคราว'
      : `${product.stock} ชิ้น`;
  const sanitizedDescription = useMemo(
    () => sanitizeHtmlContent(product.description),
    [product.description],
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#101010] to-[#050505] p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div
            className="text-base font-semibold text-white leading-snug"
            dangerouslySetInnerHTML={{ __html: product.display_name || '' }}
            suppressHydrationWarning
          />
          <div className="flex flex-wrap gap-2 text-xs text-gray-400">
            <span className="rounded-full border border-white/10 px-3 py-1">
              สต็อก: <span className="font-semibold text-emerald-300">{stockLabel}</span>
            </span>
          </div>
          {sanitizedDescription && (
            <div
              className="text-sm leading-relaxed text-gray-300"
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              suppressHydrationWarning
            />
          )}
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">
              {currencyFormatter.format(product.price)}
            </span>
            <span className="text-xs text-gray-500">บาท</span>
          </div>
          <Button
            className="h-10 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-500"
            onClick={() => onQuickBuy(product)}
          >
            <ShoppingCart className="mr-2 size-4" />
            ซื้อ
          </Button>
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

function AppPremiumLayout({
  products,
  onQuickBuy,
  displayMode = 'list',
}: {
  products: AppPremiumProduct[];
  onQuickBuy: (product: AppPremiumProduct) => void;
  displayMode?: 'list' | 'cards';
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
  const [subCategoryModal, setSubCategoryModal] = useState<{ name: string; iconUrl: string | null; products: AppPremiumProduct[] } | null>(null);
  const [selectedSubCategoryProductId, setSelectedSubCategoryProductId] = useState<number | null>(null);

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
  const { subCategoriesWithIcon, currentCategoryProductCount } = useMemo(() => {
    if (filterCategory === 'all') {
      return { subCategoriesWithIcon: [] as SubCategoryInfo[], currentCategoryProductCount: 0 };
    }

    const categoryProducts = products.filter((product: any) => {
      const productAppCategory = (product.app_category || '').toLowerCase();
      return productAppCategory === filterCategory.toLowerCase();
    });

    const subCatMap = new Map<string, { iconUrl: string | null; count: number }>();
    categoryProducts.forEach((product: any) => {
      if (product.sub_category && product.sub_category.trim()) {
        const subCat = product.sub_category.trim();
        if (!subCatMap.has(subCat)) {
          subCatMap.set(subCat, { iconUrl: product.icon_url || product.image_url || null, count: 0 });
        }
        const entry = subCatMap.get(subCat)!;
        if (!entry.iconUrl && (product.icon_url || product.image_url)) {
          entry.iconUrl = product.icon_url || product.image_url;
        }
        entry.count += 1;
      }
    });

    const subCategories = Array.from(subCatMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, data]) => ({
        name,
        iconUrl: data.iconUrl,
        count: data.count,
      }));

    return { subCategoriesWithIcon: subCategories, currentCategoryProductCount: categoryProducts.length };
  }, [products, filterCategory]);

  const subCategoryCardGroups = useMemo(() => {
    const categoryProducts =
      filterCategory === 'all'
        ? products
        : products.filter((product: AppPremiumProduct) => {
            const productAppCategory = (product.app_category || '').toLowerCase();
            return productAppCategory === filterCategory.toLowerCase();
          });

    if (!categoryProducts.length) return [];

    const map = new Map<
      string,
      {
        name: string;
        iconUrl: string | null;
        products: AppPremiumProduct[];
        description: string | null;
        minPrice: number;
      }
    >();

    categoryProducts.forEach((product: AppPremiumProduct) => {
      const key = (product.sub_category || 'แพ็กเกจอื่นๆ').trim() || 'แพ็กเกจอื่นๆ';
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          iconUrl: product.icon_url || product.image_url || null,
          products: [],
          description: product.description,
          minPrice: Number(product.price) || 0,
        });
      }
      const group = map.get(key)!;
      if (!group.iconUrl && (product.icon_url || product.image_url)) {
        group.iconUrl = product.icon_url || product.image_url;
      }
      const price = Number(product.price) || 0;
      if (group.minPrice === 0 || price < group.minPrice) {
        group.minPrice = price;
      }
      group.products.push(product);
    });

    let groups = Array.from(map.values());
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      groups = groups.filter(
        (group) =>
          group.name.toLowerCase().includes(query) ||
          group.products.some(
            (product) =>
              product.display_name.toLowerCase().includes(query) ||
              product.name.toLowerCase().includes(query),
          ),
      );
    }

    return groups.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [products, filterCategory, searchQuery]);

  // Reset sub category when main category changes
  useEffect(() => {
    setFilterSubCategory('all');
  }, [filterCategory]);

  const sortedModalProducts = useMemo(() => {
    if (!subCategoryModal?.products?.length) return [];
    return subCategoryModal.products
      .slice()
      .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  }, [subCategoryModal]);

  useEffect(() => {
    if (sortedModalProducts.length) {
      setSelectedSubCategoryProductId(sortedModalProducts[0].id);
    } else {
      setSelectedSubCategoryProductId(null);
    }
  }, [sortedModalProducts]);

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

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    map.set('all', products.length);
    products.forEach((product) => {
      const key = (product.app_category || '').toLowerCase();
      if (!key) return;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [products]);

  const handleCategoryChange = (value: string) => {
    setFilterCategory(value);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value === 'all') {
      params.delete('category');
    } else {
      params.set('category', value);
    }
    router.push(`/premium-app?${params.toString()}`, { scroll: false });
  };

  const handleSubCategoryChange = (value: string) => {
    setFilterSubCategory(value);
  };

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
          <div className="h-14 w-32 rounded-2xl bg-gray-800/70 animate-pulse"></div>
          <div className="h-14 w-32 rounded-2xl bg-gray-800/70 animate-pulse"></div>
          <div className="h-14 w-32 rounded-2xl bg-gray-800/70 animate-pulse"></div>
        </div>
      ) : filterButtons.length > 1 ? (
        <div className="space-y-3" suppressHydrationWarning>
          <div className="sm:hidden">
            <Select value={filterCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-12 rounded-2xl border-white/15 bg-[#0b0b0b] text-white">
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent className="bg-[#050505] text-white">
                {filterButtons.map((button) => (
                  <SelectItem key={button.value} value={button.value}>
                    <div className="flex items-center gap-2">
                      {button.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={button.iconUrl} alt={button.label} className="h-5 w-5 object-contain" />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold uppercase">
                          {button.label.trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="flex-1 text-sm">{button.label}</span>
                      <span className="text-xs text-gray-400">
                        {button.value === 'all'
                          ? products.length
                          : categoryCounts.get(button.value.toLowerCase()) ?? 0}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="-mx-2 hidden sm:block sm:mx-0">
            <div className="flex gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
              {filterButtons.map((button) => (
                <CategoryFilterButton
                  key={button.value}
                  active={filterCategory === button.value}
                  label={button.label}
                  iconUrl={button.iconUrl}
                  count={
                    button.value === 'all'
                      ? products.length
                      : categoryCounts.get(button.value.toLowerCase()) ?? 0
                  }
                  onClick={() => handleCategoryChange(button.value)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400 italic">กำลังโหลดหมวดหมู่...</div>
      )}

      {/* Sub Categories - Show when main category is selected */}
      {displayMode === 'list' && filterCategory !== 'all' && subCategoriesWithIcon.length > 0 && (
        <div className="space-y-3" suppressHydrationWarning>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Package className="size-4 text-emerald-600" />
            หมวดหมู่ย่อย
          </div>
          <div className="sm:hidden">
            <Select value={filterSubCategory} onValueChange={handleSubCategoryChange}>
              <SelectTrigger className="h-11 rounded-xl border-white/15 bg-[#0b0b0b] text-white">
                <SelectValue placeholder="เลือกหมวดหมู่ย่อย" />
              </SelectTrigger>
              <SelectContent className="bg-[#050505] text-white">
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm">ทั้งหมด</span>
                    <span className="text-xs text-gray-400">{currentCategoryProductCount}</span>
                  </div>
                </SelectItem>
                {subCategoriesWithIcon.map((subCat) => (
                  <SelectItem key={subCat.name} value={subCat.name}>
                    <div className="flex items-center gap-2">
                      {subCat.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={subCat.iconUrl} alt={subCat.name} className="h-4 w-4 object-contain" />
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[8px] font-bold uppercase text-emerald-300">
                          {subCat.name.trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="flex-1 text-sm">{subCat.name}</span>
                      <span className="text-xs text-gray-400">{subCat.count}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden sm:flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
            <SubCategoryFilterChip
              key="sub-all"
              active={filterSubCategory === 'all'}
              label="ทั้งหมด"
              count={currentCategoryProductCount}
              onClick={() => handleSubCategoryChange('all')}
            />
            {subCategoriesWithIcon.map((subCat) => (
              <SubCategoryFilterChip
                key={subCat.name}
                active={filterSubCategory === subCat.name}
                label={subCat.name}
                iconUrl={subCat.iconUrl}
                count={subCat.count}
                onClick={() => handleSubCategoryChange(subCat.name)}
              />
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

      {/* Products Grid / Subcategory Cards */}
      {displayMode === 'list' ? (
        filteredProducts.length === 0 ? (
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:hidden" suppressHydrationWarning>
              {paginatedProducts.map((product) => (
                <ProductCompactCard
                  key={`compact-${product.id}`}
                  product={product}
                  currencyFormatter={currencyFormatter}
                  onQuickBuy={onQuickBuy}
                />
              ))}
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6" suppressHydrationWarning>
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
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="border-gray-700 hover:bg-gray-800 text-white disabled:opacity-50"
                >
                  ถัดไป
                </Button>
              </div>
            )}
          </>
        )
      ) : (
        <div className="space-y-4">
          {subCategoryCardGroups.length === 0 ? (
            <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package className="size-6" />
                </EmptyMedia>
                <EmptyTitle>ยังไม่มีหมวดหมู่ย่อย</EmptyTitle>
                <EmptyDescription>
                  หมวดหมู่ย่อยจะปรากฏที่นี่เมื่อมีการเพิ่มแพ็กเกจที่ตรงเงื่อนไข
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:hidden">
                {subCategoryCardGroups.map((group) => (
                  <SubCategoryCompactCard
                    key={`sub-compact-${group.name}`}
                    group={group}
                    currencyFormatter={currencyFormatter}
                    onOpen={() => setSubCategoryModal({ name: group.name, iconUrl: group.iconUrl, products: group.products })}
                  />
                ))}
              </div>
              <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
                {subCategoryCardGroups.map((group) => (
                  <button
                    key={group.name}
                    type="button"
                    onClick={() => setSubCategoryModal({ name: group.name, iconUrl: group.iconUrl, products: group.products })}
                    className="flex w-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b0b0b] to-[#050505] p-4 text-left shadow-sm transition hover:border-emerald-500/60 hover:shadow-emerald-500/20 focus:outline-none"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                        {group.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={group.iconUrl}
                            alt={group.name}
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
                        <h3 className="text-lg font-semibold text-white">{group.name}</h3>
                        <div className="min-h-[0.5rem] text-xs text-gray-600">&nbsp;</div>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-gray-300">
                      <span>ราคาเริ่มต้น</span>
                      <span className="text-base font-semibold text-emerald-400">
                        {currencyFormatter.format(group.minPrice || 0)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {displayMode === 'cards' && (
        <Dialog
          open={!!subCategoryModal}
          onOpenChange={(open) => {
            if (!open) {
              setSubCategoryModal(null);
            }
          }}
        >
          {subCategoryModal && (
            <DialogContent className="max-w-4xl bg-[#050505] text-white">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    {subCategoryModal.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={subCategoryModal.iconUrl}
                        alt={subCategoryModal.name}
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package className="size-6 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-semibold">{subCategoryModal.name}</DialogTitle>
                    <DialogDescription className="text-sm text-gray-400">
                      เลือกแพ็กเกจที่ต้องการซื้อ หรือดูรายละเอียดเพิ่มเติม
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {sortedModalProducts.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-gray-400">
                  ยังไม่มีแพ็กเกจในหมวดนี้
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <Select
                    value={selectedSubCategoryProductId?.toString() ?? sortedModalProducts[0].id.toString()}
                    onValueChange={(value) => setSelectedSubCategoryProductId(Number(value))}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-white/15 bg-[#0b0b0b] text-white">
                      <SelectValue placeholder="เลือกแพ็กเกจ" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-[#050505] text-white">
                      {sortedModalProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 flex-shrink-0">
                                {product.icon_url || product.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={product.icon_url || product.image_url || ''}
                                    alt=""
                                    className="h-4 w-4 object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package className="size-3 text-emerald-400" />
                                )}
                              </div>
                              <span 
                                className="text-sm whitespace-nowrap overflow-hidden text-ellipsis" 
                                dangerouslySetInnerHTML={{ 
                                  __html: sanitizeForDropdown(product.display_name || '')
                                }} 
                              />
                            </div>
                            <span className="text-xs text-emerald-300">
                              {currencyFormatter.format(product.price)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(() => {
                    const selectedProduct =
                      sortedModalProducts.find((prod) => prod.id === selectedSubCategoryProductId) ??
                      sortedModalProducts[0];
                    return (
                      <SubCategoryPriceRow
                        key={selectedProduct.id}
                        product={selectedProduct}
                        currencyFormatter={currencyFormatter}
                        onQuickBuy={onQuickBuy}
                      />
                    );
                  })()}
                </div>
              )}
            </DialogContent>
          )}
        </Dialog>
      )}
    </div>
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
  const { openLoginDialog } = useAuthDialog();
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
                        
                        // Check if unauthorized
                        if (res.status === 401) {
                          const json = await res.json().catch(() => ({}));
                          if (json.error === 'unauthorized') {
                            // Open login dialog
                            openLoginDialog();
                            return;
                          }
                        }
                        
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
      <AppPremiumLayout
        products={products}
        onQuickBuy={setQuickBuyProduct}
        displayMode={displayMode}
      />
      <QuickBuyDialog product={quickBuyProduct} onClose={() => setQuickBuyProduct(null)} />
    </>
  );
}
