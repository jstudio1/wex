'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SpinnerCustom } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Save, Edit, Trash2, Plus, Grid3x3 } from 'lucide-react';

type GameCategory = {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export default function GameCategoriesContent() {
  const toast = useToast();
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState<'create' | 'edit' | null>(null);
  const [currentCategory, setCurrentCategory] = useState<GameCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', image_url: '', is_published: true });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/game-categories');
      if (!res.ok) throw new Error('ไม่สามารถโหลดหมวดหมู่ได้');
      const json = await res.json();
      setCategories(json.data || []);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setCurrentCategory(null);
    setFormData({ name: '', slug: '', image_url: '', is_published: true });
    setOpenDialog('create');
  };

  const openEditDialog = (category: GameCategory) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      image_url: category.image_url || '',
      is_published: category.is_published
    });
    setOpenDialog('edit');
  };

  const closeDialog = () => {
    setOpenDialog(null);
    setCurrentCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.show({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const url = currentCategory 
        ? '/api/admin/game-categories'
        : '/api/admin/game-categories';
      
      const method = currentCategory ? 'PUT' : 'POST';
      const body: any = {
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        image_url: formData.image_url.trim() || null,
        is_published: formData.is_published
      };

      if (currentCategory) {
        body.id = currentCategory.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({ 
        title: 'สำเร็จ', 
        description: currentCategory ? 'บันทึกการแก้ไขเรียบร้อย' : 'สร้างหมวดหมู่เรียบร้อย' 
      });
      closeDialog();
      await fetchData();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่นี้?')) return;

    try {
      const res = await fetch(`/api/admin/game-categories?id=${id}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'ลบไม่สำเร็จ');
      }

      toast.show({ title: 'สำเร็จ', description: 'ลบหมวดหมู่เรียบร้อย' });
      await fetchData();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="hidden lg:block card p-4 overflow-x-auto">
          <div className="min-w-[760px] space-y-2">
            <div className="grid grid-cols-6 gap-2 pb-2 border-b border-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 py-2 border-b border-border/50">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1 sm:text-2xl sm:mb-2">จัดการหมวดหมู่สินค้าอื่นๆ</h2>
          <p className="text-xs sm:text-sm text-[color:var(--text)]/60">เพิ่ม แก้ไข และลบหมวดหมู่สินค้าอื่นๆ</p>
        </div>
        <Dialog open={openDialog !== null} onOpenChange={(open) => {
          if (!open) closeDialog();
        }}>
          <Button onClick={() => openCreateDialog()} className="gap-2 self-start sm:self-auto">
            <Plus className="size-4" />
            เพิ่มหมวดหมู่
          </Button>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{currentCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</DialogTitle>
                <DialogDescription>
                  {currentCategory ? 'แก้ไขข้อมูลหมวดหมู่สินค้าอื่นๆ' : 'เพิ่มหมวดหมู่สินค้าอื่นๆใหม่'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-3">
                  <Label htmlFor="name">ชื่อหมวดหมู่ *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="เช่น Mobile Games, PC Games"
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="เช่น mobile-games, pc-games"
                    required
                  />
                  <p className="text-xs text-[color:var(--text)]/60">ใช้สำหรับ filter URL (ตัวพิมพ์เล็ก, ขีดกลาง)</p>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="image_url">URL รูปภาพ</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-xs text-[color:var(--text)]/60">รูปภาพที่จะใช้แสดงในปุ่มหมวดหมู่ (ถ้าไม่ระบุจะใช้รูป default)</p>
                  {formData.image_url && (
                    <div className="mt-2 rounded-lg border border-emerald-500/20 overflow-hidden bg-black/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formData.image_url} alt="Preview" className="w-full h-auto max-h-40 object-contain" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/20 bg-emerald-900/10">
                  <div className="flex-1">
                    <Label htmlFor="is_published" className="cursor-pointer text-sm font-medium">
                      เผยแพร่
                    </Label>
                    <p className="text-xs text-[color:var(--text)]/60 mt-0.5">
                      หมวดหมู่จะแสดงในหน้า /categories เฉพาะเมื่อเปิดใช้งาน
                    </p>
                  </div>
                  <Switch
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={saving}>
                    ยกเลิก
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <SpinnerCustom className="size-4" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      บันทึก
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/20 bg-card py-12 text-center text-[color:var(--text)]/60">
          ไม่มีหมวดหมู่
        </div>
      ) : (
        <>
          {/* Mobile / Tablet: card list */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex gap-3 rounded-xl border border-emerald-500/20 bg-card p-4"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-emerald-500/20 bg-black/30">
                  {category.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.image_url} alt={category.name} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/50">
                      <Grid3x3 className="size-6 text-[color:var(--text)]/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="truncate font-semibold text-[color:var(--text)]">{category.name}</div>
                  <code className="block truncate text-xs text-[color:var(--text)]/60">{category.slug}</code>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={category.is_published}
                      onCheckedChange={async (checked) => {
                        try {
                          const res = await fetch('/api/admin/game-categories', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: category.id, is_published: checked })
                          });
                          if (!res.ok) throw new Error('อัพเดทไม่สำเร็จ');
                          toast.show({
                            title: 'สำเร็จ',
                            description: checked ? 'เปิดเผยแพร่แล้ว' : 'ปิดเผยแพร่แล้ว'
                          });
                          await fetchData();
                        } catch (err) {
                          toast.show({
                            title: 'เกิดข้อผิดพลาด',
                            description: (err as Error).message,
                            variant: 'destructive'
                          });
                        }
                      }}
                    />
                    <span className="text-xs text-[color:var(--text)]/60">
                      {category.is_published ? 'แสดง' : 'ซ่อน'}
                    </span>
                  </div>
                  <div className="text-xs text-[color:var(--text)]/40">
                    {new Date(category.created_at).toLocaleDateString('th-TH')}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                      className="flex-1 gap-1.5"
                    >
                      <Edit className="size-3.5" />
                      แก้ไข
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                      className="flex-1 gap-1.5 text-red-300 hover:text-red-200"
                    >
                      <Trash2 className="size-3.5" />
                      ลบ
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden rounded-xl border border-emerald-500/20 bg-card overflow-x-auto lg:block">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="border-emerald-500/15 hover:bg-emerald-900/15">
                  <TableHead>รูปภาพ</TableHead>
                  <TableHead>ชื่อหมวดหมู่</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="w-[160px]">สถานะ</TableHead>
                  <TableHead className="w-[140px]">สร้างเมื่อ</TableHead>
                  <TableHead className="w-[170px] text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} className="border-border hover:bg-muted/50">
                    <TableCell>
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-emerald-500/20 bg-black/30">
                        {category.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={category.image_url}
                            alt={category.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                            <Grid3x3 className="size-6 text-[color:var(--text)]/30" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-[color:var(--text)]">{category.name}</div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm text-[color:var(--text)]/60">{category.slug}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={category.is_published}
                          onCheckedChange={async (checked) => {
                            try {
                              const res = await fetch('/api/admin/game-categories', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: category.id, is_published: checked })
                              });
                              if (!res.ok) throw new Error('อัพเดทไม่สำเร็จ');
                              toast.show({
                                title: 'สำเร็จ',
                                description: checked ? 'เปิดเผยแพร่แล้ว' : 'ปิดเผยแพร่แล้ว'
                              });
                              await fetchData();
                            } catch (err) {
                              toast.show({
                                title: 'เกิดข้อผิดพลาด',
                                description: (err as Error).message,
                                variant: 'destructive'
                              });
                            }
                          }}
                        />
                        <span className="text-xs text-[color:var(--text)]/60">
                          {category.is_published ? 'แสดงใน /categories' : 'ซ่อนจาก /categories'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-[color:var(--text)]/60">
                        {new Date(category.created_at).toLocaleDateString('th-TH')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(category)}
                          className="gap-2"
                        >
                          <Edit className="size-4" />
                          แก้ไข
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                          className="gap-2 text-red-300 hover:text-red-200"
                        >
                          <Trash2 className="size-4" />
                          ลบ
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

