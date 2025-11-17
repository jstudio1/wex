'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2 } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  is_published: boolean;
  show_on_homepage: boolean;
}

export default function CategoriesContent() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
      const json = await res.json();
      setCategories(json.data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.show({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'สร้างไม่สำเร็จ');
      }

      toast.show({ title: 'สำเร็จ', description: 'สร้างหมวดหมู่เรียบร้อย' });
      setName('');
      setSlug('');
      await fetchCategories();
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

  const handleTogglePublish = async (id: number, currentValue: boolean) => {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !currentValue }),
      });

      if (!res.ok) throw new Error('อัปเดตไม่สำเร็จ');

      toast.show({ title: 'สำเร็จ', description: 'อัปเดตเรียบร้อย' });
      await fetchCategories();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleHomepage = async (id: number, currentValue: boolean) => {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_on_homepage: !currentValue }),
      });

      if (!res.ok) throw new Error('อัปเดตไม่สำเร็จ');

      toast.show({ title: 'สำเร็จ', description: 'อัปเดตการแสดงหน้าแรกเรียบร้อย' });
      await fetchCategories();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?')) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('ลบไม่สำเร็จ');

      toast.show({ title: 'สำเร็จ', description: 'ลบหมวดหมู่เรียบร้อย' });
      await fetchCategories();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="card p-4 flex items-center gap-2 flex-wrap">
          <Skeleton className="h-10 flex-1 min-w-[150px]" />
          <Skeleton className="h-10 flex-1 min-w-[150px]" />
          <Skeleton className="h-10 w-20" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex-1">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">จัดการหมวดหมู่เติมเกม</h2>

      <form onSubmit={handleSubmit} className="card p-4 flex items-center gap-2 flex-wrap">
        <Input
          placeholder="ชื่อหมวดหมู่"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[150px]"
        />
        <Input
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="flex-1 min-w-[150px]"
        />
        <Button type="submit" disabled={saving}>
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              กำลังบันทึก...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Plus className="size-4" />
              เพิ่ม
            </span>
          )}
        </Button>
      </form>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="card p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex-1">
              <div className="font-medium">{cat.name}</div>
              <div className="text-sm text-[color:var(--text)]/60">slug: {cat.slug}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  cat.is_published
                    ? 'bg-emerald-500 text-white'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {cat.is_published ? 'เผยแพร่' : 'ซ่อน'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTogglePublish(cat.id, cat.is_published)}
              >
                สลับ
              </Button>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  cat.show_on_homepage
                    ? 'bg-blue-500 text-white'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {cat.show_on_homepage ? 'แสดงหน้าแรก' : 'ไม่แสดง'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleHomepage(cat.id, cat.show_on_homepage)}
              >
                สลับ
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(cat.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-8 text-[color:var(--text)]/60">ยังไม่มีหมวดหมู่</div>
      )}
    </div>
  );
}

