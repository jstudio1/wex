'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner, SpinnerCustom } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Save, Search, Globe, Plus, Trash2, Package, Edit, X, Eye, EyeOff } from 'lucide-react';
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
  show_on_homepage: boolean;
  app_category: string | null;
  sub_category: string | null;
}

type DraftProduct = AppPremiumProduct & { __dirty?: boolean };
type ProductSnapshot = Pick<AppPremiumProduct, 'id' | 'display_name' | 'markup_percent' | 'markup_fixed' | 'is_published' | 'show_on_homepage'>;

interface AppPremiumCategory {
  id: number;
  category: string;
  display_name: string | null;
  filter_keywords: string[];
  is_published: boolean;
  display_order: number;
  icon_url: string | null;
  card_image_url: string | null;
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
  const [categoryKeywordsInput, setCategoryKeywordsInput] = useState<Record<number, string>>({});
  const [editingSubCategory, setEditingSubCategory] = useState<{ categoryId: number; oldValue: string; newValue: string } | null>(null);
  const itemsPerPage = 50;
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [editingProduct, setEditingProduct] = useState<DraftProduct | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
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
        is_published: prod.is_published,
        show_on_homepage: prod.show_on_homepage
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
      // Initialize keywords input state
      const keywordsMap: Record<number, string> = {};
      (json || []).forEach((cat: AppPremiumCategory) => {
        keywordsMap[cat.id] = (cat.filter_keywords || []).join(', ');
      });
      setCategoryKeywordsInput(keywordsMap);
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
      if (current.show_on_homepage !== initial.show_on_homepage) payload.show_on_homepage = current.show_on_homepage;

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
                is_published: current.is_published,
                show_on_homepage: current.show_on_homepage
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
      const matchText = !text || [
        prod.name, 
        prod.display_name, 
        prod.provider_product_id.toString(),
        prod.app_category,
        prod.sub_category
      ].some((v) => v?.toLowerCase().includes(text));
      
      const matchCategory = selectedCategoryFilter === 'all' || prod.app_category?.toLowerCase() === selectedCategoryFilter.toLowerCase();
      
      const matchStatus = selectedStatusFilter === 'all' 
        ? true 
        : selectedStatusFilter === 'published' 
        ? prod.is_published 
        : !prod.is_published;
      
