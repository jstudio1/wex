'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SearchIcon, ChevronDown, Package, Settings2 } from 'lucide-react';
import Link from 'next/link';
import PricingDialog from './PricingDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Progress } from '@/components/ui/progress';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface Product {
  id: number;
  name: string;
  key: string;
  is_published: boolean;
  image_url: string | null;
  banner_url: string | null;
  icon_url: string | null;
  badge_enabled: boolean;
  badge_percent: number | null;
  badge_text: string | null;
  badge_apply_price: boolean;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

type ProductFormState = {
  name: string;
  image_url: string;
  banner_url: string;
  icon_url: string;
  is_published: boolean;
  badge_enabled: boolean;
  badge_percent: string;
  badge_text: string;
  badge_apply_price: boolean;
  categories: number[];
};

const defaultEditForm: ProductFormState = {
  name: '',
  image_url: '',
  banner_url: '',
  icon_url: '',
  is_published: false,
  badge_enabled: false,
  badge_percent: '',
  badge_text: '',
  badge_apply_price: false,
  categories: [],
};

export default function ProductsContent({ productType }: { productType?: string }) {
  const getTitle = () => {
    if (productType === 'mtopup') return 'จัดการเติมเงินมือถือ';
    if (productType === 'cashcard') return 'จัดการบัตรเติมเงิน';
    return 'จัดการเติมเกม';
  };
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCategories, setProductCategories] = useState<Map<number, number[]>>(new Map());
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductFormState>(defaultEditForm);
  const [editSaving, setEditSaving] = useState(false);
  
  // State สำหรับ dialog เลือกเกม/บริการ
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [games, setGames] = useState<Array<{ company_id: string; company_name: string; exists: boolean }>>([]);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
  const [loadingGames, setLoadingGames] = useState(false);
  const [gameSearch, setGameSearch] = useState('');
  
  // State สำหรับ sync progress
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncController, setSyncController] = useState<AbortController | null>(null);

  useEffect(() => {
    fetchData();
  }, [filter, productType]);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // เพิ่ม timeout 30 วินาที
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const productTypeParam = productType ? `&product_type=${productType}` : '';
      const [productsRes, categoriesRes, pcRes] = await Promise.all([
        fetch(`/api/admin/products?filter=${filter}${productTypeParam}`, { signal: controller.signal }),
        fetch('/api/admin/categories', { signal: controller.signal }),
        fetch('/api/admin/products/categories', { signal: controller.signal }),
      ]);

      clearTimeout(timeoutId);

      if (!productsRes.ok) {
        const errorData = await productsRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'ไม่สามารถโหลดบริการได้');
      }
      if (!categoriesRes.ok) {
        const errorData = await categoriesRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'ไม่สามารถโหลดหมวดหมู่ได้');
      }

      const productsJson = await productsRes.json();
      const categoriesJson = await categoriesRes.json();
      const pcJson = pcRes.ok ? await pcRes.json() : { data: [] };

      setProducts(productsJson.data || []);
      setCategories(categoriesJson.data || []);

      // สร้าง map สำหรับ product_categories
      const pcMap = new Map<number, number[]>();
      for (const row of pcJson.data || []) {
        const pid = row.product_id as number;
        const cid = row.category_id as number;
        const arr = pcMap.get(pid) || [];
        arr.push(cid);
        pcMap.set(pid, arr);
      }
      setProductCategories(pcMap);
      setLoadError(null);
    } catch (err) {
      console.error('Fetch data error:', err);
      let errorMsg = 'ไม่สามารถโหลดข้อมูลได้';
      
      if ((err as Error).name === 'AbortError') {
        errorMsg = 'การโหลดข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่อ';
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      
      setLoadError(errorMsg);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: errorMsg,
        variant: 'destructive',
      });
      
      // ตั้งค่าเป็น empty arrays เพื่อให้ UI แสดงปกติ
      setProducts([]);
      setCategories([]);
      setProductCategories(new Map());
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    setLoadingGames(true);
    try {
      // ดึงข้อมูลใหม่จาก wePAY API ทุกครั้ง (ไม่ใช้ cache)
      const res = await fetch(`/api/admin/products/list?product_type=${productType || 'gtopup'}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('ไม่สามารถดึงรายชื่อบริการได้');
      }
      const json = await res.json();
      setGames(json.data || []);
      // เลือกทั้งหมดโดย default
      setSelectedGames(new Set((json.data || []).map((g: any) => g.company_id)));
    } catch (err) {
      toast.show({
        title: 'โหลดรายชื่อบริการไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
        variant: 'destructive',
      });
      setGames([]);
    } finally {
      setLoadingGames(false);
    }
  };

  const handleOpenSyncDialog = () => {
    setSyncDialogOpen(true);
    fetchGames();
  };

  const handleToggleGame = (companyId: string) => {
    setSelectedGames((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedGames(new Set(games.map((g) => g.company_id)));
  };

  const handleDeselectAll = () => {
    setSelectedGames(new Set());
  };

  const handleSync = async (companyIds: string[]) => {
    const productTypeLabel = productType === 'mtopup' ? 'เติมเงินมือถือ' : 
                             productType === 'cashcard' ? 'บัตรเติมเงิน' : 
                             'เติมเกม';
    
    setSyncing(true);
    setSyncProgress(0);
    setSyncStatus('กำลังเริ่ม sync...');
    
      const controller = new AbortController();
    setSyncController(controller);
    
    // เพิ่ม timeout 6 นาที (360,000 ms)
    const timeoutId = setTimeout(() => controller.abort(), 360000);
      
    // Simulate progress (เนื่องจาก API ไม่ได้ส่ง progress กลับมา)
    const progressInterval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 90) return prev; // หยุดที่ 90% รอ response
        return prev + Math.random() * 5;
      });
    }, 500);
    
    try {
      const url = new URL('/api/admin/products/sync', window.location.origin);
      if (productType) {
        url.searchParams.set('product_type', productType);
      }
      
      setSyncStatus(`กำลัง sync ${companyIds.length} รายการ...`);
      
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_ids: companyIds }),
        signal: controller.signal,
      });
      
      clearInterval(progressInterval);
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 504 || errorData.error === 'timeout') {
          throw new Error('การ Sync ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
        }
        throw new Error(errorData.detail || errorData.error || 'Sync ไม่สำเร็จ');
      }
      
      setSyncProgress(100);
      setSyncStatus('Sync สำเร็จ!');
      
      const data = await res.json();
      toast.show({ 
        title: 'Sync สำเร็จ', 
        description: data.counts ? 
          `Sync ${productTypeLabel} ${companyIds.length} รายการเรียบร้อย: ${data.counts.products} สินค้า, ${data.counts.items} รายการ\nรีเซ็ตกำไรเป็น 0% แล้ว` :
          `Sync ${productTypeLabel} ${companyIds.length} รายการเรียบร้อย และรีเซ็ตกำไรเป็น 0% แล้ว`
      });
      
      await fetchData();
      
      // ปิด dialog หลังจาก 1.5 วินาที
      setTimeout(() => {
        setSyncDialogOpen(false);
        setSyncProgress(0);
        setSyncStatus('');
      }, 1500);
    } catch (err) {
      clearInterval(progressInterval);
      setSyncProgress(0);
      setSyncStatus('');
      
      if ((err as Error).name === 'AbortError') {
        toast.show({
          title: 'Sync ถูกยกเลิก',
          description: 'การ Sync ถูกยกเลิกโดยผู้ใช้',
          variant: 'destructive',
        });
      } else {
        toast.show({
          title: 'เกิดข้อผิดพลาด',
          description: (err as Error).message,
          variant: 'destructive',
        });
      }
    } finally {
      setSyncing(false);
      setSyncController(null);
    }
  };

  const handleCancelSync = () => {
    if (syncController) {
      syncController.abort();
      setSyncController(null);
    }
    setSyncing(false);
    setSyncProgress(0);
    setSyncStatus('');
  };

  const handleConfirmSync = async () => {
    if (selectedGames.size === 0) {
      toast.show({
        title: 'กรุณาเลือกบริการ',
        description: 'กรุณาเลือกบริการอย่างน้อย 1 รายการ',
        variant: 'destructive',
      });
      return;
    }
    // ไม่ปิด dialog เพื่อแสดง progress
    await handleSync(Array.from(selectedGames));
  };

  const handlePublishAll = async () => {
    const productTypeLabel = productType === 'mtopup' ? 'บริการเติมเงินมือถือ' : 
                             productType === 'cashcard' ? 'บัตรเติมเงิน' : 
                             'เกม';
    if (!confirm(`คุณต้องการเผยแพร่ทุก${productTypeLabel}ที่ยังไม่เผยแพร่หรือไม่?`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/products/publish-all', {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'เผยแพร่ไม่สำเร็จ');
      }
      toast.show({ title: 'สำเร็จ', description: `เผยแพร่ทุก${productTypeLabel}เรียบร้อย` });
      await fetchData();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'published' | 'unpublished') => {
    setFilter(newFilter);
    setSearchQuery('');
  };

  const resetEditState = () => {
    setEditingProduct(null);
    setEditForm(defaultEditForm);
  };

  const openEditModal = (product: Product) => {
    const cats = productCategories.get(product.id) || [];
    setEditingProduct(product);
    setEditForm({
      name: product.name || '',
      image_url: product.image_url || '',
      banner_url: product.banner_url || '',
      icon_url: product.icon_url || '',
      is_published: product.is_published,
      badge_enabled: product.badge_enabled,
      badge_percent: product.badge_percent != null ? String(product.badge_percent) : '',
      badge_text: product.badge_text || '',
      badge_apply_price: product.badge_apply_price,
      categories: cats,
    });
    setEditDialogOpen(true);
  };

  const closeEditModal = () => {
    setEditDialogOpen(false);
    resetEditState();
  };

  const toggleCategorySelection = (catId: number) => {
    setEditForm((prev) => {
      const has = prev.categories.includes(catId);
      return {
        ...prev,
        categories: has ? prev.categories.filter((id) => id !== catId) : [...prev.categories, catId],
      };
    });
  };

  const updateEditForm = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async () => {
    if (!editingProduct) return;
    setEditSaving(true);
    try {
      const payload = {
        id: editingProduct.id,
        name: editForm.name.trim(),
        image_url: editForm.image_url.trim() || null,
        banner_url: editForm.banner_url.trim() || null,
        icon_url: editForm.icon_url.trim() || null,
        is_published: editForm.is_published,
        badge_enabled: editForm.badge_enabled,
        badge_percent: editForm.badge_percent.trim().length
          ? Math.max(0, Math.round(Number(editForm.badge_percent)))
          : null,
        badge_text: editForm.badge_text.trim() || null,
        badge_apply_price: editForm.badge_apply_price,
        categories: editForm.categories,
      };

      const res = await fetch('/api/admin/products/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: [payload] }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({ title: 'สำเร็จ', description: 'อัปเดตการตั้งค่าสำเร็จ' });
      closeEditModal();
        await fetchData();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    return p.name?.toLowerCase().includes(query) || p.key?.toLowerCase().includes(query);
  });

  const filterLabel = filter === 'published' ? 'ที่เผยแพร่' : filter === 'unpublished' ? 'ที่ไม่เผยแพร่' : 'ทั้งหมด';

  // แสดง Error UI พร้อมปุ่ม Retry
  if (loadError && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-semibold">{getTitle()}</h2>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-destructive">เกิดข้อผิดพลาด</h3>
            <p className="text-muted-foreground max-w-md">{loadError}</p>
          </div>
          <Button onClick={() => fetchData()} variant="default">
            ลองใหม่อีกครั้ง
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold">{getTitle()}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            type="button" 
            variant="default" 
            size="sm" 
            disabled={saving || loading}
            onClick={handlePublishAll}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                กำลังเผยแพร่...
              </span>
            ) : (
              productType === 'mtopup' ? 'เผยแพร่ทุกบริการ' :
              productType === 'cashcard' ? 'เผยแพร่ทุกบัตร' :
              'เผยแพร่ทุกเกม'
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenSyncDialog} disabled={syncing}>
              {syncing ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  กำลังซิงก์... (อาจใช้เวลา 1-2 นาที)
                </span>
              ) : (
                'Sync จากผู้ให้บริการ'
              )}
            </Button>
        </div>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
          <InputGroup>
            <InputGroupInput
              placeholder="ค้นหาชื่อหรือคีย์บริการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon size={16} />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between">
              <span>แสดง: {filterLabel}</span>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px]">
            <DropdownMenuLabel>กรองรายการ</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filter === 'all'}
              onCheckedChange={() => handleFilterChange('all')}
            >
              ทั้งหมด
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === 'published'}
              onCheckedChange={() => handleFilterChange('published')}
            >
              ที่เผยแพร่
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === 'unpublished'}
              onCheckedChange={() => handleFilterChange('unpublished')}
            >
              ที่ไม่เผยแพร่
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2 -mt-2">
        <Link href="/admin/pricing" className="px-3 py-2 text-xs rounded border border-border hover:bg-muted/50">
          ควบคุมราคา (ทั้งเว็บ)
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredProducts.map((p) => {
          const catsForProduct = productCategories.get(p.id) || [];
          const categoryLabels = catsForProduct
            .map((cid) => categories.find((c) => c.id === cid)?.name)
            .filter(Boolean) as string[];
          return (
            <div
              key={p.id}
              className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e0e0e] to-[#050505] p-4 shadow-lg shadow-emerald-500/5"
            >
              <div className="flex items-start gap-3">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded-xl object-cover border border-white/10" />
                    ) : (
                  <div className="h-14 w-14 rounded-xl border border-dashed border-white/10 bg-black/40 flex items-center justify-center text-xs text-white/50">
                    no img
                  </div>
                    )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">{p.name}</h3>
                    {p.badge_enabled && (
                      <Badge variant="secondary" className="ml-auto">
                        {p.badge_text || `${p.badge_percent ?? 0}% OFF`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate">key: {p.key}</p>
                    </div>
                  </div>
              <div className="mt-4 flex flex-wrap gap-2">
                      <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    p.is_published ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-800 text-gray-300 border border-gray-700'
                        }`}
                      >
                        {p.is_published ? 'เผยแพร่' : 'ยังไม่เผยแพร่'}
                      </span>
                {categoryLabels.slice(0, 3).map((label) => (
                  <Badge key={label} variant="outline" className="border-white/15 text-gray-200">
                    {label}
                  </Badge>
                ))}
                {categoryLabels.length > 3 && (
                  <Badge variant="outline" className="border-white/15 text-gray-400">
                    +{categoryLabels.length - 3}
                  </Badge>
                    )}
                  </div>
              <div className="mt-4 flex flex-col gap-2 text-xs text-gray-400">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Banner</span>
                  <span className="truncate max-w-[60%] text-right">{p.banner_url ? 'ตั้งค่าแล้ว' : '-'}</span>
                  </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Icon</span>
                  <span className="truncate max-w-[60%] text-right">{p.icon_url ? 'ตั้งค่าแล้ว' : '-'}</span>
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-4">
                <Button
                  variant="secondary"
                  className="w-full justify-center gap-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  onClick={() => openEditModal(p)}
                >
                  <Settings2 className="size-4" />
                  แก้ไขบริการ
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center border-white/20 text-white hover:bg-white/5"
                  onClick={() => {
                    setSelectedProductId(p.id);
                    setPricingDialogOpen(true);
                  }}
                >
                  กำหนดราคา
                </Button>
              </div>
            </div>
          );
        })}
        </div>

      {filteredProducts.length === 0 && (
        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package className="size-6" />
            </EmptyMedia>
            <EmptyTitle>ไม่พบบริการ</EmptyTitle>
            <EmptyDescription>
              ลองค้นหาด้วยคำอื่น หรือเพิ่มบริการใหม่
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditModal();
          } else {
            setEditDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-3xl bg-[#050505] border border-white/15">
          <DialogHeader>
            <DialogTitle>แก้ไข{productType === 'mtopup' ? 'บริการเติมเงินมือถือ' : productType === 'cashcard' ? 'บัตรเติมเงิน' : 'บริการเติมเกม'}</DialogTitle>
            <p className="text-sm text-gray-400">ปรับรายละเอียดการแสดงผลและสถานะการเผยแพร่</p>
          </DialogHeader>
          {editingProduct ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase text-gray-400">ชื่อบริการ</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => updateEditForm('name', e.target.value)}
                    placeholder="ชื่อบริการ"
                    className="mt-1"
                  />
                </div>
                <div className="rounded-xl border border-white/10 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">สถานะการเผยแพร่</p>
                    <p className="text-xs text-gray-400 mt-1">กำหนดว่าจะให้ลูกค้าเห็นบนหน้าเว็บไซต์หรือไม่</p>
                  </div>
                  <Switch
                    checked={editForm.is_published}
                    onCheckedChange={(checked) => updateEditForm('is_published', checked)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase text-gray-400">รูปหน้าปก / Icon</Label>
                  <Input
                    value={editForm.image_url}
                    onChange={(e) => updateEditForm('image_url', e.target.value)}
                    placeholder="URL รูปไอคอน"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase text-gray-400">Icon ราคา (แสดงในรายการราคา)</Label>
                  <Input
                    value={editForm.icon_url}
                    onChange={(e) => updateEditForm('icon_url', e.target.value)}
                    placeholder="URL รูป icon ราคา"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase text-gray-400">รูป Banner (หน้ารายละเอียด)</Label>
                  <Input
                    value={editForm.banner_url}
                    onChange={(e) => updateEditForm('banner_url', e.target.value)}
                    placeholder="URL รูป Banner"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase text-gray-400">หมวดหมู่</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const active = editForm.categories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategorySelection(cat.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          active ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200' : 'border-white/15 text-gray-300 hover:border-emerald-500/50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                  {categories.length === 0 && <p className="text-xs text-gray-500">ยังไม่มีหมวดหมู่</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Badge โปรโมชั่น</p>
                    <p className="text-xs text-gray-400">แสดงป้ายพิเศษบนหน้ารายการสินค้า</p>
                  </div>
                  <Switch
                    checked={editForm.badge_enabled}
                    onCheckedChange={(checked) => updateEditForm('badge_enabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">ลดราคาจริง</p>
                    <p className="text-xs text-gray-400">ถ้าเปิดจะปรับราคาขายตามเปอร์เซ็นต์</p>
                  </div>
                  <Switch
                    checked={editForm.badge_apply_price}
                    onCheckedChange={(checked) => updateEditForm('badge_apply_price', checked)}
                    disabled={!editForm.badge_enabled}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs uppercase text-gray-400">เปอร์เซ็นต์ลด</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={editForm.badge_percent}
                      onChange={(e) => updateEditForm('badge_percent', e.target.value)}
                      placeholder="เช่น 10"
                      className="mt-1"
                      disabled={!editForm.badge_enabled}
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-gray-400">ข้อความป้าย</Label>
                    <Input
                      value={editForm.badge_text}
                      onChange={(e) => updateEditForm('badge_text', e.target.value)}
                      placeholder="เช่น Flash Sale"
                      className="mt-1"
                      disabled={!editForm.badge_enabled}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  ถ้าไม่ใส่ข้อความ ระบบจะแสดงตามเปอร์เซ็นต์ เช่น {editForm.badge_percent || '10'}% OFF
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">ไม่พบบริการ</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal} disabled={editSaving}>
              ยกเลิก
            </Button>
            <Button onClick={handleEditSubmit} disabled={editSaving || !editingProduct}>
              {editSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  กำลังบันทึก...
                </span>
              ) : (
                'บันทึกการเปลี่ยนแปลง'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PricingDialog
        open={pricingDialogOpen}
        onOpenChange={setPricingDialogOpen}
        productId={selectedProductId}
      />

      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-4xl bg-[#050505] border border-white/10 text-white max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>เลือก{productType === 'mtopup' ? 'บริการเติมเงินมือถือ' : productType === 'cashcard' ? 'บัตรเติมเงิน' : 'เกม'}ที่จะ Sync</DialogTitle>
            <DialogDescription className="text-gray-400">
              เลือก{productType === 'mtopup' ? 'บริการ' : productType === 'cashcard' ? 'บัตรเติมเงิน' : 'เกม'}ที่ต้องการ sync จาก wePAY (สามารถเลือกได้หลายรายการ)
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <InputGroup className="flex-1">
                <InputGroupInput
                  placeholder="ค้นหา..."
                  value={gameSearch}
                  onChange={(e) => setGameSearch(e.target.value)}
                />
                <InputGroupAddon>
                  <SearchIcon size={16} />
                </InputGroupAddon>
              </InputGroup>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                เลือกทั้งหมด
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                ยกเลิกทั้งหมด
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl">
              {loadingGames ? (
                <div className="py-10 text-center text-gray-400">กำลังโหลดรายชื่อ...</div>
              ) : games.length === 0 ? (
                <div className="py-10 text-center text-gray-400">ไม่พบข้อมูล</div>
              ) : (
                <div className="p-4 space-y-2">
                  {games
                    .filter((g) => 
                      !gameSearch || 
                      g.company_name.toLowerCase().includes(gameSearch.toLowerCase()) ||
                      g.company_id.toLowerCase().includes(gameSearch.toLowerCase())
                    )
                    .map((game) => (
                      <label
                        key={game.company_id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGames.has(game.company_id)}
                          onChange={() => handleToggleGame(game.company_id)}
                          className="w-4 h-4 rounded border-gray-600 bg-[#0f0f0f] text-emerald-500 focus:ring-emerald-500/30"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{game.company_name}</span>
                            {game.exists && (
                              <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-xs">
                                มีในระบบแล้ว
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">ID: {game.company_id}</div>
                        </div>
                      </label>
                    ))}
                  {games.filter((g) => 
                    !gameSearch || 
                    g.company_name.toLowerCase().includes(gameSearch.toLowerCase()) ||
                    g.company_id.toLowerCase().includes(gameSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="py-10 text-center text-gray-400">ไม่พบรายการตามคำค้นหา</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-400">
              เลือกแล้ว: {selectedGames.size} / {games.length} รายการ
            </div>
          </div>
          
          {syncing ? (
            <div className="flex w-full flex-col gap-4 pt-4">
              <Item variant="outline">
                <ItemMedia>
                  <Spinner />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>กำลัง Sync...</ItemTitle>
                  <ItemDescription>{syncStatus || `กำลัง sync ${selectedGames.size} รายการ...`}</ItemDescription>
                </ItemContent>
                <ItemActions className="hidden sm:flex">
                  <Button variant="outline" size="sm" onClick={handleCancelSync}>
                    ยกเลิก
                  </Button>
                </ItemActions>
                <ItemFooter>
                  <Progress value={syncProgress} />
                </ItemFooter>
              </Item>
            </div>
          ) : (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSyncDialogOpen(false)}
                disabled={syncing}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleConfirmSync}
                disabled={syncing || selectedGames.size === 0}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
              >
                Sync {selectedGames.size} รายการ
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}