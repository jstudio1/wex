'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner, SpinnerCustom } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Save, Search, FolderTree } from 'lucide-react';
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

type DraftCategory = SocialCategory & { __dirty?: boolean };

export default function SocialCategoriesContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<DraftCategory[]>([]);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const initialCategoriesRef = useRef<SocialCategory[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/social/categories');
      if (!res.ok) throw new Error('ไม่สามารถโหลดหมวดหมู่ได้');

      const json = await res.json();
      const categoriesData = (json.data || []) as SocialCategory[];

      initialCategoriesRef.current = categoriesData;
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลได้', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const markCategoryDirty = (id: number, updater: (cat: DraftCategory) => DraftCategory) => {
    setCategories((prev) => prev.map((cat) => {
      if (cat.id !== id) return cat;
      const updated = updater(cat);
      return { ...updated, __dirty: true };
    }));
  };

  const handleSaveCategory = async (id: number) => {
    const current = categories.find((cat) => cat.id === id);
    const initial = initialCategoriesRef.current.find((cat) => cat.id === id);
    if (!current || !initial) return;

    const payload: Record<string, unknown> = {};
    if (current.name !== initial.name) payload.name = current.name;
    if (current.is_published !== initial.is_published) payload.is_published = current.is_published;

    if (!Object.keys(payload).length) {
      toast.show({ title: 'ไม่มีการเปลี่ยนแปลง', description: 'ข้อมูลเหมือนเดิม', variant: 'default' });
      return;
    }

    setSavingCategoryId(id);
    try {
      const res = await fetch('/api/admin/social/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

      initialCategoriesRef.current = initialCategoriesRef.current.map((cat) =>
        cat.id === id ? { ...cat, name: current.name, is_published: current.is_published } : cat
      );

      setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, __dirty: false } : cat)));
      toast.show({ title: 'บันทึกหมวดหมู่สำเร็จ' });
    } catch (error) {
      console.error(error);
      toast.show({ title: 'บันทึกไม่สำเร็จ', description: 'โปรดลองใหม่', variant: 'destructive' });
    } finally {
      setSavingCategoryId(null);
    }
  };

  const filteredCategories = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return categories.filter((cat) => !text || cat.name.toLowerCase().includes(text));
  }, [categories, searchText]);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(start, start + itemsPerPage);
  }, [filteredCategories, currentPage]);

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="card p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="card p-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex-1 min-w-[200px]">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-9 w-16" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold">จัดการหมวดหมู่โซเชียล</h2>
            <p className="text-sm text-[color:var(--text)]/60">แก้ไขชื่อหมวดหมู่และตั้งค่าการเผยแพร่เพื่อแสดงในเว็บ</p>
          </div>
          {totalPages > 1 && (
            <div className="text-sm text-[color:var(--text)]/70">
              หน้า {currentPage} / {totalPages}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="search-categories">ค้นหาหมวดหมู่</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--text)]/40" />
            <Input
              id="search-categories"
              placeholder="ค้นหาชื่อหมวดหมู่"
              className="pl-9"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 max-h-[calc(100vh-300px)] overflow-y-auto overflow-x-hidden pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
          {paginatedCategories.map((cat) => (
            <div key={cat.id} className="rounded-lg border border-white/10 p-3 space-y-3 bg-white/5">
              <div className="space-y-1">
                <Label>ชื่อหมวดหมู่</Label>
                <Input value={cat.name} onChange={(e) => markCategoryDirty(cat.id, (prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-[color:var(--text)]/60">เผยแพร่</Label>
                  <Switch checked={cat.is_published} onCheckedChange={(checked) => markCategoryDirty(cat.id, (prev) => ({ ...prev, is_published: checked }))} />
                </div>
                <Button size="sm" className="gap-2" onClick={() => handleSaveCategory(cat.id)} disabled={savingCategoryId === cat.id}>
                  {savingCategoryId === cat.id ? <Spinner className="size-4" /> : <Save className="size-4" />}
                  บันทึก
                </Button>
              </div>
            </div>
          ))}

          {paginatedCategories.length === 0 && (
            <div className="col-span-2">
              <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderTree className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>ไม่พบหมวดหมู่ที่ตรงกับการค้นหา</EmptyTitle>
                  <EmptyDescription>
                    ลองค้นหาด้วยคำอื่น หรือเพิ่มหมวดหมู่ใหม่
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
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