      return matchText && matchCategory && matchStatus;
    });
  }, [products, filterText, selectedCategoryFilter, selectedStatusFilter]);

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
  }, [filterText, selectedCategoryFilter, selectedStatusFilter]);

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    
    setSavingProduct(true);
    try {
      const initial = initialProductsRef.current.find((p) => p.id === editingProduct.id);
      if (!initial) throw new Error('ไม่พบข้อมูลเริ่มต้น');

      const payload: Record<string, unknown> = {};
      if (editingProduct.display_name !== initial.display_name) payload.display_name = editingProduct.display_name;
      if (editingProduct.markup_percent !== initial.markup_percent) payload.markup_percent = Number(editingProduct.markup_percent) || 0;
      if (editingProduct.markup_fixed !== initial.markup_fixed) payload.markup_fixed = Number(editingProduct.markup_fixed) || 0;
      if (editingProduct.is_published !== initial.is_published) payload.is_published = editingProduct.is_published;
      if (editingProduct.show_on_homepage !== initial.show_on_homepage) payload.show_on_homepage = editingProduct.show_on_homepage;

      if (Object.keys(payload).length === 0) {
        setEditingProduct(null);
        return;
      }

      const res = await fetch(`/api/admin/app-premium/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

      initialProductsRef.current = initialProductsRef.current.map((prod) =>
        prod.id === editingProduct.id
          ? {
              id: editingProduct.id,
              display_name: editingProduct.display_name,
              markup_percent: Number(editingProduct.markup_percent) || 0,
              markup_fixed: Number(editingProduct.markup_fixed) || 0,
              is_published: editingProduct.is_published,
              show_on_homepage: editingProduct.show_on_homepage
            }
          : prod
      );

      setProducts((prev) => prev.map((prod) => (prod.id === editingProduct.id ? { ...editingProduct, __dirty: false } : prod)));
      setEditingProduct(null);
      toast.show({ title: 'บันทึกสำเร็จ' });
    } catch (error: any) {
      console.error(error);
      toast.show({ title: 'บันทึกไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleTogglePublish = async (productId: number, newStatus: boolean) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setSavingProductIds((prev) => new Set(prev).add(productId));
    try {
      const res = await fetch(`/api/admin/app-premium/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: newStatus })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

      initialProductsRef.current = initialProductsRef.current.map((prod) =>
        prod.id === productId ? { ...prod, is_published: newStatus } : prod
      );

      setProducts((prev) => prev.map((prod) => (prod.id === productId ? { ...prod, is_published: newStatus, __dirty: false } : prod)));
      toast.show({ title: newStatus ? 'เปิดขายแล้ว' : 'ปิดขายแล้ว' });
    } catch (error: any) {
      console.error(error);
      toast.show({ title: 'บันทึกไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } finally {
      setSavingProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const uniqueCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.app_category).filter(Boolean))) as string[];
    return cats.sort();
  }, [products]);

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
            <p className="text-sm text-[color:var(--text)]/60">คลิกที่ card เพื่อแก้ไขสินค้า</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="search-products">ค้นหาสินค้า</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--text)]/40" />
            <Input
              id="search-products"
                placeholder="ค้นหาจากชื่อสินค้า, ID, หมวดหมู่"
              className="pl-9"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>

          <div className="space-y-2">
            <Label htmlFor="category-filter">หมวดหมู่</Label>
            <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
              <SelectTrigger id="category-filter" className="w-full">
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {uniqueCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-filter">สถานะ</Label>
            <Select 
              value={selectedStatusFilter} 
              onValueChange={(v) => setSelectedStatusFilter(v as 'all' | 'published' | 'unpublished')}
            >
              <SelectTrigger id="status-filter" className="w-full">
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="published">เปิดใช้งาน</SelectItem>
                <SelectItem value="unpublished">ปิดใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {paginatedProducts.map((prod) => {
            const basePrice = currencyFormatter.format(prod.base_price || 0);
            const finalPrice = calculateFinalPrice(prod.base_price, prod.markup_percent, prod.markup_fixed);
            const finalPriceFormatted = currencyFormatter.format(finalPrice);
            const isSaving = savingProductIds.has(prod.id);
            
            return (
              <div
                key={prod.id}
                className="group relative bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] border border-gray-800/50 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 cursor-pointer"
                onClick={() => setEditingProduct(prod)}
              >
                {/* Status Badge */}
                <div className="absolute top-2 right-2 z-10">
                  {prod.is_published ? (
                    <div className="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-medium flex items-center gap-1">
                      <Eye className="size-3" />
                      เปิดขาย
                    </div>
                  ) : (
                    <div className="px-2 py-1 rounded-md bg-gray-500/20 border border-gray-500/50 text-gray-400 text-xs font-medium flex items-center gap-1">
                      <EyeOff className="size-3" />
                      ปิดขาย
                    </div>
                  )}
                  </div>

                {/* Image */}
                  {prod.image_url && (
                  <div className="aspect-square w-full bg-gray-900/50 flex items-center justify-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={prod.image_url} 
                      alt={prod.display_name || prod.name} 
                      className="w-full h-full object-contain"
                      suppressHydrationWarning
                    />
                    </div>
                  )}

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">ID: {prod.provider_product_id}</div>
                    <h4 
                      className="text-sm font-semibold text-white line-clamp-2 min-h-[2.5rem]"
                      dangerouslySetInnerHTML={{ __html: prod.display_name || prod.name || '' }}
                      suppressHydrationWarning
                    />
                    {prod.app_category && (
                      <div className="text-xs text-gray-400 mt-1">{prod.app_category}</div>
                    )}
                  </div>

                  <div className="space-y-1 pt-2 border-t border-gray-800">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">ต้นทุน:</span>
                      <span className="text-gray-400">{basePrice}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">ราคาขาย:</span>
                      <span className="text-emerald-400 font-semibold">{finalPriceFormatted}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">คงเหลือ:</span>
                      <span className="text-gray-400">{prod.stock || 0} ชิ้น</span>
                      </div>
                      </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-800">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(prod);
                      }}
                    >
                      <Edit className="size-3 mr-1" />
                      แก้ไข
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={isSaving}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePublish(prod.id, !prod.is_published);
                      }}
                    >
                      {isSaving ? (
                        <Spinner className="size-3" />
                      ) : prod.is_published ? (
                        <EyeOff className="size-3" />
                      ) : (
                        <Eye className="size-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

        </div>

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
                  <div key={category.id} className="space-y-3 p-4 rounded-lg border border-border">
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
                    
                    <div className="grid gap-3 md:grid-cols-2">
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
                              className="w-12 h-12 object-contain rounded border border-border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`cat-card-${category.id}`} className="text-sm">URL รูปการ์ดหน้าแรก:</Label>
                        <Input
                          id={`cat-card-${category.id}`}
                          type="url"
                          value={category.card_image_url || ''}
                          onChange={(e) => {
                            setCategories((prev) =>
                              prev.map((cat) =>
                                cat.id === category.id ? { ...cat, card_image_url: e.target.value || null, __dirty: true } : cat
                              )
                            );
                          }}
                          placeholder="https://example.com/card.jpg"
                        />
                        <p className="text-xs text-[color:var(--text)]/50">URL รูปการ์ดที่จะแสดงบนหน้าแรก</p>
                        {category.card_image_url && (
                          <div className="mt-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={category.card_image_url} 
                              alt="Card preview" 
                              className="w-20 h-20 object-cover rounded border border-border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`cat-keywords-${category.id}`} className="text-sm">คำค้นหา (คั่นด้วยจุลภาค):</Label>
                      <Input
                        id={`cat-keywords-${category.id}`}
                        type="text"
                        value={categoryKeywordsInput[category.id] ?? (category.filter_keywords || []).join(', ')}
                        onChange={(e) => {
                          const rawValue = e.target.value;
                          
                          // Update input state immediately to preserve spaces
                          setCategoryKeywordsInput((prev) => ({
                            ...prev,
                            [category.id]: rawValue
                          }));
                          
                          // Split by comma but preserve spaces within keywords
                          // Only trim leading/trailing spaces, keep spaces within words
                          // Example: "Netflix Premium, NF, น็อกซ์" -> ["Netflix Premium", "NF", "น็อกซ์"]
                          const keywords = rawValue
                            .split(',')
                            .map(k => {
                              // Trim only leading and trailing spaces, preserve internal spaces
                              return k.replace(/^\s+|\s+$/g, '');
                            })
                            .filter(k => k.length > 0);
                          
                          setCategories((prev) =>
                            prev.map((cat) =>
                              cat.id === category.id ? { ...cat, filter_keywords: keywords, __dirty: true } : cat
                            )
                          );
                        }}
                        placeholder="Netflix Premium, NF, น็อกซ์"
                      />
                      <p className="text-xs text-[color:var(--text)]/50">คำที่ใช้กรองสินค้า (เช่น Netflix Premium, NF) คั่นด้วยจุลภาค สามารถเว้นวรรคในคำได้</p>
                    </div>

                    {/* Sub Categories Section */}
                    <div className="space-y-2 border-t border-border pt-4 mt-4">
                      <Label className="text-sm font-medium">หมวดหมู่ย่อย (Sub Categories)</Label>
                      <div className="space-y-2">
                        {(() => {
                          // Get unique sub categories for this category from products
                          const categoryProducts = products.filter((p) => 
                            p.app_category?.toLowerCase() === category.category.toLowerCase()
                          );
                          const subCategories = Array.from(
                            new Set(
                              categoryProducts
                                .map((p) => p.sub_category)
                                .filter((sc): sc is string => Boolean(sc && sc.trim()))
                            )
                          ).sort();

                          if (subCategories.length === 0) {
                            return (
                              <div className="text-xs text-[color:var(--text)]/50 italic py-2">
                                ยังไม่มีหมวดหมู่ย่อย (ดึงมาจากสินค้าที่มี app_category ตรงกับหมวดหมู่นี้)
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-2">
                              {subCategories.map((subCat, idx) => {
                                const productsWithSubCat = categoryProducts.filter(
                                  (p) => p.sub_category === subCat
                                );
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between gap-2 p-2 rounded border border-border bg-muted/30"
                                  >
                                    {editingSubCategory?.categoryId === category.id && editingSubCategory?.oldValue === subCat ? (
                                      <div className="flex-1 flex items-center gap-2">
                                        <Input
                                          value={editingSubCategory.newValue}
                                          onChange={(e) => setEditingSubCategory({ ...editingSubCategory, newValue: e.target.value })}
                                          className="flex-1 text-sm"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              // Save
                                              const handleSave = async () => {
                                                if (!editingSubCategory) return;
                                                const newValue = editingSubCategory.newValue.trim();
                                                if (newValue === editingSubCategory.oldValue) {
                                                  setEditingSubCategory(null);
                                                  return;
                                                }

                                                try {
                                                  const productIds = productsWithSubCat.map((p) => p.id);
                                                  let successCount = 0;
                                                  let errorCount = 0;

                                                  for (const productId of productIds) {
                                                    try {
                                                      const res = await fetch(`/api/admin/app-premium/products/${productId}`, {
                                                        method: 'PATCH',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ sub_category: newValue || null })
                                                      });
                                                      if (res.ok) {
                                                        successCount++;
                                                        setProducts((prev) =>
                                                          prev.map((p) =>
                                                            p.id === productId ? { ...p, sub_category: newValue || null } : p
                                                          )
                                                        );
                                                      } else {
                                                        errorCount++;
                                                      }
                                                    } catch (err) {
                                                      errorCount++;
                                                    }
                                                  }

                                                  if (errorCount > 0) {
                                                    toast.show({
                                                      title: `แก้ไขสำเร็จ ${successCount} รายการ`,
                                                      description: `มี ${errorCount} รายการที่แก้ไขไม่สำเร็จ`,
                                                      variant: 'default'
                                                    });
                                                  } else {
                                                    toast.show({ title: `แก้ไขหมวดหมู่ย่อยสำเร็จ` });
                                                  }
                                                  setEditingSubCategory(null);
                                                } catch (error) {
                                                  console.error(error);
                                                  toast.show({ title: 'แก้ไขไม่สำเร็จ', variant: 'destructive' });
                                                }
                                              };
                                              handleSave();
                                            } else if (e.key === 'Escape') {
                                              setEditingSubCategory(null);
                                            }
                                          }}
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={async () => {
                                            if (!editingSubCategory) return;
                                            const newValue = editingSubCategory.newValue.trim();
                                            if (newValue === editingSubCategory.oldValue) {
                                              setEditingSubCategory(null);
                                              return;
                                            }

                                            try {
                                              const productIds = productsWithSubCat.map((p) => p.id);
                                              let successCount = 0;
                                              let errorCount = 0;

                                              for (const productId of productIds) {
                                                try {
                                                  const res = await fetch(`/api/admin/app-premium/products/${productId}`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ sub_category: newValue || null })
                                                  });
                                                  if (res.ok) {
                                                    successCount++;
                                                    setProducts((prev) =>
                                                      prev.map((p) =>
                                                        p.id === productId ? { ...p, sub_category: newValue || null } : p
                                                      )
                                                    );
                                                  } else {
                                                    errorCount++;
                                                  }
                                                } catch (err) {
                                                  errorCount++;
                                                }
                                              }

                                              if (errorCount > 0) {
                                                toast.show({
                                                  title: `แก้ไขสำเร็จ ${successCount} รายการ`,
                                                  description: `มี ${errorCount} รายการที่แก้ไขไม่สำเร็จ`,
                                                  variant: 'default'
                                                });
                                              } else {
                                                toast.show({ title: `แก้ไขหมวดหมู่ย่อยสำเร็จ` });
                                              }
                                              setEditingSubCategory(null);
                                            } catch (error) {
                                              console.error(error);
                                              toast.show({ title: 'แก้ไขไม่สำเร็จ', variant: 'destructive' });
                                            }
                                          }}
                                        >
                                          <Save className="size-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingSubCategory(null)}
                                        >
                                          ยกเลิก
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium text-[color:var(--text)]">
                                            {subCat}
                                          </div>
                                          <div className="text-xs text-[color:var(--text)]/50">
                                            มีสินค้า {productsWithSubCat.length} รายการ
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingSubCategory({ categoryId: category.id, oldValue: subCat, newValue: subCat })}
                                            className="gap-1"
                                          >
                                            <Save className="size-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={async () => {
                                              if (!confirm(`ต้องการลบหมวดหมู่ย่อย "${subCat}" จากสินค้าทั้งหมดหรือไม่?`)) return;
                                              
                                              try {
                                                const productIds = productsWithSubCat.map((p) => p.id);
                                                let successCount = 0;
                                                let errorCount = 0;

                                                for (const productId of productIds) {
                                                  try {
                                                    const res = await fetch(`/api/admin/app-premium/products/${productId}`, {
                                                      method: 'PATCH',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({ sub_category: null })
                                                    });
                                                    if (res.ok) {
                                                      successCount++;
                                                      setProducts((prev) =>
                                                        prev.map((p) =>
                                                          p.id === productId ? { ...p, sub_category: null } : p
                                                        )
                                                      );
                                                    } else {
                                                      errorCount++;
                                                    }
                                                  } catch (err) {
                                                    errorCount++;
                                                  }
                                                }

                                                if (errorCount > 0) {
                                                  toast.show({
                                                    title: `ลบสำเร็จ ${successCount} รายการ`,
                                                    description: `มี ${errorCount} รายการที่ลบไม่สำเร็จ`,
                                                    variant: 'default'
                                                  });
                                                } else {
                                                  toast.show({ title: `ลบหมวดหมู่ย่อย "${subCat}" สำเร็จ` });
                                                }
                                              } catch (error) {
                                                console.error(error);
                                                toast.show({ title: 'ลบไม่สำเร็จ', variant: 'destructive' });
                                              }
                                            }}
                                            className="gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                          >
                                            <Trash2 className="size-3" />
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-[color:var(--text)]/50">
                        หมวดหมู่ย่อยจะถูกดึงมาจากสินค้าที่มี app_category ตรงกับหมวดหมู่นี้
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-publish-${category.id}`}
                          checked={category.is_published}
                          onChange={(e) => {
                            setCategories((prev) =>
                              prev.map((cat) =>
                                cat.id === category.id ? { ...cat, is_published: e.target.checked, __dirty: true } : cat
                              )
                            );
                          }}
                        />
                        <Label htmlFor={`cat-publish-${category.id}`} className="text-sm whitespace-nowrap cursor-pointer">เผยแพร่</Label>
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
                                  icon_url: updated.icon_url || null,
                                  card_image_url: updated.card_image_url || null
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

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => {
        if (!open) setEditingProduct(null);
      }}>
        <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">แก้ไขสินค้า</DialogTitle>
            <DialogDescription className="text-gray-400">
              Product ID: {editingProduct?.provider_product_id}
            </DialogDescription>
          </DialogHeader>
          
          {editingProduct && (
            <div className="grid gap-3 py-2">
              {/* Top Row: Image and Basic Info - Horizontal Layout */}
              <div className="grid gap-3 lg:grid-cols-12">
                {/* Left: Image */}
                {editingProduct.image_url && (
                  <div className="lg:col-span-2 flex justify-center items-start">
                    <div className="w-20 h-20 bg-gray-900/50 rounded-lg flex items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={editingProduct.image_url} 
                        alt={editingProduct.display_name || editingProduct.name} 
                        className="w-full h-full object-contain"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>
                )}

                {/* Right: Basic Info */}
                <div className={`grid gap-3 ${editingProduct.image_url ? 'lg:col-span-10' : 'lg:col-span-12'} md:grid-cols-2`}>
                  {/* Original Name */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-name" className="text-xs">ชื่อสินค้า (จาก Provider)</Label>
                    <Input 
                      id="edit-name"
                      value={editingProduct.name || ''} 
                      disabled 
                      className="bg-muted/30 text-gray-500 h-8 text-sm"
                    />
                  </div>

                  {/* Display Name */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-display-name" className="text-xs">ชื่อแสดง (หน้าเว็บ)</Label>
                    <Input 
                      id="edit-display-name"
                      value={editingProduct.display_name ?? ''} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, display_name: e.target.value })}
                      placeholder="กรอกชื่อที่ต้องการแสดงบนหน้าเว็บ"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Category and Pricing Row - Horizontal Layout */}
              <div className="grid gap-3 lg:grid-cols-6">
                {/* Category */}
                <div className="lg:col-span-2 grid gap-1.5">
                  <Label htmlFor="edit-category" className="text-xs">หมวดหมู่หลัก</Label>
                  <Input 
                    id="edit-category"
                    value={editingProduct.app_category ?? ''} 
                    disabled 
                    className="bg-muted/30 text-gray-500 h-8 text-sm"
                  />
                </div>

                {editingProduct.sub_category && (
                  <div className="lg:col-span-2 grid gap-1.5">
                    <Label htmlFor="edit-sub-category" className="text-xs">หมวดหมู่ย่อย</Label>
                    <Input 
                      id="edit-sub-category"
                      value={editingProduct.sub_category} 
                      disabled 
                      className="bg-muted/30 text-gray-500 h-8 text-sm"
                    />
                  </div>
                )}

                {/* Stock */}
                <div className="lg:col-span-2 grid gap-1.5">
                  <Label htmlFor="edit-stock" className="text-xs">คงเหลือ</Label>
                  <Input 
                    id="edit-stock"
                    value={editingProduct.stock || 0} 
                    disabled 
                    className="bg-muted/30 text-gray-500 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Pricing Row - All in one row */}
              <div className="grid gap-3 lg:grid-cols-5">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-base-price" className="text-xs">ราคาต้นทุน</Label>
                  <Input 
                    id="edit-base-price"
                    value={currencyFormatter.format(editingProduct.base_price || 0)} 
                    disabled 
                    className="bg-muted/30 text-gray-500 h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-markup-percent" className="text-xs">กำไร (%)</Label>
                  <Input
                    id="edit-markup-percent"
                    type="number"
                    step="0.1"
                    value={editingProduct.markup_percent}
                    onChange={(e) => setEditingProduct({ ...editingProduct, markup_percent: Number(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-markup-fixed" className="text-xs">กำไรคงที่ (บาท)</Label>
                  <Input
                    id="edit-markup-fixed"
                    type="number"
                    step="0.1"
                    value={editingProduct.markup_fixed}
                    onChange={(e) => setEditingProduct({ ...editingProduct, markup_fixed: Number(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="lg:col-span-2 grid gap-1.5">
                  <Label className="text-xs">ราคาขายสุดท้าย</Label>
                  <div className="p-2 rounded-lg border border-emerald-800/50 bg-emerald-900/10">
                    <span className="text-base font-bold text-emerald-400">
                    {currencyFormatter.format(calculateFinalPrice(editingProduct.base_price, editingProduct.markup_percent, editingProduct.markup_fixed))}
                  </span>
                  </div>
                </div>
              </div>

              {/* Toggles Row - Horizontal */}
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-800">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-publish" className="text-xs font-medium cursor-pointer">
                      เปิดขายสินค้า
                    </Label>
                    <p className="text-[10px] text-gray-400">
                      {editingProduct.is_published ? 'สินค้าจะแสดงบนหน้าเว็บ' : 'สินค้าจะไม่แสดงบนหน้าเว็บ'}
                    </p>
                  </div>
                  <Switch
                    id="edit-publish"
                    checked={editingProduct.is_published}
                    onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, is_published: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-800">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-homepage" className="text-xs font-medium cursor-pointer">
                      แสดงหน้าแรก
                    </Label>
                    <p className="text-[10px] text-gray-400">
                      {editingProduct.show_on_homepage ? 'สินค้าจะแสดงบนหน้าแรก' : 'สินค้าจะไม่แสดงบนหน้าแรก'}
                    </p>
                  </div>
                  <Switch
                    id="edit-homepage"
                    checked={editingProduct.show_on_homepage}
                    onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, show_on_homepage: checked })}
                  />
                </div>
              </div>

              {/* Description */}
              {editingProduct.description && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">คำอธิบาย</Label>
                  <div 
                    className="p-2 rounded-lg border border-gray-800 bg-gray-900/30 text-xs text-gray-300 max-h-24 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: editingProduct.description }}
                    suppressHydrationWarning
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={savingProduct}>
                <X className="size-4 mr-2" />
                ยกเลิก
              </Button>
            </DialogClose>
            <Button 
              onClick={handleSaveProduct} 
              disabled={savingProduct}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingProduct ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  บันทึก
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

