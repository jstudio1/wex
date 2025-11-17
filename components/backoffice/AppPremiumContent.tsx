'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner, SpinnerCustom } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Save, Search, Globe, Plus, Trash2, Package } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

// Client-side price calculation function
function computePrice(base: number, itemPct = 0, itemFix = 0, globalPct = 0, globalFix = 0) {
  const withItem = base * (1 + itemPct / 100) + itemFix;
  const withGlobal = withItem * (1 + globalPct / 100) + globalFix;
  return Math.max(0, withGlobal);
}

interface AppPremiumProduct {
  id: number;
  provider_product_id: number;
  name: string;
  display_name: string | null;
  base_price: number;
  markup_percent: number;
  markup_fixed: number;
  stock: number;
  image_url: string | null;
  description: string | null;
  is_published: boolean;
}

type DraftProduct = AppPremiumProduct & { __dirty?: boolean };
type ProductSnapshot = Pick<AppPremiumProduct, 'id' | 'display_name' | 'markup_percent' | 'markup_fixed' | 'is_published'>;

interface AppPremiumCategory {
  id: number;
  category: string;
  display_name: string | null;
  filter_keywords: string[];
  is_published: boolean;
  display_order: number;
  icon_url: string | null;
  __dirty?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB'
});

export default function AppPremiumContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [categories, setCategories] = useState<AppPremiumCategory[]>([]);
  const [savingProductIds, setSavingProductIds] = useState<Set<number>>(new Set());
  const [savingCategoryIds, setSavingCategoryIds] = useState<Set<number>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [categorySearchText, setCategorySearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const itemsPerPage = 50;
  const [globalMarkup, setGlobalMarkup] = useState({ percent: '0', fixed: '0' });
  const [loadingGlobalMarkup, setLoadingGlobalMarkup] = useState(true);
  const [savingGlobalMarkup, setSavingGlobalMarkup] = useState(false);
  const [globalMarkupStatus, setGlobalMarkupStatus] = useState<'ok' | 'error' | null>(null);

  const initialProductsRef = useRef<ProductSnapshot[]>([]);

  useEffect(() => {
    fetchData();
    fetchCategories();
    fetchGlobalMarkup();
  }, []);

  const fetchGlobalMarkup = async () => {
    try {
      const res = await fetch('/api/admin/global-markup', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setGlobalMarkup({
        percent: String(json.percent || 0),
        fixed: String(json.fixed || 0)
      });
    } catch (err) {
      console.error('Global markup fetch error:', err);
    } finally {
      setLoadingGlobalMarkup(false);
    }
  };

  const handleSaveGlobalMarkup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGlobalMarkup(true);
    setGlobalMarkupStatus(null);
    try {
      const res = await fetch('/api/admin/global-markup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percent: Number(globalMarkup.percent) || 0,
          fixed: Number(globalMarkup.fixed) || 0
        })
      });
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ');
      setGlobalMarkupStatus('ok');
      toast.show({ title: 'บันทึกการตั้งค่ากำไร สำเร็จ' });
      await fetchData(); // Refresh products to show new prices
    } catch (err) {
      setGlobalMarkupStatus('error');
      toast.show({ title: 'บันทึกไม่สำเร็จ', variant: 'destructive' });
    } finally {
      setSavingGlobalMarkup(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/app-premium/products');

      if (!res.ok) throw new Error('ไม่สามารถโหลดรายการสินค้าได้');

      const json = await res.json();
      const productsData = (json.data || []) as AppPremiumProduct[];

      initialProductsRef.current = productsData.map((prod) => ({
        id: prod.id,
        display_name: prod.display_name,
        markup_percent: prod.markup_percent,
        markup_fixed: prod.markup_fixed,
        is_published: prod.is_published
      }));

      setProducts(productsData);
    } catch (error) {
      console.error(error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลได้', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/app-premium/categories', { cache: 'no-store' });
      if (!res.ok) throw new Error('ไม่สามารถโหลดหมวดหมู่ได้');
      const json = await res.json();
      setCategories(json || []);
    } catch (error) {
      console.error(error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดหมวดหมู่ได้', variant: 'destructive' });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    setAddingCategory(true);
    try {
      const categoryName = newCategoryName.trim();
      const res = await fetch('/api/admin/app-premium/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: categoryName.toLowerCase(),
          display_name: categoryName,
          filter_keywords: [categoryName],
          is_published: true,
          display_order: categories.length
        })
      });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'สร้างไม่สำเร็จ');
      }
      
      toast.show({ title: 'สร้างหมวดหมู่สำเร็จ' });
      setShowAddCategoryDialog(false);
      setNewCategoryName('');
      await fetchCategories();
    } catch (error: any) {
      console.error(error);
      toast.show({ 
        title: 'สร้างไม่สำเร็จ', 
        description: error.message || 'เกิดข้อผิดพลาดในการสร้างหมวดหมู่', 
        variant: 'destructive' 
      });
    } finally {
      setAddingCategory(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const secret = process.env.NEXT_PUBLIC_WEBHOOK_SECRET || '';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const res = await fetch(`${siteUrl}/api/admin/app-premium/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ซิงก์ไม่สำเร็จ');
      toast.show({ title: 'ซิงก์สำเร็จ', description: `อัปเดต ${json.counts?.products || 0} รายการ` });
      await fetchData();
      await fetchGlobalMarkup();
    } catch (error) {
      console.error(error);
      toast.show({ title: 'ซิงก์ไม่สำเร็จ', description: 'ตรวจสอบ API key และลองใหม่', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const markProductDirty = (id: number, updater: (prod: DraftProduct) => DraftProduct) => {
    setProducts((prev) => prev.map((prod) => {
      if (prod.id !== id) return prod;
      const updated = updater(prod);
      return { ...updated, __dirty: true };
    }));
  };

  const handleSaveSelected = async () => {
    const idsToSave = products.filter((prod) => prod.__dirty).map((prod) => prod.id);
    
    if (idsToSave.length === 0) {
      toast.show({ title: 'ไม่มีการเปลี่ยนแปลง', description: 'ไม่มีข้อมูลที่ต้องบันทึก', variant: 'default' });
      return;
    }
    setSavingProductIds(new Set(idsToSave));

    let successCount = 0;
    let errorCount = 0;

    for (const id of idsToSave) {
      const current = products.find((prod) => prod.id === id);
      if (!current) {
        errorCount++;
        continue;
      }

      const initial = initialProductsRef.current.find((prod) => prod.id === id);
      if (!initial) {
        errorCount++;
        continue;
      }

      const payload: Record<string, unknown> = {};
      if (current.display_name !== initial.display_name) payload.display_name = current.display_name;
      if (current.markup_percent !== initial.markup_percent) payload.markup_percent = Number(current.markup_percent) || 0;
      if (current.markup_fixed !== initial.markup_fixed) payload.markup_fixed = Number(current.markup_fixed) || 0;
      if (current.is_published !== initial.is_published) payload.is_published = current.is_published;

      if (!Object.keys(payload).length) {
        continue;
      }

      try {
        const res = await fetch(`/api/admin/app-premium/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

        initialProductsRef.current = initialProductsRef.current.map((prod) =>
          prod.id === id
            ? {
                id,
                display_name: current.display_name,
                markup_percent: Number(current.markup_percent) || 0,
                markup_fixed: Number(current.markup_fixed) || 0,
                is_published: current.is_published
              }
            : prod
        );

        setProducts((prev) => prev.map((prod) => (prod.id === id ? { ...prod, __dirty: false } : prod)));
        successCount++;
      } catch (error) {
        console.error(error);
        errorCount++;
      }
    }

    setSavingProductIds(new Set());

    if (errorCount > 0) {
      toast.show({
        title: `บันทึกสำเร็จ ${successCount} รายการ`,
        description: `มี ${errorCount} รายการที่บันทึกไม่สำเร็จ`,
        variant: errorCount === idsToSave.length ? 'destructive' : 'default'
      });
    } else {
      toast.show({ title: `บันทึกสำเร็จ ${successCount} รายการ` });
    }
  };

  const handlePublishAll = async () => {
    const unpublishedProducts = products.filter((prod) => !prod.is_published);
    if (unpublishedProducts.length === 0) {
      toast.show({ title: 'ไม่มีการเปลี่ยนแปลง', description: 'สินค้าทั้งหมดถูกเผยแพร่แล้ว', variant: 'default' });
      return;
    }

    if (!confirm(`ต้องการเผยแพร่สินค้าทั้งหมด ${unpublishedProducts.length} รายการหรือไม่?`)) {
      return;
    }

    setSavingProductIds(new Set(unpublishedProducts.map((prod) => prod.id)));

    let successCount = 0;
    let errorCount = 0;

    for (const prod of unpublishedProducts) {
      try {
        const res = await fetch(`/api/admin/app-premium/products/${prod.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_published: true })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

        initialProductsRef.current = initialProductsRef.current.map((item) =>
          item.id === prod.id ? { ...item, is_published: true } : item
        );

        setProducts((prev) => prev.map((item) => (item.id === prod.id ? { ...item, is_published: true, __dirty: false } : item)));
        successCount++;
      } catch (error) {
        console.error(error);
        errorCount++;
      }
    }

    setSavingProductIds(new Set());

    if (errorCount > 0) {
      toast.show({
        title: `เผยแพร่สำเร็จ ${successCount} รายการ`,
        description: `มี ${errorCount} รายการที่เผยแพร่ไม่สำเร็จ`,
        variant: errorCount === unpublishedProducts.length ? 'destructive' : 'default'
      });
    } else {
      toast.show({ title: `เผยแพร่สำเร็จ ${successCount} รายการ` });
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const text = filterText.trim().toLowerCase();
      const matchText = !text || [prod.name, prod.display_name, prod.provider_product_id.toString()].some((v) => v?.toLowerCase().includes(text));
      return matchText;
    });
  }, [products, filterText]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterText]);

  const calculateFinalPrice = (basePrice: number, markupPercent: number, markupFixed: number) => {
    return computePrice(basePrice, markupPercent, markupFixed, Number(globalMarkup.percent) || 0, Number(globalMarkup.fixed) || 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="card p-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </section>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Skeleton className="h-6 w-48" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-9 w-16" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">ซิงก์สินค้าแอพพรีเมี่ยม</h2>
            <p className="text-sm text-[color:var(--text)]/60">ดึงข้อมูลล่าสุดจาก Peamsub API</p>
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
            {syncing ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
            {syncing ? 'กำลังซิงก์...' : 'ซิงก์จากผู้ให้บริการ'}
          </Button>
        </div>
      </section>

      <section className="card p-4 space-y-4">
        <h2 className="text-lg font-semibold mb-2">ตั้งค่ากำไร สำหรับทุกสินค้าแอพพรีเมี่ยม</h2>
        {globalMarkupStatus === 'ok' && (
          <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
            บันทึกการตั้งค่ากำไร สำเร็จ
          </div>
        )}
        {globalMarkupStatus === 'error' && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
            บันทึกไม่สำเร็จ โปรดลองใหม่
          </div>
        )}
        <form onSubmit={handleSaveGlobalMarkup} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="global-markup-percent">กำไร (%)</Label>
              <Input
                id="global-markup-percent"
                type="number"
                step="0.1"
                value={globalMarkup.percent}
                onChange={(e) => setGlobalMarkup({ ...globalMarkup, percent: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-[color:var(--text)]/50">กำไรเป็นเปอร์เซ็นต์ที่บวกเข้ากับราคาทุกสินค้า</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="global-markup-fixed">กำไร (บาท)</Label>
              <Input
                id="global-markup-fixed"
                type="number"
                step="0.01"
                value={globalMarkup.fixed}
                onChange={(e) => setGlobalMarkup({ ...globalMarkup, fixed: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-[color:var(--text)]/50">กำไรคงที่ที่บวกเข้ากับราคาทุกสินค้า (บาท)</p>
            </div>
          </div>
          <Button type="submit" disabled={savingGlobalMarkup} className="gap-2">
            {savingGlobalMarkup ? (
              <>
                <Spinner className="size-4" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="size-4" />
                บันทึกการตั้งค่ากำไร 
              </>
            )}
          </Button>
          <p className="text-xs text-[color:var(--text)]/50">หมายเหตุ: การตั้งค่านี้จะถูกบวกเข้ากับราคาทุกสินค้าแอพพรีเมี่ยม (หลังจากบวกกำไรของแต่ละสินค้าแล้ว)</p>
        </form>
      </section>

      {/* Tabs for Products and Categories */}
      <section className="card p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'products' | 'categories')}>
          <TabsList>
            <TabsTrigger value="products">
              จัดการสินค้า
            </TabsTrigger>
            <TabsTrigger value="categories">
              จัดการหมวดหมู่
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4">
            <div className="space-y-4">
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold">จัดการสินค้าแอพพรีเมี่ยม</h2>
            <p className="text-sm text-[color:var(--text)]/60">ปรับแต่งชื่อแสดงและกำไร ก่อนเผยแพร่ขึ้นหน้าเว็บ</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {totalPages > 1 && (
              <div className="text-sm text-[color:var(--text)]/70">
                หน้า {currentPage} / {totalPages}
              </div>
            )}
            <Button
              onClick={handlePublishAll}
              disabled={savingProductIds.size > 0 || products.filter((prod) => !prod.is_published).length === 0}
              variant="outline"
              className="gap-2"
            >
              {savingProductIds.size > 0 && products.filter((prod) => !prod.is_published && savingProductIds.has(prod.id)).length > 0 ? (
                <>
                  <Spinner className="size-4" />
                  กำลังเผยแพร่...
                </>
              ) : (
                <>
                  <Globe className="size-4" />
                  เผยแพร่สินค้าทั้งหมด ({products.filter((prod) => !prod.is_published).length})
                </>
              )}
            </Button>
            <Button
              onClick={handleSaveSelected}
              disabled={savingProductIds.size > 0 || products.filter((prod) => prod.__dirty).length === 0}
              className="gap-2"
            >
              {savingProductIds.size > 0 ? (
                <>
                  <Spinner className="size-4" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  บันทึกทั้งหมด ({products.filter((prod) => prod.__dirty).length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="search-products">ค้นหาสินค้า</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--text)]/40" />
            <Input
              id="search-products"
              placeholder="ค้นหาจากชื่อสินค้าหรือ ID"
              className="pl-9"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 max-h-[calc(100vh-450px)] overflow-y-auto overflow-x-hidden pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
          {paginatedProducts.map((prod) => {
            const basePrice = currencyFormatter.format(prod.base_price || 0);
            const finalPrice = calculateFinalPrice(prod.base_price, prod.markup_percent, prod.markup_fixed);
            const finalPriceFormatted = currencyFormatter.format(finalPrice);
            return (
              <div key={prod.id} className={`rounded-lg border p-4 space-y-4 transition-colors ${prod.__dirty ? 'border-accent/50 bg-accent/5' : 'border-white/10 bg-white/5'}`}>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-[color:var(--text)]/60">Product ID #{prod.provider_product_id}</div>
                      <h4 className="text-lg font-semibold">{prod.name}</h4>
                      {prod.description && (
                        <div className="text-xs text-[color:var(--text)]/40 mt-1">{prod.description}</div>
                      )}
                    </div>
                    <div className="text-right text-sm text-[color:var(--text)]/70">
                      <div>ราคาต้นทุน: {basePrice}</div>
                      <div className="text-accent font-semibold">ราคาสุดท้าย: {finalPriceFormatted}</div>
                      <div>คงเหลือ: {prod.stock || 0} ชิ้น</div>
                    </div>
                  </div>

                  {prod.image_url && (
                    <div className="flex items-center gap-2">
                      <img src={prod.image_url} alt={prod.name} className="h-20 w-20 rounded object-cover" />
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>ชื่อแสดง (หน้าเว็บ)</Label>
                      <Input value={prod.display_name ?? ''} onChange={(e) => markProductDirty(prod.id, (prev) => ({ ...prev, display_name: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>กำไร (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={prod.markup_percent}
                        onChange={(e) => markProductDirty(prod.id, (prev) => ({ ...prev, markup_percent: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>กำไรคงที่ (บาท)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={prod.markup_fixed}
                        onChange={(e) => markProductDirty(prod.id, (prev) => ({ ...prev, markup_fixed: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-white/10 px-3">
                      <div>
                        <Label className="text-xs text-[color:var(--text)]/60">เผยแพร่</Label>
                        <div className="text-sm font-medium">{prod.is_published ? 'เปิดขาย' : 'ซ่อนอยู่'}</div>
                      </div>
                      <Switch checked={prod.is_published} onCheckedChange={(checked) => markProductDirty(prod.id, (prev) => ({ ...prev, is_published: checked }))} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {paginatedProducts.length === 0 && (
            <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package className="size-6" />
                </EmptyMedia>
                <EmptyTitle>ไม่พบสินค้าที่ตรงกับเงื่อนไข</EmptyTitle>
                <EmptyDescription>
                  ลองค้นหาด้วยคำอื่น หรือปรับเงื่อนไขการกรอง
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/10">
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
      </section>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">จัดการหมวดหมู่</h2>
                  <p className="text-sm text-[color:var(--text)]/60">ตั้งค่าหมวดหมู่ที่จะแสดงเป็นปุ่มกรองบนหน้าเว็บ</p>
                </div>
                <Button
                  onClick={() => {
                    setNewCategoryName('');
                    setShowAddCategoryDialog(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="size-4" />
                  เพิ่มหมวดหมู่
                </Button>
              </div>
              
              {/* Search Input */}
              <div className="space-y-2">
                <Label htmlFor="search-categories">ค้นหาหมวดหมู่</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--text)]/40" />
                  <Input
                    id="search-categories"
                    placeholder="ค้นหาจากชื่อหมวดหมู่หรือ Category"
                    className="pl-9"
                    value={categorySearchText}
                    onChange={(e) => setCategorySearchText(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                {categories
                  .filter((category) => {
                    if (!categorySearchText.trim()) return true;
                    const searchLower = categorySearchText.trim().toLowerCase();
                    const displayName = (category.display_name || '').toLowerCase();
                    const categoryName = category.category.toLowerCase();
                    return displayName.includes(searchLower) || categoryName.includes(searchLower);
                  })
                  .map((category) => (
                  <div key={category.id} className="space-y-3 p-4 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[color:var(--text)]">{category.display_name || category.category}</div>
                        <div className="text-xs text-[color:var(--text)]/50 mt-1">Category: {category.category}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!confirm(`ต้องการลบหมวดหมู่ "${category.display_name || category.category}" หรือไม่?`)) return;
                          try {
                            const res = await fetch(`/api/admin/app-premium/categories?id=${category.id}`, {
                              method: 'DELETE'
                            });
                            if (!res.ok) throw new Error('ลบไม่สำเร็จ');
                            toast.show({ title: 'ลบหมวดหมู่สำเร็จ' });
                            await fetchCategories();
                          } catch (error) {
                            console.error(error);
                            toast.show({ title: 'ลบไม่สำเร็จ', variant: 'destructive' });
                          }
                        }}
                        className="gap-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="size-4" />
                        ลบ
                      </Button>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`cat-display-${category.id}`} className="text-sm">ชื่อแสดงผล:</Label>
                        <Input
                          id={`cat-display-${category.id}`}
                          type="text"
                          value={category.display_name || ''}
                          onChange={(e) => {
                            setCategories((prev) =>
                              prev.map((cat) =>
                                cat.id === category.id ? { ...cat, display_name: e.target.value, __dirty: true } : cat
                              )
                            );
                          }}
                          placeholder={category.category}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`cat-order-${category.id}`} className="text-sm">ลำดับการแสดง:</Label>
                        <Input
                          id={`cat-order-${category.id}`}
                          type="number"
                          value={category.display_order || 0}
                          onChange={(e) => {
                            setCategories((prev) =>
                              prev.map((cat) =>
                                cat.id === category.id ? { ...cat, display_order: Number(e.target.value) || 0, __dirty: true } : cat
                              )
                            );
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`cat-icon-${category.id}`} className="text-sm">URL รูป Icon:</Label>
                      <Input
                        id={`cat-icon-${category.id}`}
                        type="url"
                        value={category.icon_url || ''}
                        onChange={(e) => {
                          setCategories((prev) =>
                            prev.map((cat) =>
                              cat.id === category.id ? { ...cat, icon_url: e.target.value || null, __dirty: true } : cat
                            )
                          );
                        }}
                        placeholder="https://example.com/icon.png"
                      />
                      <p className="text-xs text-[color:var(--text)]/50">URL รูป icon ที่จะแสดงบนปุ่มกรอง</p>
                      {category.icon_url && (
                        <div className="mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={category.icon_url} 
                            alt="Icon preview" 
                            className="w-12 h-12 object-contain rounded border border-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`cat-keywords-${category.id}`} className="text-sm">คำค้นหา (คั่นด้วยจุลภาค):</Label>
                      <Input
                        id={`cat-keywords-${category.id}`}
                        type="text"
                        value={(category.filter_keywords || []).join(', ')}
                        onChange={(e) => {
                          const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0);
                          setCategories((prev) =>
                            prev.map((cat) =>
                              cat.id === category.id ? { ...cat, filter_keywords: keywords, __dirty: true } : cat
                            )
                          );
                        }}
                        placeholder="Netflix, NF, น็อกซ์"
                      />
                      <p className="text-xs text-[color:var(--text)]/50">คำที่ใช้กรองสินค้า (เช่น Netflix, NF) คั่นด้วยจุลภาค</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`cat-publish-${category.id}`} className="text-sm whitespace-nowrap">เผยแพร่:</Label>
                        <Switch
                          id={`cat-publish-${category.id}`}
                          checked={category.is_published}
                          onCheckedChange={(checked) => {
                            setCategories((prev) =>
                              prev.map((cat) =>
                                cat.id === category.id ? { ...cat, is_published: checked, __dirty: true } : cat
                              )
                            );
                          }}
                        />
                      </div>
                      {savingCategoryIds.has(category.id) ? (
                        <Spinner className="size-4" />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const updated = categories.find((cat) => cat.id === category.id);
                            if (!updated) return;

                            setSavingCategoryIds((prev) => new Set(prev).add(category.id));
                            try {
                              const res = await fetch('/api/admin/app-premium/categories', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  id: category.id,
                                  display_name: updated.display_name || null,
                                  filter_keywords: updated.filter_keywords || [],
                                  is_published: updated.is_published,
                                  display_order: updated.display_order || 0,
                                  icon_url: updated.icon_url || null
                                })
                              });
                              const json = await res.json();
                              if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

                              setCategories((prev) =>
                                prev.map((cat) => (cat.id === category.id ? { ...updated, __dirty: false } : cat))
                              );
                              toast.show({ title: 'บันทึกสำเร็จ', description: `อัปเดตหมวดหมู่ ${updated.display_name || updated.category}` });
                            } catch (error: any) {
                              console.error(error);
                              toast.show({ title: 'บันทึกไม่สำเร็จ', description: error.message, variant: 'destructive' });
                            } finally {
                              setSavingCategoryIds((prev) => {
                                const next = new Set(prev);
                                next.delete(category.id);
                                return next;
                              });
                            }
                          }}
                          disabled={!categories.find((cat) => cat.id === category.id)?.__dirty}
                        >
                          <Save className="size-4" />
                          บันทึก
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {categories.length === 0 && (
                  <div className="text-center text-[color:var(--text)]/60 py-10">ยังไม่มีหมวดหมู่</div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มหมวดหมู่ใหม่</DialogTitle>
            <DialogDescription>
              กรุณาใส่ชื่อหมวดหมู่ (เช่น: netflix, disney) ชื่อนี้จะถูกใช้เป็น category key
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">ชื่อหมวดหมู่</Label>
              <Input
                id="new-category-name"
                placeholder="netflix, disney, bilibili"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    handleAddCategory();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-[color:var(--text)]/50">
                ชื่อหมวดหมู่จะถูกแปลงเป็นตัวพิมพ์เล็กและใช้เป็น category key
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCategoryDialog(false);
                setNewCategoryName('');
              }}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim() || addingCategory}
            >
              {addingCategory ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <Plus className="size-4 mr-2" />
                  สร้างหมวดหมู่
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

