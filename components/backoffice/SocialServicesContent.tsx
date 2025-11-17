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
import { RefreshCw, Save, Search, Globe, Users } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface SocialCategory {
  id: number;
  name: string;
  slug: string;
  is_published: boolean;
}

interface SocialService {
  id: number;
  provider_service_id: number;
  name: string;
  display_name: string | null;
  type: string;
  category_id: number | null;
  rate_usd: number;
  base_rate_thb: number;
  min_quantity: number;
  max_quantity: number;
  refill: boolean;
  cancel: boolean;
  is_published: boolean;
  markup_percent: number;
  markup_fixed: number;
  exchange_rate?: number;
  metadata: unknown;
  social_categories?: { id: number; name: string; slug: string } | null;
}

type DraftService = SocialService & { __dirty?: boolean };
type SocialServiceSnapshot = Pick<SocialService, 'id' | 'display_name' | 'markup_percent' | 'markup_fixed' | 'is_published' | 'category_id'>;

const currencyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB'
});

export default function SocialServicesContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [services, setServices] = useState<DraftService[]>([]);
  const [categories, setCategories] = useState<SocialCategory[]>([]);
  const [savingServiceIds, setSavingServiceIds] = useState<Set<number>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const initialServicesRef = useRef<SocialServiceSnapshot[]>([]);

  const [globalMarkup, setGlobalMarkup] = useState({ percent: '0', fixed: '0' });
  const [loadingGlobalMarkup, setLoadingGlobalMarkup] = useState(true);
  const [savingGlobalMarkup, setSavingGlobalMarkup] = useState(false);
  const [globalMarkupStatus, setGlobalMarkupStatus] = useState<'ok' | 'error' | null>(null);

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
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/social/services'),
        fetch('/api/admin/social/categories')
      ]);

      if (!servicesRes.ok) throw new Error('ไม่สามารถโหลดรายการบริการได้');
      if (!categoriesRes.ok) throw new Error('ไม่สามารถโหลดหมวดหมู่ได้');

      const servicesJson = await servicesRes.json();
      const categoriesJson = await categoriesRes.json();

      const servicesData = (servicesJson.data || []) as SocialService[];
      const categoriesData = (categoriesJson.data || []) as SocialCategory[];

      initialServicesRef.current = servicesData.map((svc) => ({
        id: svc.id,
        display_name: svc.display_name,
        markup_percent: svc.markup_percent,
        markup_fixed: svc.markup_fixed,
        is_published: svc.is_published,
        category_id: svc.category_id
      }));

      setServices(servicesData);
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
      const res = await fetch('/api/admin/social/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ซิงก์ไม่สำเร็จ');
      toast.show({ title: 'ซิงก์สำเร็จ', description: `อัปเดต ${json.counts?.services || 0} รายการ` });
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.show({ title: 'ซิงก์ไม่สำเร็จ', description: 'ตรวจสอบ API key และลองใหม่', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const markServiceDirty = (id: number, updater: (svc: DraftService) => DraftService) => {
    setServices((prev) => prev.map((svc) => {
      if (svc.id !== id) return svc;
      const updated = updater(svc);
      return { ...updated, __dirty: true };
    }));
  };


  const handleSaveSelected = async () => {
    // บันทึกทุกบริการที่มีการเปลี่ยนแปลง (__dirty === true)
    const idsToSave = services.filter((svc) => svc.__dirty).map((svc) => svc.id);
    
    if (idsToSave.length === 0) {
      toast.show({ title: 'ไม่มีการเปลี่ยนแปลง', description: 'ไม่มีข้อมูลที่ต้องบันทึก', variant: 'default' });
      return;
    }
    setSavingServiceIds(new Set(idsToSave));

    let successCount = 0;
    let errorCount = 0;

    for (const id of idsToSave) {
      const current = services.find((svc) => svc.id === id);
      if (!current) {
        errorCount++;
        continue;
      }

      const initial = initialServicesRef.current.find((svc) => svc.id === id);
      if (!initial) {
        errorCount++;
        continue;
      }

      const payload: Record<string, unknown> = {};
      if (current.display_name !== initial.display_name) payload.display_name = current.display_name;
      if (current.markup_percent !== initial.markup_percent) payload.markup_percent = Number(current.markup_percent) || 0;
      if (current.markup_fixed !== initial.markup_fixed) payload.markup_fixed = Number(current.markup_fixed) || 0;
      if (current.is_published !== initial.is_published) payload.is_published = current.is_published;
      if (current.category_id !== initial.category_id) payload.category_id = current.category_id;

      if (!Object.keys(payload).length) {
        continue;
      }

      try {
        const res = await fetch(`/api/admin/social/services/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

        initialServicesRef.current = initialServicesRef.current.map((svc) =>
          svc.id === id
            ? {
                id,
                display_name: current.display_name,
                markup_percent: Number(current.markup_percent) || 0,
                markup_fixed: Number(current.markup_fixed) || 0,
                is_published: current.is_published,
                category_id: current.category_id ?? null
              }
            : svc
        );

        setServices((prev) => prev.map((svc) => (svc.id === id ? { ...svc, __dirty: false } : svc)));
        successCount++;
      } catch (error) {
        console.error(error);
        errorCount++;
      }
    }

    setSavingServiceIds(new Set());

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
    const unpublishedServices = services.filter((svc) => !svc.is_published);
    if (unpublishedServices.length === 0) {
      toast.show({ title: 'ไม่มีการเปลี่ยนแปลง', description: 'บริการทั้งหมดถูกเผยแพร่แล้ว', variant: 'default' });
      return;
    }

    if (!confirm(`ต้องการเผยแพร่บริการทั้งหมด ${unpublishedServices.length} รายการหรือไม่?`)) {
      return;
    }

    setSavingServiceIds(new Set(unpublishedServices.map((svc) => svc.id)));

    let successCount = 0;
    let errorCount = 0;

    for (const svc of unpublishedServices) {
      try {
        const res = await fetch(`/api/admin/social/services/${svc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_published: true })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

        initialServicesRef.current = initialServicesRef.current.map((item) =>
          item.id === svc.id ? { ...item, is_published: true } : item
        );

        setServices((prev) => prev.map((item) => (item.id === svc.id ? { ...item, is_published: true, __dirty: false } : item)));
        successCount++;
      } catch (error) {
        console.error(error);
        errorCount++;
      }
    }

    setSavingServiceIds(new Set());

    if (errorCount > 0) {
      toast.show({
        title: `เผยแพร่สำเร็จ ${successCount} รายการ`,
        description: `มี ${errorCount} รายการที่เผยแพร่ไม่สำเร็จ`,
        variant: errorCount === unpublishedServices.length ? 'destructive' : 'default'
      });
    } else {
      toast.show({ title: `เผยแพร่สำเร็จ ${successCount} รายการ` });
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      const matchCategory = filterCategoryId === 'all' || svc.category_id === filterCategoryId;
      const text = filterText.trim().toLowerCase();
      const matchText = !text || [svc.name, svc.display_name, svc.provider_service_id.toString()].some((v) => v?.toLowerCase().includes(text));
      return matchCategory && matchText;
    });
  }, [services, filterCategoryId, filterText]);

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(start, start + itemsPerPage);
  }, [filteredServices, currentPage]);


  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, filterCategoryId]);

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
            <h2 className="text-lg font-semibold">ซิงก์บริการปั้มโซเชียล</h2>
            <p className="text-sm text-[color:var(--text)]/60">ดึงข้อมูลล่าสุดจากผู้ให้บริการ (API ส่งราคาเป็นบาทมาให้แล้ว)</p>
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
            {syncing ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
            {syncing ? 'กำลังซิงก์...' : 'ซิงก์จากผู้ให้บริการ'}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="search-services">ค้นหาบริการ</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--text)]/40" />
              <Input
                id="search-services"
                placeholder="ค้นหาจากชื่อบริการหรือ ID"
                className="pl-9"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-category">กรองตามหมวดหมู่</Label>
            <select
              id="filter-category"
              className="input"
              value={filterCategoryId === 'all' ? 'all' : String(filterCategoryId)}
              onChange={(e) => {
                const val = e.target.value;
                setFilterCategoryId(val === 'all' ? 'all' : Number(val));
              }}
            >
              <option value="all">ทั้งหมด</option>
              {categories.filter((cat) => cat.is_published).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card p-4 space-y-4">
        <h2 className="text-lg font-semibold mb-2">ตั้งค่ากำไร สำหรับทุกบริการ</h2>
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
              <p className="text-xs text-[color:var(--text)]/50">กำไรเป็นเปอร์เซ็นต์ที่บวกเข้ากับราคาทุกบริการ</p>
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
              <p className="text-xs text-[color:var(--text)]/50">กำไรคงที่ที่บวกเข้ากับราคาทุกบริการ (บาท)</p>
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
          <p className="text-xs text-[color:var(--text)]/50">หมายเหตุ: การตั้งค่านี้จะถูกบวกเข้ากับราคาทุกบริการโซเชียล (หลังจากบวก markup ของแต่ละบริการแล้ว)</p>
        </form>
      </section>

      <section className="card p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold">จัดการบริการโซเชียล</h2>
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
              disabled={savingServiceIds.size > 0 || services.filter((svc) => !svc.is_published).length === 0}
              variant="outline"
              className="gap-2"
            >
              {savingServiceIds.size > 0 && services.filter((svc) => !svc.is_published && savingServiceIds.has(svc.id)).length > 0 ? (
                <>
                  <Spinner className="size-4" />
                  กำลังเผยแพร่...
                </>
              ) : (
                <>
                  <Globe className="size-4" />
                  เผยแพร่บริการทั้งหมด ({services.filter((svc) => !svc.is_published).length})
                </>
              )}
            </Button>
            <Button
              onClick={handleSaveSelected}
              disabled={savingServiceIds.size > 0 || services.filter((svc) => svc.__dirty).length === 0}
              className="gap-2"
            >
              {savingServiceIds.size > 0 ? (
                <>
                  <Spinner className="size-4" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  บันทึกทั้งหมด ({services.filter((svc) => svc.__dirty).length})
                </>
              )}
            </Button>
          </div>
        </div>


        <div className="space-y-3 max-h-[calc(100vh-450px)] overflow-y-auto overflow-x-hidden pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
          {paginatedServices.map((svc) => {
            const category = categories.find((cat) => cat.id === svc.category_id);
            const basePrice = currencyFormatter.format(svc.base_rate_thb);
            return (
              <div key={svc.id} className={`rounded-lg border p-4 space-y-4 transition-colors ${svc.__dirty ? 'border-accent/50 bg-accent/5' : 'border-white/10 bg-white/5'}`}>
                <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-[color:var(--text)]/60">Service ID #{svc.provider_service_id}</div>
                    <h4 className="text-lg font-semibold">{svc.name}</h4>
                    <div className="text-xs text-[color:var(--text)]/40">ประเภท: {svc.type || '-'}</div>
                  </div>
                  <div className="text-right text-sm text-[color:var(--text)]/70">
                    <div>ราคาต้นทุน (ต่อ 1000): {basePrice}</div>
                    <div>จำนวน: {svc.min_quantity} - {svc.max_quantity}</div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>ชื่อแสดง (หน้าเว็บ)</Label>
                    <Input value={svc.display_name ?? ''} onChange={(e) => markServiceDirty(svc.id, (prev) => ({ ...prev, display_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>หมวดหมู่</Label>
                    <select
                      className="input"
                      value={svc.category_id ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        markServiceDirty(svc.id, (prev) => ({ ...prev, category_id: val ? Number(val) : null }));
                      }}
                    >
                      <option value="">ยังไม่จัดหมวด</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Markup %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={svc.markup_percent}
                      onChange={(e) => markServiceDirty(svc.id, (prev) => ({ ...prev, markup_percent: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Markup คงที่ (บาท)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={svc.markup_fixed}
                      onChange={(e) => markServiceDirty(svc.id, (prev) => ({ ...prev, markup_fixed: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 px-3">
                    <div>
                      <Label className="text-xs text-[color:var(--text)]/60">เผยแพร่</Label>
                      <div className="text-sm font-medium">{svc.is_published ? 'เปิดขาย' : 'ซ่อนอยู่'}</div>
                    </div>
                    <Switch checked={svc.is_published} onCheckedChange={(checked) => markServiceDirty(svc.id, (prev) => ({ ...prev, is_published: checked }))} />
                  </div>
                </div>

                </div>
              </div>
            );
          })}

          {paginatedServices.length === 0 && (
            <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users className="size-6" />
                </EmptyMedia>
                <EmptyTitle>ไม่พบบริการที่ตรงกับเงื่อนไข</EmptyTitle>
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
  );
}

