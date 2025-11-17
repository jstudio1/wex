'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit, Plus, X, Save, Gift } from 'lucide-react';

interface RedeemCode {
  id: number;
  code: string;
  points: string;
  usage_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function RedeemCodesContent() {
  const toast = useToast();
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    points: '',
    usage_limit: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
    description: '',
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const res = await fetch('/api/admin/redeem-codes');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
      const json = await res.json();
      setCodes(json.data || []);
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

  const resetForm = () => {
    setFormData({
      code: '',
      points: '',
      usage_limit: '',
      valid_from: '',
      valid_until: '',
      is_active: true,
      description: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (code: RedeemCode) => {
    setFormData({
      code: code.code,
      points: code.points,
      usage_limit: code.usage_limit?.toString() || '',
      valid_from: new Date(code.valid_from).toISOString().slice(0, 16),
      valid_until: code.valid_until ? new Date(code.valid_until).toISOString().slice(0, 16) : '',
      is_active: code.is_active,
      description: code.description || '',
    });
    setEditingId(code.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: any = {
        code: formData.code.trim(),
        points: Number(formData.points),
        is_active: formData.is_active,
        description: formData.description.trim() || null,
      };

      if (formData.usage_limit) {
        payload.usage_limit = Number(formData.usage_limit);
      }
      if (formData.valid_from) {
        payload.valid_from = new Date(formData.valid_from).toISOString();
      }
      payload.valid_until = formData.valid_until ? new Date(formData.valid_until).toISOString() : null;

      let res;
      if (editingId) {
        res = await fetch(`/api/admin/redeem-codes/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/redeem-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({
        title: 'สำเร็จ',
        description: editingId ? 'อัปเดตโค้ดเรียบร้อย' : 'สร้างโค้ดเรียบร้อย',
      });

      resetForm();
      await fetchCodes();
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
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบโค้ดนี้?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/redeem-codes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('ลบไม่สำเร็จ');

      toast.show({ title: 'สำเร็จ', description: 'ลบโค้ดเรียบร้อย' });
      await fetchCodes();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Skeleton className="h-6 w-32" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-9" />
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">จัดการโค้ดเติมพอยต์</h2>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2">
          <Plus className="size-4" />
          สร้างโค้ดใหม่
        </Button>
      </div>

      {showForm && (
        <div className="card p-6 space-y-4 border-2 border-accent/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingId ? 'แก้ไขโค้ด' : 'สร้างโค้ดใหม่'}</h2>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="size-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">โค้ด *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="REDEEM2024"
                  required
                  maxLength={50}
                  className="font-mono"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="points">จำนวนพอยต์ *</Label>
                <Input
                  id="points"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.points}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setFormData({ ...formData, points: val });
                    }
                  }}
                  placeholder="0"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="usage_limit">จำนวนครั้งที่ใช้ได้ (เว้นว่าง = ไม่จำกัด)</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="ไม่จำกัด"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valid_from">เริ่มใช้ได้วันที่ (เว้นว่าง = ทันที)</Label>
                <Input
                  id="valid_from"
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valid_until">หมดอายุวันที่ (เว้นว่าง = ไม่หมดอายุ)</Label>
                <Input
                  id="valid_until"
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">เปิดใช้งาน</Label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">คำอธิบาย</Label>
              <textarea
                id="description"
                className="input"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="คำอธิบายเพิ่มเติม"
                maxLength={500}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex items-center gap-2">
                {saving ? <Spinner /> : <Save className="size-4" />}
                {editingId ? 'บันทึกการแก้ไข' : 'สร้างโค้ด'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                ยกเลิก
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2">โค้ด</th>
              <th className="text-left p-2">พอยต์</th>
              <th className="text-left p-2">ใช้แล้ว</th>
              <th className="text-left p-2">วันที่เริ่ม</th>
              <th className="text-left p-2">วันที่หมดอายุ</th>
              <th className="text-left p-2">สถานะ</th>
              <th className="text-right p-2">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center p-8 text-[color:var(--text)]/60">
                  ยังไม่มีโค้ด
                </td>
              </tr>
            ) : (
              codes.map((code) => (
                <tr key={code.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="p-2 font-medium font-mono">{code.code}</td>
                  <td className="p-2">{Number(code.points).toFixed(2)}</td>
                  <td className="p-2">
                    {code.used_count} / {code.usage_limit ?? '∞'}
                  </td>
                  <td className="p-2 text-[color:var(--text)]/70">{formatDate(code.valid_from)}</td>
                  <td className="p-2 text-[color:var(--text)]/70">
                    {code.valid_until ? formatDate(code.valid_until) : 'ไม่หมดอายุ'}
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${code.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                      {code.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(code)}
                        className="h-8 w-8"
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(code.id)}
                        disabled={deletingId === code.id}
                        className="h-8 w-8 text-red-300 hover:text-red-400"
                      >
                        {deletingId === code.id ? <Spinner /> : <Trash2 className="size-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
