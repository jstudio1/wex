'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Settings2, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import PricingDialog from '@/components/backoffice/PricingDialog';

type Product = {
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
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

type ProductCategoryMap = Map<number, number[]>;
type ProviderDiscountResponse = {
  provider_company_id: string;
  provider_name: string;
  discount_percent: number;
  product_count: number;
};

type ProviderDiscount = ProviderDiscountResponse & {
  draft_percent: string;
};


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

const defaultForm: ProductFormState = {
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

export default function NewTopupServicesManager() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategoryMap>(new Map());

  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [query, setQuery] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductFormState>(defaultForm);
  const [editSaving, setEditSaving] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pricingProductId, setPricingProductId] = useState<number | null>(null);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountProviders, setDiscountProviders] = useState<ProviderDiscount[]>([]);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountSearch, setDiscountSearch] = useState('');

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const [p, c, pc] = await Promise.all([
        fetch(`/api/admin/products?filter=${filter}`, { signal: controller.signal }),
        fetch('/api/admin/categories', { signal: controller.signal }),
        fetch('/api/admin/products/categories', { signal: controller.signal }),
      ]);

      clearTimeout(timeoutId);

      if (!p.ok) throw new Error((await p.json().catch(() => ({}))).error || 'โหลดบริการไม่สำเร็จ');
      if (!c.ok) throw new Error((await c.json().catch(() => ({}))).error || 'โหลดหมวดหมู่ไม่สำเร็จ');

      const pj = await p.json();
      const cj = await c.json();
      const pcj = pc.ok ? await pc.json() : { data: [] };

      setProducts(pj.data || []);
      setCategories(cj.data || []);

      const map: ProductCategoryMap = new Map();
      for (const row of pcj.data || []) {
        const pid = row.product_id as number;
        const cid = row.category_id as number;
        const arr = map.get(pid) || [];
        arr.push(cid);
        map.set(pid, arr);
      }
      setProductCategories(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setProducts([]);
      setCategories([]);
      setProductCategories(new Map());
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) =>
      filter === 'all'
        ? true
        : filter === 'published'
          ? p.is_published
          : !p.is_published
    );
    if (!q) return list;
    return list.filter((p) => p.name?.toLowerCase().includes(q) || p.key?.toLowerCase().includes(q));
  }, [products, query, filter]);

  const runSync = async () => {
    setSyncing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const res = await fetch('/api/admin/products/sync', { method: 'POST', signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Sync ไม่สำเร็จ');
      }
      toast.show({ title: 'Sync สำเร็จ', description: 'รีเซ็ตกำไรทั้งหมดเป็น 0% แล้ว' });
      await fetchAll();
      return true;
    } catch (err) {
      toast.show({
        title: 'Sync ไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const fetchDiscountProviders = useCallback(async () => {
    setDiscountLoading(true);
    try {
      const res = await fetch('/api/admin/products/agent-discounts');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'โหลดส่วนลดไม่สำเร็จ');
      }
      const json = await res.json();
      const rows = (json.data || []).map((row: ProviderDiscountResponse) => ({
        ...row,
        discount_percent: Number(row.discount_percent ?? 0),
        draft_percent: String(Number(row.discount_percent ?? 0)),
      }));
      setDiscountProviders(rows);
    } catch (err) {
      toast.show({
        title: 'โหลดข้อมูลส่วนลดไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
        variant: 'destructive',
      });
      setDiscountProviders([]);
    } finally {
      setDiscountLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (discountDialogOpen) {
      fetchDiscountProviders();
    } else {
      setDiscountSearch('');
    }
  }, [discountDialogOpen, fetchDiscountProviders]);

  const filteredDiscountProviders = useMemo(() => {
    const q = discountSearch.trim().toLowerCase();
    if (!q) return discountProviders;
    return discountProviders.filter((provider) => provider.provider_name.toLowerCase().includes(q));
  }, [discountProviders, discountSearch]);

  const handleChangeDiscountPercent = (providerId: string, value: string) => {
    if (!/^\d*\.?\d*$/.test(value)) return;
    setDiscountProviders((prev) =>
      prev.map((item) => {
        if (item.provider_company_id !== providerId) return item;
        const numeric = value === '' ? null : parseFloat(value);
        const clamp =
          numeric === null || Number.isNaN(numeric) ? 0 : Math.min(100, Math.max(0, numeric));
        return {
          ...item,
          discount_percent: clamp,
          draft_percent: value,
        };
      }),
    );
  };

  const handleResetDiscounts = () => {
    setDiscountProviders((prev) =>
      prev.map((item) => ({ ...item, discount_percent: 0, draft_percent: '0' })),
    );
  };

  const saveDiscountOverrides = async () => {
    setDiscountSaving(true);
    try {
      const payload = {
        providers: discountProviders.map((provider) => ({
          provider_company_id: provider.provider_company_id,
          provider_name: provider.provider_name,
          discount_percent: provider.discount_percent,
        })),
      };
      const res = await fetch('/api/admin/products/agent-discounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.detail || json.error || 'บันทึกส่วนลดไม่สำเร็จ');
      }
      toast.show({ title: 'บันทึกส่วนลดสำเร็จ', description: 'บันทึกส่วนลดตัวแทนเรียบร้อยแล้ว' });
      return true;
    } catch (err) {
      toast.show({
        title: 'บันทึกส่วนลดไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
        variant: 'destructive',
      });
      return false;
    } finally {
      setDiscountSaving(false);
    }
  };

  const handleConfirmSync = async () => {
    const saved = await saveDiscountOverrides();
    if (!saved) return;
    const synced = await runSync();
    if (synced) {
      setDiscountDialogOpen(false);
    }
  };

  const handlePublishAll = async () => {
    if (!confirm('คุณต้องการเผยแพร่ทุกเกมที่ยังไม่เผยแพร่หรือไม่?')) return;
    try {
      const res = await fetch('/api/admin/products/publish-all', { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'เผยแพร่ไม่สำเร็จ');
      }
      toast.show({ title: 'เผยแพร่สำเร็จ', description: 'เผยแพร่ทุกเกมแล้ว' });
      await fetchAll();
    } catch (err) {
      toast.show({ title: 'เผยแพร่ไม่สำเร็จ', description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', variant: 'destructive' });
    }
  };

  const openEditModal = (product: Product) => {
    const cats = productCategories.get(product.id) || [];
    setEditingProduct(product);
    setEditForm({
      name: product.name,
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
    setEditingProduct(null);
    setEditForm(defaultForm);
  };

  const updateEditForm = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategoryInForm = (id: number) => {
    setEditForm((prev) => {
      const exists = prev.categories.includes(id);
      return {
        ...prev,
        categories: exists ? prev.categories.filter((cid) => cid !== id) : [...prev.categories, id],
      };
    });
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

      toast.show({ title: 'บันทึกสำเร็จ', description: 'อัปเดตบริการเรียบร้อย' });
      closeEditModal();
      await fetchAll();
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: err instanceof Error ? err.message : 'ไม่สามารถบันทึกได้', variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const renderSkeleton = () => (
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
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">จัดการบริการเติมเกม</h2>
          <p className="text-sm text-gray-400">จัดการรายการสินค้าต่างๆ</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePublishAll} disabled={loading}>
            เผยแพร่ทุกเกม
          </Button>
          <Button variant="outline" onClick={() => setDiscountDialogOpen(true)} disabled={syncing}>
            {syncing ? 'กำลังซิงก์...' : 'Sync จากผู้ให้บริการ'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] max-w-md">
          <InputGroup>
            <InputGroupInput
              placeholder="ค้นหาชื่อหรือคีย์บริการ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon size={16} />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            ทั้งหมด
          </Button>
          <Button
            type="button"
            variant={filter === 'published' ? 'default' : 'outline'}
            onClick={() => setFilter('published')}
          >
            ที่เผยแพร่
          </Button>
          <Button
            type="button"
            variant={filter === 'unpublished' ? 'default' : 'outline'}
            onClick={() => setFilter('unpublished')}
          >
            ที่ไม่เผยแพร่
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded border border-red-800 bg-red-900/30 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        renderSkeleton()
      ) : filtered.length === 0 ? (
        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Settings2 className="size-6" />
            </EmptyMedia>
            <EmptyTitle>ไม่พบบริการ</EmptyTitle>
            <EmptyDescription>ลองค้นหาด้วยคำอื่น หรือซิงก์ข้อมูลอีกครั้ง</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filtered.map((p) => {
            const catsForProduct = productCategories.get(p.id) || [];
            const labels = catsForProduct
              .map((cid) => categories.find((c) => c.id === cid)?.name)
              .filter(Boolean) as string[];
            return (
              <div
                key={p.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#111] to-[#050505] p-4 shadow-lg shadow-emerald-500/5"
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
                  {labels.slice(0, 3).map((label) => (
                    <Badge key={label} variant="outline" className="border-white/15 text-gray-200">
                      {label}
                    </Badge>
                  ))}
                  {labels.length > 3 && (
                    <Badge variant="outline" className="border-white/15 text-gray-400">
                      +{labels.length - 3}
                    </Badge>
                  )}
                </div>
                <div className="mt-4 flex flex-col gap-2 text-xs text-gray-400">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Banner</span>
                    <span className="truncate max-w-[60%] text-right">{p.banner_url ? 'ตั้งค่าแล้ว' : '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Icon ราคา</span>
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
                    setPricingProductId(p.id);
                    setPricingDialogOpen(true);
                  }}
                >
                  ตั้งค่าราคา
                </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (open) setEditDialogOpen(true);
          else closeEditModal();
        }}
      >
        <DialogContent className="max-w-3xl bg-[#050505] border border-white/15">
          <DialogHeader>
            <DialogTitle>แก้ไขบริการเติมเกม</DialogTitle>
            <p className="text-sm text-gray-400">ปรับรายละเอียดการแสดงผลและหมวดหมู่</p>
          </DialogHeader>
          {editingProduct ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-gray-400">ชื่อบริการ</label>
                  <Input value={editForm.name} onChange={(e) => updateEditForm('name', e.target.value)} className="mt-1" />
                </div>
                <div className="rounded-xl border border-white/10 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">สถานะการเผยแพร่</p>
                    <p className="text-xs text-gray-400 mt-1">กำหนดว่าจะให้ลูกค้าเห็นหรือไม่</p>
                  </div>
                  <Switch checked={editForm.is_published} onCheckedChange={(checked) => updateEditForm('is_published', checked)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-gray-400">รูปไอคอน</label>
                  <Input value={editForm.image_url} onChange={(e) => updateEditForm('image_url', e.target.value)} className="mt-1" placeholder="URL รูปไอคอน" />
                </div>
                <div>
                  <label className="text-xs uppercase text-gray-400">Icon ราคา</label>
                  <Input value={editForm.icon_url} onChange={(e) => updateEditForm('icon_url', e.target.value)} className="mt-1" placeholder="URL icon ราคา" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase text-gray-400">รูป Banner</label>
                  <Input value={editForm.banner_url} onChange={(e) => updateEditForm('banner_url', e.target.value)} className="mt-1" placeholder="URL Banner" />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase text-gray-400">หมวดหมู่</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const active = editForm.categories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategoryInForm(cat.id)}
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
                  <Switch checked={editForm.badge_enabled} onCheckedChange={(checked) => updateEditForm('badge_enabled', checked)} />
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
                    <label className="text-xs uppercase text-gray-400">เปอร์เซ็นต์ลด</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={editForm.badge_percent}
                      onChange={(e) => updateEditForm('badge_percent', e.target.value)}
                      className="mt-1"
                      disabled={!editForm.badge_enabled}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-gray-400">ข้อความป้าย</label>
                    <Input
                      value={editForm.badge_text}
                      onChange={(e) => updateEditForm('badge_text', e.target.value)}
                      className="mt-1"
                      placeholder="เช่น Flash Sale"
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
              {editSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PricingDialog
        open={pricingDialogOpen}
        productId={pricingProductId}
        onOpenChange={(open) => {
          setPricingDialogOpen(open);
          if (!open) {
            setPricingProductId(null);
            fetchAll();
          }
        }}
      />

      <Dialog open={discountDialogOpen} onOpenChange={(open) => setDiscountDialogOpen(open)}>
        <DialogContent className="max-w-4xl bg-[#050505] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>ปรับ % ส่วนลดตัวแทนก่อนซิงก์</DialogTitle>
            <DialogDescription className="text-gray-400">
              ตรวจสอบและกำหนดเปอร์เซ็นต์ส่วนลดของแต่ละเกม ก่อนดึงข้อมูลจาก wePAY
            </DialogDescription>
          </DialogHeader>
          {discountLoading ? (
            <div className="py-10 text-center text-gray-400">กำลังโหลดข้อมูล...</div>
          ) : discountProviders.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              ไม่พบข้อมูลเกมที่ต้องปรับส่วนลด
            </div>
          ) : (
            <div className="space-y-4 max-h-[65vh] overflow-hidden">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[220px]">
                  <Input
                    placeholder="ค้นหาเกม..."
                    value={discountSearch}
                    onChange={(e) => setDiscountSearch(e.target.value)}
                    className="bg-[#0f0f0f] border border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetDiscounts}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  รีเซ็ตเป็น 0%
                </Button>
              </div>
              <div className="border border-white/10 rounded-xl max-h-[55vh] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-gray-300 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-medium">เกม</th>
                      <th className="px-4 py-3 font-medium">มีในระบบ</th>
                      <th className="px-4 py-3 font-medium text-right">% ส่วนลด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDiscountProviders.map((provider) => (
                      <tr
                        key={provider.provider_company_id}
                        className="border-t border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{provider.provider_name}</div>
                          <div className="text-xs text-gray-400">ID: {provider.provider_company_id}</div>
                        </td>
                        <td className="px-4 py-3">
                          {provider.product_count > 0 ? (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
                              {provider.product_count} รายการ
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-white/20 text-gray-400">
                              ยังไม่มีในระบบ
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={provider.draft_percent}
                              onChange={(e) =>
                                handleChangeDiscountPercent(provider.provider_company_id, e.target.value)
                              }
                              className="w-24 text-right bg-[#0f0f0f] border border-gray-700 text-white focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
                              placeholder="0"
                            />
                            <span className="text-gray-400 text-xs">%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredDiscountProviders.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                          ไม่พบเกมตามคำค้นหา
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
            <p className="text-xs text-gray-500">
              * ส่วนลดนี้จะถูกนำไปใช้คำนวณราคาทุนทันทีเมื่อซิงก์จาก wePAY
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDiscountDialogOpen(false)}
                disabled={discountSaving || syncing}
                className="border-white/20 text-white hover:bg-white/10"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSync}
                disabled={discountSaving || syncing || discountProviders.length === 0}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
              >
                {discountSaving || syncing ? 'กำลังบันทึกและซิงก์...' : 'บันทึกและซิงก์'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


