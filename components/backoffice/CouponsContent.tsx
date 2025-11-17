'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, Edit, Plus, X, Save, ChevronDown } from 'lucide-react';

interface Coupon {
  id: number;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: string;
  min_discount: string | null;
  min_purchase: string | null;
  valid_from: string;
  valid_until: string;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function CouponsContent() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    min_discount: '',
    min_purchase: '',
    valid_from: '',
    valid_until: '',
    usage_limit: '',
    is_active: true,
    description: '',
  });

  const handleIntegerChange = (value: string, field: keyof typeof formData) => {
    if (value === '') {
      setFormData((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned === '') {
      setFormData((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    const numValue = parseInt(cleaned, 10);
    if (!isNaN(numValue)) {
      setFormData((prev) => ({ ...prev, [field]: numValue.toString() }));
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
      const json = await res.json();
      setCoupons(json.data || []);
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
      discount_type: 'percent',
      discount_value: '',
      min_discount: '',
      min_purchase: '',
      valid_from: '',
      valid_until: '',
      usage_limit: '',
      is_active: true,
      description: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_discount: coupon.min_discount || '',
      min_purchase: coupon.min_purchase || '',
      valid_from: new Date(coupon.valid_from).toISOString().slice(0, 16),
      valid_until: new Date(coupon.valid_until).toISOString().slice(0, 16),
      usage_limit: coupon.usage_limit?.toString() || '',
      is_active: coupon.is_active,
      description: coupon.description || '',
    });
    setEditingId(coupon.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: any = {
        code: formData.code.trim(),
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString(),
        is_active: formData.is_active,
        description: formData.description.trim() || null,
      };

      if (formData.discount_type === 'percent') {
        payload.min_discount = formData.min_discount ? Number(formData.min_discount) : null;
      }
      payload.min_purchase = formData.min_purchase ? Number(formData.min_purchase) : null;
      payload.usage_limit = formData.usage_limit ? Number(formData.usage_limit) : null;

      let res;
      if (editingId) {
        res = await fetch(`/api/admin/coupons/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/coupons', {
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
        description: editingId ? 'อัปเดตคูปองเรียบร้อย' : 'สร้างคูปองเรียบร้อย',
      });

      resetForm();
      await fetchCoupons();
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
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบคูปองนี้?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('ลบไม่สำเร็จ');

      toast.show({ title: 'สำเร็จ', description: 'ลบคูปองเรียบร้อย' });
      await fetchCoupons();
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
        <h2 className="text-xl font-semibold">จัดการคูปองส่วนลด</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2">
          <Plus className="size-4" />
          สร้างคูปองใหม่
        </Button>
      </div>

      {showForm && (
        <div className="card p-6 space-y-4 border-2 border-accent/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingId ? 'แก้ไขคูปอง' : 'สร้างคูปองใหม่'}</h2>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="size-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">โค้ดคูปอง *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="DISCOUNT2024"
                  required
                  maxLength={50}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="discount_type">ประเภทส่วนลด *</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between text-left font-normal"
                      id="discount_type"
                    >
                      {formData.discount_type === 'percent' ? 'ลดเป็นเปอร์เซ็นต์ (%)' : 'ลดเป็นจำนวนเงิน (บาท)'}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="!w-full min-w-full">
                    <DropdownMenuItem
                      className={formData.discount_type === 'percent' ? 'bg-accent/50' : ''}
                      onClick={() => setFormData({ ...formData, discount_type: 'percent' })}
                    >
                      ลดเป็นเปอร์เซ็นต์ (%)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={formData.discount_type === 'fixed' ? 'bg-accent/50' : ''}
                      onClick={() => setFormData({ ...formData, discount_type: 'fixed' })}
                    >
                      ลดเป็นจำนวนเงิน (บาท)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="discount_value">
                  {formData.discount_type === 'percent' ? 'เปอร์เซ็นต์ส่วนลด (%) *' : 'จำนวนเงินส่วนลด (บาท) *'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  step="1"
                  min="1"
                  max={formData.discount_type === 'percent' ? '100' : undefined}
                  value={formData.discount_value}
                  onChange={(e) => handleIntegerChange(e.target.value, 'discount_value')}
                  required
                />
              </div>

              {formData.discount_type === 'percent' && (
                <div className="grid gap-2">
                  <Label htmlFor="min_discount">ส่วนลดขั้นต่ำ (บาท)</Label>
                  <Input
                    id="min_discount"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.min_discount}
                    onChange={(e) => handleIntegerChange(e.target.value, 'min_discount')}
                    placeholder="0"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="min_purchase">ยอดซื้อขั้นต่ำ (บาท)</Label>
                <Input
                  id="min_purchase"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.min_purchase}
                  onChange={(e) => handleIntegerChange(e.target.value, 'min_purchase')}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valid_from">เริ่มใช้ได้วันที่ *</Label>
                <Input
                  id="valid_from"
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valid_until">หมดอายุวันที่ *</Label>
                <Input
                  id="valid_until"
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="usage_limit">จำนวนครั้งที่ใช้ได้ (เว้นว่าง = ไม่จำกัด)</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => handleIntegerChange(e.target.value, 'usage_limit')}
                  placeholder="ไม่จำกัด"
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
                {editingId ? 'บันทึกการแก้ไข' : 'สร้างคูปอง'}
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
            <tr className="border-b border-gray-700/50">
              <th className="text-left p-2">โค้ด</th>
              <th className="text-left p-2">ประเภท</th>
              <th className="text-left p-2">ส่วนลด</th>
              <th className="text-left p-2">ยอดซื้อขั้นต่ำ</th>
              <th className="text-left p-2">วันที่เริ่ม</th>
              <th className="text-left p-2">วันที่หมดอายุ</th>
              <th className="text-left p-2">ใช้แล้ว</th>
              <th className="text-left p-2">สถานะ</th>
              <th className="text-right p-2">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-8 text-[color:var(--text)]/60">
                  ยังไม่มีคูปอง
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-gray-700/30 hover:bg-white/5">
                  <td className="p-2 font-medium">{coupon.code}</td>
                  <td className="p-2">
                    {coupon.discount_type === 'percent' ? 'เปอร์เซ็นต์' : 'จำนวนเงิน'}
                  </td>
                  <td className="p-2">
                    {coupon.discount_type === 'percent'
                      ? `${Number(coupon.discount_value)}%`
                      : `${Number(coupon.discount_value).toFixed(2)} ฿`}
                    {coupon.min_discount && (
                      <span className="text-xs text-[color:var(--text)]/60 block">ขั้นต่ำ {Number(coupon.min_discount).toFixed(2)} ฿</span>
                    )}
                  </td>
                  <td className="p-2">
                    {coupon.min_purchase ? `${Number(coupon.min_purchase).toFixed(2)} ฿` : '-'}
                  </td>
                  <td className="p-2 text-[color:var(--text)]/70">{formatDate(coupon.valid_from)}</td>
                  <td className="p-2 text-[color:var(--text)]/70">{formatDate(coupon.valid_until)}</td>
                  <td className="p-2">
                    {coupon.used_count} / {coupon.usage_limit ?? '∞'}
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${coupon.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                      {coupon.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(coupon)}
                        className="h-8 w-8"
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(coupon.id)}
                        disabled={deletingId === coupon.id}
                        className="h-8 w-8 text-red-300 hover:text-red-400"
                      >
                        {deletingId === coupon.id ? <Spinner /> : <Trash2 className="size-4" />}
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
