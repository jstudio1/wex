'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Save, Plus, X, Image as ImageIcon } from 'lucide-react';

interface Popup {
  id: number;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export default function PopupContent() {
  const toast = useToast();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    fetchPopups();
  }, []);

  const fetchPopups = async () => {
    try {
      const res = await fetch('/api/admin/popup', { cache: 'no-store' });
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
      const json = await res.json();
      if (json.image_url && json.id) {
        setPopups([{ 
          id: json.id, 
          image_url: json.image_url, 
          created_at: json.created_at, 
          updated_at: json.updated_at || json.created_at 
        }]);
      } else {
        setPopups([]);
      }
    } catch (err) {
      console.error('Fetch popups error:', err);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
      setPopups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      toast.show({
        title: 'กรุณากรอก URL รูปภาพ',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/popup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl.trim() }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({ title: 'สำเร็จ', description: 'บันทึกรูป popup เรียบร้อย' });
      setImageUrl('');
      setShowForm(false);
      await fetchPopups();
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

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบ popup นี้?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/popup/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('ลบไม่สำเร็จ');

      toast.show({ title: 'สำเร็จ', description: 'ลบ popup เรียบร้อย' });
      await fetchPopups();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="card p-4 space-y-4">
          <Skeleton className="h-64 w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">จัดการ Popup Notification</h2>
        <Button onClick={() => setShowForm(true)} variant="outline">
          <Plus className="size-4 mr-2" />
          เพิ่ม Popup
        </Button>
      </div>

      {showForm && (
        <div className="card p-6 space-y-4 border-2 border-accent/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">เพิ่ม Popup ใหม่</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
              <X className="size-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="image_url">URL รูปภาพ Popup *</Label>
              <Input
                id="image_url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/popup-image.jpg"
                required
              />
              <p className="text-xs text-[color:var(--text)]/50">ใส่ URL รูปภาพสี่เหลี่ยมที่จะแสดงใน popup</p>
              {imageUrl && (
                <div className="mt-3 rounded-lg border border-border overflow-hidden bg-muted/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Preview" className="w-full h-auto max-h-64 object-contain" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    กำลังบันทึก...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Save className="size-4" />
                    บันทึก
                  </span>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                ยกเลิก
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-4">รายการ Popup</h2>
        {popups.length === 0 ? (
          <div className="text-center py-8 text-[color:var(--text)]/60">
            <ImageIcon className="size-12 mx-auto mb-3 opacity-50" />
            <p>ยังไม่มี Popup</p>
          </div>
        ) : (
          <div className="space-y-4">
            {popups.map((popup) => (
              <div key={popup.id} className="p-4 rounded-lg border border-border bg-muted/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-[color:var(--text)]/50 mb-2">
                      สร้างเมื่อ: {new Date(popup.created_at).toLocaleString('th-TH')}
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden bg-muted/50 max-w-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={popup.image_url} alt="Popup" className="w-full h-auto max-h-48 object-contain" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(popup.id)}
                    disabled={deletingId === popup.id}
                  >
                    {deletingId === popup.id ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner />
                        กำลังลบ...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Trash2 className="size-4" />
                        ลบ
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
