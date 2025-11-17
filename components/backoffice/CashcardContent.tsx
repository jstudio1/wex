'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Save, Search, Globe, CreditCard } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

interface CashcardProduct {
  id: number;
  provider_product_id: number;
  category: string | null;
  name: string;
  display_name: string | null;
  base_price: number;
  recommended_price: number | null;
  discount: number | null;
  markup_percent: number;
  markup_fixed: number;
  image_url: string | null;
  info: string | null;
  format_id: string | null;
  is_published: boolean;
}

type DraftProduct = CashcardProduct & { __dirty?: boolean };
type ProductSnapshot = Pick<CashcardProduct, 'id' | 'display_name' | 'markup_percent' | 'markup_fixed' | 'is_published'>;

interface CashcardCategory {
  id: number;
  category: string;
  display_name: string | null;
  image_url: string | null;
  is_published: boolean;
  __dirty?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB'
});

export default function CashcardContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [categories, setCategories] = useState<CashcardCategory[]>([]);
  const [savingProductIds, setSavingProductIds] = useState<Set<number>>(new Set());
  const [savingCategoryIds, setSavingCategoryIds] = useState<Set<number>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const itemsPerPage = 50;
  const [globalMarkup, setGlobalMarkup] = useState({ percent: '0', fixed: '0' });
  const [loadingGlobalMarkup, setLoadingGlobalMarkup] = useState(true);
  const [savingGlobalMarkup, setSavingGlobalMarkup] = useState(false);
  const [globalMarkupStatus, setGlobalMarkupStatus] = useState<'ok' | 'error' | null>(null);

  const initialProductsRef = useRef<ProductSnapshot[]>([]);

  useEffect(() => {
    fetchData();
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
      await fetchData();
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
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/cashcard/products'),
        fetch('/api/admin/cashcard/categories')
      ]);

      if (!productsRes.ok) throw new Error('ไม่สามารถโหลดรายการสินค้าได้');
      if (!categoriesRes.ok) throw new Error('ไม่สามารถโหลดหมวดหมู่ได้');

      const productsJson = await productsRes.json();
      const categoriesJson = await categoriesRes.json();

      const productsData = (productsJson.data || []) as CashcardProduct[];
      const categoriesData = (categoriesJson.data || []) as CashcardCategory[];

      initialProductsRef.current = productsData.map((prod) => ({
        id: prod.id,
        display_name: prod.display_name,
        markup_percent: prod.markup_percent,
        markup_fixed: prod.markup_fixed,
        is_published: prod.is_published
      }));

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลได้', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const secret = process.env.NEXT_PUBLIC_WEBHOOK_SECRET || '';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const res = await fetch(`${siteUrl}/api/admin/cashcard/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ซิงก์ไม่สำเร็จ');
      toast.show({ title: 'ซิงก์สำเร็จ', description: `อัปเดต ${json.upserted || 0} รายการ` });
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
        const res = await fetch(`/api/admin/cashcard/products/${id}`, {
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
        const res = await fetch(`/api/admin/cashcard/products/${prod.id}`, {
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
      const matchText = !text || [
        prod.name, 
        prod.display_name, 
        prod.category,
        prod.provider_product_id.toString()
      ].some((v) => v?.toLowerCase().includes(text));
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
            <h2 className="text-lg font-semibold">ซิงก์สินค้าบัตรเติมเงิน</h2>
            <p className="text-sm text-[color:var(--text)]/60">ดึงข้อมูลล่าสุดจาก Peamsub API</p>
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
            {syncing ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
            {syncing ? 'กำลังซิงก์...' : 'ซิงก์จากผู้ให้บริการ'}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="search-products">ค้นหาสินค้า</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--text)]/40" />
              <Input
                id="search-products"
                placeholder="ค้นหาจากชื่อสินค้า, หมวดหมู่ หรือ ID"
                className="pl-9"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card p-4 space-y-4">
        <h2 className="text-lg font-semibold mb-2">ตั้งค่ากำไร สำหรับทุกสินค้าบัตรเติมเงิน</h2>
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
          <Button type="submit" disabled={savingGlobalMarkup} className="gap-2 text-white">
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
          <p className="text-xs text-[color:var(--text)]/50">หมายเหตุ: การตั้งค่านี้จะถูกบวกเข้ากับราคาทุกสินค้าบัตรเติมเงิน (หลังจากบวกกำไรของแต่ละสินค้าแล้ว)</p>
        </form>
      </section>

      {/* Tabs for Products and Categories */}
      <section className="card p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'products' | 'categories')}>
          <TabsList>
            <TabsTrigger value="products" active={activeTab === 'products'}>
              จัดการสินค้า
            </TabsTrigger>
            <TabsTrigger value="categories" active={activeTab === 'categories'}>
              จัดการหมวดหมู่บัตรเติมเงิน
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" active={activeTab === 'products'} className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-semibold">จัดการสินค้าบัตรเติมเงิน</h2>
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
              className="gap-2 text-white"
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

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search-products-tab">ค้นหาสินค้า</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--text)]/40" />
            <Input
              id="search-products-tab"
              placeholder="ค้นหาจากชื่อสินค้า, หมวดหมู่ หรือ ID"
              className="pl-9"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 max-h-[calc(100vh-450px)] overflow-y-auto overflow-x-hidden pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.15) transparent' }}>
          {paginatedProducts.map((prod) => {
            const basePrice = currencyFormatter.format(prod.base_price || 0);
            const finalPrice = calculateFinalPrice(prod.base_price, prod.markup_percent, prod.markup_fixed);
            const finalPriceFormatted = currencyFormatter.format(finalPrice);
            return (
              <div key={prod.id} className={`rounded-lg border p-4 space-y-4 transition-colors ${prod.__dirty ? 'border-accent/50 bg-accent/5' : 'border-border bg-muted/50'}`}>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-[color:var(--text)]/60">
                        Product ID #{prod.provider_product_id}
                        {prod.category && ` • ${prod.category}`}
                      </div>
                      <h4 className="text-lg font-semibold">{prod.name}</h4>
                      {prod.info && (
                        <div className="text-xs text-[color:var(--text)]/40 mt-1">{prod.info}</div>
                      )}
                    </div>
                    <div className="text-right text-sm text-[color:var(--text)]/70">
                      <div>ราคาต้นทุน: {basePrice}</div>
                      {prod.recommended_price && (
                        <div>ราคาที่แนะนำ: {currencyFormatter.format(prod.recommended_price)}</div>
                      )}
                      {prod.discount && (
                        <div>ส่วนลด: {currencyFormatter.format(prod.discount)}</div>
                      )}
                      <div className="text-accent font-semibold">ราคาสุดท้าย: {finalPriceFormatted}</div>
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
                    <div className="flex items-center justify-between rounded-lg border border-border px-3">
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
                  <CreditCard className="size-6" />
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
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-border">
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
            </div>
          </TabsContent>

          <TabsContent value="categories" active={activeTab === 'categories'} className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">จัดการหมวดหมู่</h2>
                  <p className="text-sm text-[color:var(--text)]/60">เปิด/ปิด และตั้งชื่อแสดงผลของหมวดหมู่</p>
                </div>
              </div>
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.id} className="space-y-3 p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[color:var(--text)]">{category.display_name || category.category}</div>
                        <div className="text-xs text-[color:var(--text)]/50 mt-1">Category: {category.category}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-[200px] space-y-2">
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
                      <div className="flex-1 min-w-[200px] space-y-2">
                        <Label htmlFor={`cat-image-${category.id}`} className="text-sm">URL รูปภาพ:</Label>
                        <Input
                          id={`cat-image-${category.id}`}
                          type="url"
                          value={category.image_url || ''}
                          onChange={(e) => {
                            setCategories((prev) =>
                              prev.map((cat) =>
                                cat.id === category.id ? { ...cat, image_url: e.target.value || null, __dirty: true } : cat
                              )
                            );
                          }}
                          placeholder="https://example.com/image.jpg"
                        />
                        {category.image_url && (
                          <div className="mt-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={category.image_url} 
                              alt="Preview" 
                              className="w-20 h-20 object-cover rounded border border-border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
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
                              const res = await fetch('/api/admin/cashcard/categories', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  id: category.id,
                                  display_name: updated.display_name || null,
                                  image_url: updated.image_url || null,
                                  is_published: updated.is_published
                                })
                              });
                              const json = await res.json();
                              if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

                              setCategories((prev) =>
                                prev.map((cat) => (cat.id === category.id ? { ...updated, __dirty: false } : cat))
                              );
                              toast.show({ title: 'บันทึกสำเร็จ', description: `อัปเดตหมวดหมู่ ${updated.display_name || updated.category}` });
                            } catch (error) {
                              console.error(error);
                              toast.show({ title: 'บันทึกไม่สำเร็จ', variant: 'destructive' });
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
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="text-center py-8 text-[color:var(--text)]/60">
                    ยังไม่มีหมวดหมู่ กรุณาซิงก์สินค้าก่อน
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

