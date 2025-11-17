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
  type: 'spin_wheel' | 'loot_box';
  cost_points: number;
  is_active: boolean;
  description: string | null;
  image_url: string | null;
  settings: any;
  created_at: string;
  updated_at: string;
}

export default function GamesContent() {
  const toast = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'spin_wheel' as 'spin_wheel' | 'loot_box',
    cost_points: '10',
    is_active: true,
    description: '',
    image_url: '',
  });

  useEffect(() => {
    fetchGames();
  }, []);

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

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'spin_wheel',
      cost_points: '10',
      is_active: true,
      description: '',
      image_url: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (game: Game) => {
    setFormData({
      name: game.name,
      type: game.type,
      cost_points: game.cost_points.toString(),
      is_active: game.is_active,
      description: game.description || '',
      image_url: game.image_url || '',
    });
    setEditingId(game.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        type: formData.type,
        cost_points: Number(formData.cost_points),
        is_active: formData.is_active,
        description: formData.description.trim() || null,
        image_url: formData.image_url.trim() || null,
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/admin/games/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/games', {
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
        description: editingId ? 'แก้ไขเกมเรียบร้อย' : 'สร้างเกมเรียบร้อย',
      });

      resetForm();
      fetchGames();
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
    if (!confirm('ยืนยันการลบเกมนี้?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || json.error || 'เกิดข้อผิดพลาด');
      }

      toast.show({
        title: 'สำเร็จ',
        description: 'ลบเกมเรียบร้อย',
      });

      fetchGames();
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
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
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">จัดการเกม</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 size-4" />
          สร้างเกมใหม่
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'แก้ไขเกม' : 'สร้างเกมใหม่'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">ชื่อเกม *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="type">ประเภทเกม *</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="px-3 py-2 bg-black/40 border border-white/10 rounded-md text-[color:var(--text)]"
                  >
                    <option value="spin_wheel">วงล้อสุ่ม</option>
                    <option value="loot_box">กล่องสุ่ม</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cost_points">ราคา (พอยต์) *</Label>
                  <Input
                    id="cost_points"
                    type="number"
                    min="1"
                    value={formData.cost_points}
                    onChange={(e) => setFormData({ ...formData, cost_points: e.target.value })}
                    required
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
        {games.map((game) => (
          <Card key={game.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{game.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      game.is_active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {game.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300">
                      {game.type === 'spin_wheel' ? '🎡 วงล้อ' : '📦 กล่อง'}
                    </span>
                  </div>
                  <p className="text-[color:var(--text)]/60 text-sm mb-2">{game.description || 'ไม่มีคำอธิบาย'}</p>
                  <p className="text-[color:var(--text)]/40 text-xs">ราคา: {game.cost_points} พอยต์</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(game)}
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(game.id)}
                    disabled={deletingId === game.id}
                  >
                    {deletingId === game.id ? (
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

      {games.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-[color:var(--text)]/60">ยังไม่มีเกม</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

