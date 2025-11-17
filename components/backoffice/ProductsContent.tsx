'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SearchIcon, ChevronDown, Save, Package } from 'lucide-react';
import Link from 'next/link';
import PricingDialog from './PricingDialog';
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

export default function ProductsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCategories, setProductCategories] = useState<Map<number, number[]>>(new Map());
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<'ok' | 'error' | null>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes, pcRes] = await Promise.all([
        fetch(`/api/admin/products?filter=${filter}`),
        fetch('/api/admin/categories'),
        fetch('/api/admin/products/categories'),
      ]);

      if (!productsRes.ok) throw new Error('ไม่สามารถโหลดบริการได้');
      if (!categoriesRes.ok) throw new Error('ไม่สามารถโหลดหมวดหมู่ได้');

      const productsJson = await productsRes.json();
      const categoriesJson = await categoriesRes.json();
      const pcJson = pcRes.ok ? await pcRes.json() : { data: [] };

      setProducts(productsJson.data || []);

      // ใช้หมวดหมู่ทั้งหมด (filter ใน server ถ้าต้องการ)
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
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/products/sync', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Sync ไม่สำเร็จ');
      toast.show({ title: 'สำเร็จ', description: 'Sync เรียบร้อย' });
      await fetchData();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handlePublishAll = async () => {
    if (!confirm('คุณต้องการเผยแพร่ทุกเกมที่ยังไม่เผยแพร่หรือไม่?')) {
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
      toast.show({ title: 'สำเร็จ', description: 'เผยแพร่ทุกเกมเรียบร้อย' });
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const formData = new FormData(e.currentTarget);
      const productIds = formData.getAll('product_ids').map(v => Number(String(v)));

      const updates = productIds.map((pid) => {
        const name = String(formData.get(`name_${pid}`) || '').trim();
        const image = String(formData.get(`image_${pid}`) || '').trim();
        const iconRaw = formData.get(`icon_${pid}`);
        const icon = iconRaw ? String(iconRaw).trim() : '';
        const publish = formData.get(`publish_${pid}`) != null;
        const badgeEnabled = formData.get(`badge_enabled_${pid}`) != null;
        const badgePercentRaw = formData.get(`badge_percent_${pid}`);
        let badgePercent: number | null = null;
        if (badgePercentRaw !== null && String(badgePercentRaw).trim().length) {
          const parsed = Number(String(badgePercentRaw));
          if (!Number.isNaN(parsed)) {
            badgePercent = Math.max(0, Math.round(parsed));
          }
        }
        const badgeTextRaw = formData.get(`badge_text_${pid}`);
        const badgeText = typeof badgeTextRaw === 'string' ? badgeTextRaw.trim() : '';
        const badgeApply = formData.get(`badge_apply_price_${pid}`) != null;
        const selected = formData.getAll(`cat_${pid}`).map((v) => Number(String(v)));

        const update = {
          id: pid,
          name,
          image_url: image || null,
          icon_url: icon || null,
          is_published: publish,
          badge_enabled: badgeEnabled,
          badge_percent: badgePercent,
          badge_text: badgeText || null,
          badge_apply_price: badgeApply,
          categories: selected,
        };
        
        return update;
      });

      const res = await fetch('/api/admin/products/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updates }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'บันทึกไม่สำเร็จ');
      }

      setStatusMessage('ok');
      toast.show({ title: 'สำเร็จ', description: 'บันทึกการตั้งค่าเรียบร้อย' });
      
      // Force refresh data after a short delay to ensure DB is updated
      setTimeout(async () => {
        await fetchData();
      }, 500);
    } catch (err) {
      setStatusMessage('error');
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
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-3 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="min-w-0">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-24 mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-72" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold">จัดการเติมเกม</h2>
        <div className="flex items-center gap-2">
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
              'เผยแพร่ทุกเกม'
            )}
          </Button>
          <form onSubmit={(e) => { e.preventDefault(); handleSync(); }}>
            <Button type="submit" variant="outline" size="sm" disabled={syncing}>
              {syncing ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  กำลังซิงก์...
                </span>
              ) : (
                'Sync จากผู้ให้บริการ'
              )}
            </Button>
          </form>
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

      {statusMessage === 'ok' && (
        <Alert>
          <AlertTitle>บันทึกสำเร็จ</AlertTitle>
          <AlertDescription>อัปเดตการตั้งค่าเรียบร้อย</AlertDescription>
        </Alert>
      )}
      {statusMessage === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
          <AlertDescription>บันทึกไม่สำเร็จ โปรดลองใหม่</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center flex-wrap gap-2 -mt-2">
        <Link href="/admin/pricing" className="px-3 py-2 text-xs rounded border border-white/10 hover:bg-white/5">
          ควบคุมราคา (ทั้งเว็บ)
        </Link>
        <Button type="submit" form="products-form" disabled={saving}>
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              กำลังบันทึก...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Save className="size-4" />
              บันทึกทั้งหมด
            </span>
          )}
        </Button>
      </div>

      <form id="products-form" onSubmit={handleSubmit} className="space-y-2">
        <div className="max-h-[calc(100vh-400px)] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
          {filteredProducts.map((p) => {
          const catsForProduct = productCategories.get(p.id) || [];
          return (
            <div key={p.id} className="card p-3">
              <div className="flex flex-col gap-3">
                {/* บรรทัดแรก: ข้อมูลบริการ */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-white/10 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <input type="hidden" name="product_ids" value={String(p.id)} />
                      <div className="flex items-center gap-2">
                        <Input name={`name_${p.id}`} key={`name_${p.id}_${p.name}`} defaultValue={p.name} className="w-[240px]" />
                      </div>
                      <div className="text-xs text-[color:var(--text)]/60 truncate mt-1">key: {p.key}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 md:justify-end flex-1 md:flex-none min-w-[200px] md:min-w-[288px]">
                      <Input className="w-full md:w-72" name={`image_${p.id}`} key={`image_${p.id}_${p.image_url || ''}`} defaultValue={p.image_url || ''} placeholder="วางลิงก์รูป..." />
                    </div>
                    <div className="flex items-center gap-2 md:justify-end flex-1 md:flex-none min-w-[200px] md:min-w-[288px]">
                      <Input className="w-full md:w-72" name={`icon_${p.id}`} key={`icon_${p.id}_${p.icon_url || ''}`} defaultValue={p.icon_url || ''} placeholder="วางลิงก์ Icon (สำหรับแสดงในรายการราคา)..." />
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setPricingDialogOpen(true);
                      }}
                      className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-medium transition-colors shrink-0 whitespace-nowrap"
                    >
                      กำหนดราคา
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                          p.is_published ? 'bg-emerald-600/30 text-emerald-300' : 'bg-white/10 text-[color:var(--text)]/60'
                        }`}
                      >
                        {p.is_published ? 'เผยแพร่' : 'ยังไม่เผยแพร่'}
                      </span>
                      <Switch
                        id={`pub_${p.id}`}
                        name={`publish_${p.id}`}
                        value="1"
                        defaultChecked={p.is_published}
                      />
                    </div>
                  </div>
                </div>

                {/* บรรทัดที่ 2: หมวดหมู่ */}
                {categories && categories.length > 0 && (
                  <div className="card p-3 flex flex-wrap items-center gap-3">
                    <div className="text-xs text-[color:var(--text)]/70 mr-2 shrink-0">หมวดหมู่:</div>
                    {categories.map((c) => {
                      const checked = catsForProduct.includes(c.id);
                      return (
                        <div key={c.id} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-2 py-1">
                          <Switch
                            id={`p${p.id}-c${c.id}`}
                            name={`cat_${p.id}`}
                            value={String(c.id)}
                            defaultChecked={checked}
                          />
                          <Label htmlFor={`p${p.id}-c${c.id}`} className="text-xs cursor-pointer">
                            {c.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* บรรทัดที่ 3: Badge Settings */}
                <div className="card p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Switch
                      id={`badge_${p.id}`}
                      name={`badge_enabled_${p.id}`}
                      value="1"
                      defaultChecked={p.badge_enabled}
                    />
                    <Label htmlFor={`badge_${p.id}`} className="text-xs cursor-pointer">
                      แสดง Badge โปรโมชั่น
                    </Label>
                    {p.badge_enabled && ((p.badge_text && p.badge_text.trim().length) || p.badge_percent != null) && (
                      <span className="text-xs text-[color:var(--text)]/60">
                        ตัวอย่าง: {p.badge_text || `${p.badge_percent}% OFF`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`badge_apply_${p.id}`}
                      name={`badge_apply_price_${p.id}`}
                      value="1"
                      defaultChecked={p.badge_apply_price}
                    />
                    <Label htmlFor={`badge_apply_${p.id}`} className="text-xs cursor-pointer">
                      ลดราคาจริง (ปรับราคาขาย)
                    </Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      name={`badge_percent_${p.id}`}
                      defaultValue={p.badge_percent != null ? String(p.badge_percent) : ''}
                      placeholder="% ลด"
                      className="w-24"
                    />
                    <Input
                      name={`badge_text_${p.id}`}
                      defaultValue={p.badge_text || ''}
                      placeholder="ข้อความ badge เช่น Flash Sale"
                      className="flex-1 min-w-[200px]"
                    />
                  </div>
                  <p className="text-xs text-[color:var(--text)]/50">
                    ถ้าปล่อยว่างข้อความ ระบบจะแสดงตามเปอร์เซ็นต์ เช่น 10% OFF
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </form>

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

      <PricingDialog
        open={pricingDialogOpen}
        onOpenChange={setPricingDialogOpen}
        productId={selectedProductId}
      />
    </div>
  );
}
