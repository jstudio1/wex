'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import type { BlogCategory, BlogCategoryFormData } from '@/types/blog';
import { slugify } from '@/lib/blog';

export default function BlogCategoriesContent() {
  const toast = useToast();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [formData, setFormData] = useState<BlogCategoryFormData>({
    name: '',
    slug: '',
    description: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog/categories');
      if (!res.ok) throw new Error('โหลดหมวดหมู่ไม่สำเร็จ');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenDialog = (category?: BlogCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.show({ title: 'กรุณากรอกชื่อหมวดหมู่', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const url = editingCategory
        ? `/api/admin/blog/categories/${editingCategory.id}`
        : '/api/admin/blog/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          slug: formData.slug || slugify(formData.name),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({ title: 'บันทึกสำเร็จ', description: 'บันทึกหมวดหมู่เรียบร้อยแล้ว' });
      setDialogOpen(false);
      fetchCategories();
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?')) return;

    try {
      const res = await fetch(`/api/admin/blog/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('ลบไม่สำเร็จ');
      toast.show({ title: 'ลบสำเร็จ', description: 'ลบหมวดหมู่เรียบร้อยแล้ว' });
      fetchCategories();
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">จัดการหมวดหมู่ Blog</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มหมวดหมู่
        </Button>
      </div>

      <div className="grid gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-black/30"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{category.name}</h3>
                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                  {category.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </Badge>
              </div>
              <p className="text-sm text-white/60">{category.slug}</p>
              {category.description && (
                <p className="text-sm text-white/70 mt-1">{category.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleOpenDialog(category)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(category.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</DialogTitle>
            <DialogDescription>จัดการข้อมูลหมวดหมู่ Blog</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">ชื่อหมวดหมู่ *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value, slug: slugify(e.target.value) })
                }
                placeholder="เช่น การใช้งาน, คู่มือ, วิธีแก้ไข"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="จะสร้างอัตโนมัติจากชื่อ"
              />
            </div>
            <div>
              <Label htmlFor="description">คำอธิบาย</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="คำอธิบายสั้นๆ เกี่ยวกับหมวดหมู่นี้"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">เปิดใช้งาน</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                บันทึก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

