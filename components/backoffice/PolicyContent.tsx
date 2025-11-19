'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';

interface PolicySettings {
  title: string;
  description: string | null;
}

interface PolicyItem {
  id: string;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export default function PolicyContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PolicySettings>({
    title: 'ข้อกำหนดการใช้งาน',
    description: null,
  });
  const [items, setItems] = useState<PolicyItem[]>([]);
  const [editingItem, setEditingItem] = useState<PolicyItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ title: '', content: '' });
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // โหลดข้อมูล
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, itemsRes] = await Promise.all([
        fetch('/api/admin/policy/settings'),
        fetch('/api/admin/policy/items'),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData);
      }
    } catch (err) {
      console.error('Error loading policy data:', err);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // บันทึกการตั้งค่า
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/policy/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error('Failed to save settings');
      }

      toast.show({
        title: 'บันทึกสำเร็จ',
        description: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกได้',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // เปิด dialog สำหรับเพิ่ม/แก้ไข
  const handleOpenDialog = (item?: PolicyItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({ title: item.title, content: item.content });
    } else {
      setEditingItem(null);
      setItemForm({ title: '', content: '' });
    }
    setIsDialogOpen(true);
  };

  // บันทึก item
  const handleSaveItem = async () => {
    if (!itemForm.title.trim() || !itemForm.content.trim()) {
      toast.show({
        title: 'กรุณากรอกข้อมูล',
        description: 'กรุณากรอกหัวข้อและรายละเอียด',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const url = editingItem
        ? `/api/admin/policy/items/${editingItem.id}`
        : '/api/admin/policy/items';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: itemForm.title.trim(),
          content: itemForm.content.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save item');
      }

      toast.show({
        title: 'บันทึกสำเร็จ',
        description: editingItem ? 'แก้ไขข้อกำหนดเรียบร้อยแล้ว' : 'เพิ่มข้อกำหนดเรียบร้อยแล้ว',
      });

      setIsDialogOpen(false);
      setEditingItem(null);
      setItemForm({ title: '', content: '' });
      await loadData();
    } catch (err) {
      console.error('Error saving item:', err);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกได้',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ลบ item
  const handleDeleteItem = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อกำหนดนี้?')) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/policy/items/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete item');
      }

      toast.show({
        title: 'ลบสำเร็จ',
        description: 'ลบข้อกำหนดเรียบร้อยแล้ว',
      });

      await loadData();
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบได้',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = items.findIndex((item) => item.id === draggedItem);
    const targetIndex = items.findIndex((item) => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // สร้าง array ใหม่
    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    // อัปเดต order_index
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order_index: index,
    }));

    // อัปเดต UI ทันที
    setItems(updatedItems);

    try {
      setSaving(true);
      // อัปเดต order_index ทั้งหมด
      await Promise.all(
        updatedItems.map((item) =>
          fetch(`/api/admin/policy/items/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_index: item.order_index }),
          })
        )
      );

      toast.show({
        title: 'บันทึกสำเร็จ',
        description: 'ย้ายลำดับเรียบร้อยแล้ว',
      });
    } catch (err) {
      console.error('Error moving item:', err);
      // Rollback on error
      await loadData();
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถย้ายลำดับได้',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setDraggedItem(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* การตั้งค่าหลัก */}
      <div className="card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold mb-2">ตั้งค่าหัวข้อหลัก</h3>
          <p className="text-xs text-gray-400 mb-4">ตั้งค่าหัวข้อและรายละเอียดสำหรับหน้า Terms Policy</p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="policy-title">หัวข้อหลัก</Label>
            <Input
              id="policy-title"
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              placeholder="ข้อกำหนดการใช้งาน"
              className="bg-[#1a1a1a] border-gray-700"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="policy-description">รายละเอียดหัวข้อหลัก (ไม่บังคับ)</Label>
            <Textarea
              id="policy-description"
              value={settings.description || ''}
              onChange={(e) => setSettings({ ...settings, description: e.target.value || null })}
              placeholder="อธิบายรายละเอียดเกี่ยวกับข้อกำหนดการใช้งาน..."
              rows={3}
              className="bg-[#1a1a1a] border-gray-700"
            />
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? <><Spinner />กำลังบันทึก...</> : 'บันทึกการตั้งค่า'}
          </Button>
        </div>
      </div>

      {/* รายการ Policy Items */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold mb-2">รายการข้อกำหนด</h3>
            <p className="text-xs text-gray-400">จัดการข้อกำหนดแต่ละข้อ</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} variant="default" size="sm">
                <Plus className="size-4 mr-2" />
                เพิ่มข้อกำหนด
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'แก้ไขข้อกำหนด' : 'เพิ่มข้อกำหนดใหม่'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="item-title">หัวข้อ</Label>
                  <Input
                    id="item-title"
                    value={itemForm.title}
                    onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                    placeholder="เช่น 1. การยอมรับข้อกำหนด"
                    className="bg-[#1a1a1a] border-gray-700"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-content">รายละเอียด</Label>
                  <Textarea
                    id="item-content"
                    value={itemForm.content}
                    onChange={(e) => setItemForm({ ...itemForm, content: e.target.value })}
                    placeholder="กรอกรายละเอียดของข้อกำหนดนี้..."
                    rows={10}
                    className="bg-[#1a1a1a] border-gray-700"
                  />
                  <p className="text-xs text-gray-400">รองรับ HTML เช่น &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt; เป็นต้น</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={saving}
                  >
                    ยกเลิก
                  </Button>
                  <Button onClick={handleSaveItem} disabled={saving}>
                    {saving ? <><Spinner />กำลังบันทึก...</> : 'บันทึก'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* รายการ Items */}
        {items.length === 0 ? (
          <div className="text-center py-12 border border-gray-800 rounded-lg">
            <p className="text-gray-400 mb-4">ยังไม่มีข้อกำหนด</p>
            <Button onClick={() => handleOpenDialog()} variant="outline" size="sm">
              <Plus className="size-4 mr-2" />
              เพิ่มข้อกำหนดแรก
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`p-4 rounded-lg border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 transition-colors cursor-move ${
                  draggedItem === item.id ? 'opacity-50 border-emerald-500' : ''
                } ${saving ? 'pointer-events-none' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1 cursor-grab active:cursor-grabbing">
                    <GripVertical className="size-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                    <div
                      className="text-sm text-gray-300 line-clamp-2 prose prose-invert max-w-none [&_p]:mb-1 [&_ul]:list-disc [&_ul]:ml-4"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(item)}
                      disabled={saving}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={saving}
                    >
                      <Trash2 className="size-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

