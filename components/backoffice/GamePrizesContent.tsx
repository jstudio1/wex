'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit, Plus, X, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Game {
  id: number;
  name: string;
  type: string;
}

interface Prize {
  id: number;
  game_id: number;
  name: string;
  type: 'points' | 'coupon' | 'other';
  value: string;
  probability: number;
  quantity: number | null;
  remaining_quantity: number | null;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function GamePrizesContent() {
  const toast = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'points' as 'points' | 'coupon' | 'other',
    value: '',
    probability: '',
    quantity: '',
    is_active: true,
    display_order: '0',
    image_url: '',
    description: '',
  });

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      fetchPrizes();
    } else {
      setPrizes([]);
    }
  }, [selectedGameId]);

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/admin/games');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
      const json = await res.json();
      setGames(json.data || []);
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

  const fetchPrizes = async () => {
    if (!selectedGameId) return;

    try {
      const res = await fetch(`/api/admin/games/${selectedGameId}/prizes`);
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
      const json = await res.json();
      setPrizes(json.data || []);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'points',
      value: '',
      probability: '',
      quantity: '',
      is_active: true,
      display_order: '0',
      image_url: '',
      description: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (prize: Prize) => {
    setFormData({
      name: prize.name,
      type: prize.type,
      value: prize.value,
      probability: prize.probability.toString(),
      quantity: prize.quantity?.toString() || '',
      is_active: prize.is_active,
      display_order: prize.display_order.toString(),
      image_url: prize.image_url || '',
      description: prize.description || '',
    });
    setEditingId(prize.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameId) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'กรุณาเลือกเกมก่อน',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        type: formData.type,
        value: formData.value.trim(),
        probability: Number(formData.probability),
        is_active: formData.is_active,
        display_order: Number(formData.display_order),
        description: formData.description.trim() || null,
        image_url: formData.image_url.trim() || null,
      };

      if (formData.quantity.trim()) {
        payload.quantity = Number(formData.quantity);
      }

      let res;
      if (editingId) {
        res = await fetch(`/api/admin/games/${selectedGameId}/prizes/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/games/${selectedGameId}/prizes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || 'เกิดข้อผิดพลาด');
      }

      toast.show({
        title: 'สำเร็จ',
        description: editingId ? 'แก้ไขรางวัลเรียบร้อย' : 'สร้างรางวัลเรียบร้อย',
      });

      resetForm();
      fetchPrizes();
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
    if (!selectedGameId) return;
    if (!confirm('ยืนยันการลบรางวัลนี้?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/games/${selectedGameId}/prizes/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || json.error || 'เกิดข้อผิดพลาด');
      }

      toast.show({
        title: 'สำเร็จ',
        description: 'ลบรางวัลเรียบร้อย',
      });

      fetchPrizes();
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

  const totalProbability = prizes.filter(p => p.is_active).reduce((sum, p) => sum + Number(p.probability), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">จัดการรางวัล</h2>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="game_select">เลือกเกม *</Label>
          <select
            id="game_select"
            value={selectedGameId || ''}
            onChange={(e) => {
              setSelectedGameId(e.target.value ? Number(e.target.value) : null);
              setPrizes([]);
              resetForm();
            }}
            className="px-3 py-2 bg-card border border-border rounded-md text-[color:var(--text)]"
          >
            <option value="">-- เลือกเกม --</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </div>

        {selectedGameId && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[color:var(--text)]/60">
                  ความน่าจะเป็นรวม: <span className={`font-bold ${totalProbability > 100 ? 'text-red-400' : totalProbability === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {totalProbability.toFixed(2)}%
                  </span>
                  {totalProbability !== 100 && (
                    <span className="text-xs ml-2 text-[color:var(--text)]/40">
                      ({totalProbability > 100 ? 'เกิน 100%' : `เหลือ ${(100 - totalProbability).toFixed(2)}%`})
                    </span>
                  )}
                </p>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 size-4" />
                เพิ่มรางวัล
              </Button>
            </div>

            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingId ? 'แก้ไขรางวัล' : 'เพิ่มรางวัลใหม่'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">ชื่อรางวัล *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="type">ประเภทรางวัล *</Label>
                        <select
                          id="type"
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                          className="px-3 py-2 bg-card border border-border rounded-md text-[color:var(--text)]"
                        >
                          <option value="points">พอยต์</option>
                          <option value="coupon">โค้ดส่วนลด</option>
                          <option value="other">อื่นๆ</option>
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="value">
                          ค่าของรางวัล * 
                          <span className="text-xs text-[color:var(--text)]/60 ml-2">
                            {formData.type === 'points' && '(จำนวนพอยต์ เช่น: 50)'}
                            {formData.type === 'coupon' && '(รูปแบบ: percent:10 หรือ fixed:100)'}
                            {formData.type === 'other' && '(คำอธิบายรางวัล)'}
                          </span>
                        </Label>
                        <Input
                          id="value"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                          required
                          placeholder={
                            formData.type === 'points' ? '50' :
                            formData.type === 'coupon' ? 'percent:10 หรือ fixed:100' :
                            'คำอธิบายรางวัล'
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="probability">ความน่าจะเป็น (%) *</Label>
                        <Input
                          id="probability"
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={formData.probability}
                          onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="quantity">จำนวน (ว่าง = ไม่จำกัด)</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          placeholder="ไม่จำกัด"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="display_order">ลำดับการแสดง</Label>
                        <Input
                          id="display_order"
                          type="number"
                          value={formData.display_order}
                          onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="image_url">URL รูปภาพ</Label>
                        <Input
                          id="image_url"
                          type="url"
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="description">คำอธิบาย</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <>
                            <Spinner className="mr-2 size-4" />
                            กำลังบันทึก...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 size-4" />
                            บันทึก
                          </>
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetForm}>
                        <X className="mr-2 size-4" />
                        ยกเลิก
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {prizes.map((prize) => (
                <Card key={prize.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{prize.name}</h3>
                          <span className={`px-2 py-1 rounded text-xs ${
                            prize.is_active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                          }`}>
                            {prize.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300">
                            {prize.type === 'points' ? '💰 พอยต์' : prize.type === 'coupon' ? '🎫 โค้ด' : '🎁 อื่นๆ'}
                          </span>
                        </div>
                        <p className="text-[color:var(--text)]/60 text-sm mb-2">
                          ค่า: {prize.value} | ความน่าจะเป็น: {prize.probability}%
                          {prize.quantity !== null && (
                            <span className="ml-2">
                              | จำนวน: {prize.remaining_quantity || 0} / {prize.quantity}
                            </span>
                          )}
                        </p>
                        {prize.description && (
                          <p className="text-[color:var(--text)]/40 text-xs">{prize.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(prize)}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(prize.id)}
                          disabled={deletingId === prize.id}
                        >
                          {deletingId === prize.id ? (
                            <Spinner className="size-4" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {prizes.length === 0 && !showForm && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-[color:var(--text)]/60">ยังไม่มีรางวัล</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!selectedGameId && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-[color:var(--text)]/60">กรุณาเลือกเกมเพื่อจัดการรางวัล</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

