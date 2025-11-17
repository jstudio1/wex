'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SpinnerCustom } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Star, FileText, DollarSign, Trash2, Edit2, GripVertical, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Product = {
  id: number;
  name: string;
  key: string;
};

type ProductItem = {
  id: number;
  name: string;
  sku: string;
  price: number;
  original_price: number | null;
  markup_percent: number;
  markup_fixed: number;
  is_recommended: boolean;
  icon_url: string | null;
};

type NewItemFormState = {
  name: string;
  sku: string;
  price: string;
  original_price: string;
  markup_percent: string;
  markup_fixed: string;
  icon_url: string;
  is_recommended: boolean;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }
  return fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeItem = (item: any): ProductItem => ({
  id: item.id,
  name: item.name ?? '',
  sku: item.sku ?? '',
  price: toNumber(item.price),
  original_price: toNullableNumber(item.original_price),
  markup_percent: toNumber(item.markup_percent),
  markup_fixed: toNumber(item.markup_fixed),
  is_recommended: Boolean(item.is_recommended),
  icon_url: item.icon_url ?? null,
});

const normalizeItemPrice = (price: any) => ({
  id: price.id,
  permission_id: price.permission_id,
  price: toNumber(price.price),
  permission: price.permission
    ? { id: price.permission.id, name: price.permission.name }
    : undefined,
});

export default function ProductPricingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedItemForPrice, setSelectedItemForPrice] = useState<ProductItem | null>(null);
  const [itemPrices, setItemPrices] = useState<Array<{ id: number; permission_id: number; price: number; permission?: { id: number; name: string } }>>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [permissions, setPermissions] = useState<Array<{ id: number; name: string }>>([]);
  const [newPriceForm, setNewPriceForm] = useState({ permission_id: '', price: '' });
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [newItemForm, setNewItemForm] = useState<NewItemFormState>({
    name: '',
    sku: '',
    price: '',
    original_price: '',
    markup_percent: '',
    markup_fixed: '',
    icon_url: '',
    is_recommended: false,
  });
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchData();
    }
  }, [params?.id]);

  const sortItems = (items: ProductItem[]): ProductItem[] => {
    if (!Array.isArray(items)) return [];
    const isDiamond = (name: string) => {
      const lower = name.toLowerCase();
      return lower.includes('diamond') || lower.includes('เพชร');
    };
    return [...items].sort((a, b) => {
      const aScore = isDiamond(a.name) ? 0 : 1;
      const bScore = isDiamond(b.name) ? 0 : 1;
      if (aScore !== bScore) return aScore - bScore;
      return a.price - b.price;
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pricingRes, permissionsRes] = await Promise.all([
        fetch(`/api/admin/products/${params?.id}/pricing`),
        fetch('/api/admin/permissions')
      ]);
      
      if (!pricingRes.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }
      const json = await pricingRes.json();
      if (json.ok) {
        setProduct(json.data.product);
        const normalizedItems = sortItems(
          (json.data.items || []).map((item: any) => normalizeItem(item))
        );
        setItems(normalizedItems);
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาด');
      }

      if (permissionsRes.ok) {
        const permJson = await permissionsRes.json();
        setPermissions(permJson.data || []);
      }
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

  const handleToggleRecommended = async (itemId: number, currentValue: boolean) => {
    // Optimistic update
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, is_recommended: !currentValue }
          : item,
      )
    );

    try {
      const res = await fetch(`/api/admin/products/${params?.id}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: itemId, is_recommended: !currentValue }],
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.detail || json.error || 'อัปเดตไม่สำเร็จ');
      }

      // Success - data already updated optimistically
    } catch (err) {
      // Revert on error
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? { ...item, is_recommended: currentValue }
            : item,
        )
      );

      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const openPriceDialog = (item: ProductItem) => {
    setSelectedItemForPrice(item);
    setPriceDialogOpen(true);
    setNewPriceForm({ permission_id: '', price: '' });
    setEditingPriceId(null);
    setEditingPriceValue('');
    fetchItemPrices(item.id);
  };

  const closePriceDialog = () => {
    setPriceDialogOpen(false);
    setSelectedItemForPrice(null);
    setItemPrices([]);
    setNewPriceForm({ permission_id: '', price: '' });
    setEditingPriceId(null);
    setEditingPriceValue('');
  };

  const fetchItemPrices = async (itemId: number) => {
    try {
      setLoadingPrices(true);
      const res = await fetch(`/api/admin/products/${params?.id}/pricing/${itemId}/prices`);
      if (!res.ok) {
        throw new Error('ไม่สามารถโหลดราคาได้');
      }
      const json = await res.json();
      if (json.ok) {
        setItemPrices((json.data || []).map((price: any) => normalizeItemPrice(price)));
      }
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleAddPrice = async () => {
    if (!selectedItemForPrice) return;
    
    if (!newPriceForm.permission_id || !newPriceForm.price) {
      toast.show({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        description: 'กรุณาเลือกสิทธิ์และกรอกราคา',
        variant: 'destructive',
      });
      return;
    }

    const priceNum = parseFloat(newPriceForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.show({
        title: 'ราคาไม่ถูกต้อง',
        description: 'ราคาต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${params?.id}/pricing/${selectedItemForPrice.id}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission_id: parseInt(newPriceForm.permission_id),
          price: priceNum
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'ไม่สามารถเพิ่มราคาได้');
      }

      toast.show({ title: 'สำเร็จ', description: 'เพิ่มราคาเรียบร้อย' });
      setNewPriceForm({ permission_id: '', price: '' });
      await fetchItemPrices(selectedItemForPrice.id);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePrice = async (priceId: number, newPrice: number) => {
    if (!selectedItemForPrice) return;

    try {
      const res = await fetch(`/api/admin/products/${params?.id}/pricing/${selectedItemForPrice.id}/prices/${priceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'ไม่สามารถอัปเดตราคาได้');
      }

      toast.show({ title: 'สำเร็จ', description: 'อัปเดตราคาเรียบร้อย' });
      setEditingPriceId(null);
      setEditingPriceValue('');
      await fetchItemPrices(selectedItemForPrice.id);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleDeletePrice = async (priceId: number) => {
    if (!selectedItemForPrice) return;

    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบราคานี้?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${params?.id}/pricing/${selectedItemForPrice.id}/prices/${priceId}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'ไม่สามารถลบราคาได้');
      }

      toast.show({ title: 'สำเร็จ', description: 'ลบราคาเรียบร้อย' });
      await fetchItemPrices(selectedItemForPrice.id);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const resetNewItemForm = () => {
    setNewItemForm({
      name: '',
      sku: '',
      price: '',
      original_price: '',
      markup_percent: '',
      markup_fixed: '',
      icon_url: '',
      is_recommended: false,
    });
  };

  const handleCreateItem = async () => {
    const trimmedName = newItemForm.name.trim();
    const trimmedSku = newItemForm.sku.trim();

    if (!trimmedName || !trimmedSku) {
      toast.show({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        description: 'จำเป็นต้องระบุชื่อแพ็กเกจและ SKU',
        variant: 'destructive',
      });
      return;
    }

    if (items.some((item) => item.sku.toLowerCase() === trimmedSku.toLowerCase())) {
      toast.show({
        title: 'SKU ซ้ำ',
        description: 'มี SKU นี้อยู่แล้วในรายการ',
        variant: 'destructive',
      });
      return;
    }

    const priceNum = parseFloat(newItemForm.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.show({
        title: 'ราคาไม่ถูกต้อง',
        description: 'กรุณากรอกราคาเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive',
      });
      return;
    }

    const originalPriceNum = newItemForm.original_price.trim() === ''
      ? null
      : parseFloat(newItemForm.original_price);
    if (originalPriceNum !== null && (Number.isNaN(originalPriceNum) || originalPriceNum < 0)) {
      toast.show({
        title: 'ราคาเดิมไม่ถูกต้อง',
        description: 'กรุณากรอกราคาเดิมเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive',
      });
      return;
    }

    const markupPercentNum = newItemForm.markup_percent.trim() === ''
      ? 0
      : parseFloat(newItemForm.markup_percent);
    if (Number.isNaN(markupPercentNum) || markupPercentNum < 0) {
      toast.show({
        title: 'Markup % ไม่ถูกต้อง',
        description: 'Markup % ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive',
      });
      return;
    }

    const markupFixedNum = newItemForm.markup_fixed.trim() === ''
      ? 0
      : parseFloat(newItemForm.markup_fixed);
    if (Number.isNaN(markupFixedNum) || markupFixedNum < 0) {
      toast.show({
        title: 'Markup ฿ ไม่ถูกต้อง',
        description: 'Markup ฿ ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingItem(true);
      const res = await fetch(`/api/admin/products/${params?.id}/pricing/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          sku: trimmedSku,
          price: priceNum,
          original_price: originalPriceNum,
          markup_percent: markupPercentNum,
          markup_fixed: markupFixedNum,
          icon_url: newItemForm.icon_url.trim() ? newItemForm.icon_url.trim() : null,
          is_recommended: newItemForm.is_recommended,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'ไม่สามารถสร้างแพ็กเกจได้');
      }

      const createdItem = normalizeItem(json.data);
      setItems((prevItems) => sortItems([...prevItems, createdItem]));

      toast.show({
        title: 'สำเร็จ',
        description: 'เพิ่มแพ็กเกจเรียบร้อย',
      });

      resetNewItemForm();
      setCreateDialogOpen(false);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setCreatingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    const targetItem = items.find((item) => item.id === itemId);
    if (!targetItem) return;

    const confirmed = confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแพ็กเกจ "${targetItem.name}"?`);
    if (!confirmed) return;

    try {
      setDeletingItemId(itemId);
      const res = await fetch(`/api/admin/products/${params?.id}/pricing/${itemId}`, {
        method: 'DELETE',
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'ไม่สามารถลบแพ็กเกจได้');
      }

      setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));

      toast.show({
        title: 'สำเร็จ',
        description: 'ลบแพ็กเกจเรียบร้อย',
      });
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleSave = async () => {
    const hasEmptyName = items.some((item) => !item.name || !item.name.trim());
    if (hasEmptyName) {
      toast.show({
        title: 'บันทึกไม่สำเร็จ',
        description: 'กรุณากรอกชื่อแพ็กเกจให้ครบทุกแถว',
        variant: 'destructive',
      });
      return;
    }

    const hasEmptySku = items.some((item) => !item.sku || !item.sku.trim());
    if (hasEmptySku) {
      toast.show({
        title: 'บันทึกไม่สำเร็จ',
        description: 'กรุณากรอก SKU ให้ครบทุกแถว',
        variant: 'destructive',
      });
      return;
    }

    const hasDuplicateSku = (() => {
      const skuSet = new Set<string>();
      for (const item of items) {
        const sku = item.sku.trim().toLowerCase();
        if (skuSet.has(sku)) return true;
        skuSet.add(sku);
      }
      return false;
    })();

    if (hasDuplicateSku) {
      toast.show({
        title: 'บันทึกไม่สำเร็จ',
        description: 'พบ SKU ซ้ำ กรุณาแก้ไขให้ไม่ซ้ำ',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/products/${params?.id}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            name: item.name.trim(),
            sku: item.sku.trim(),
            price: item.price,
            original_price: item.original_price,
            markup_percent: item.markup_percent,
            markup_fixed: item.markup_fixed,
            icon_url: item.icon_url,
          })),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.detail || json.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({
        title: 'สำเร็จ',
        description: 'บันทึกการตั้งค่าราคาเรียบร้อย',
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <SpinnerCustom className="py-0" />
      </div>
    );
  }

  if (!product || items.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="size-4" />
          กลับ
        </Button>
          <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText className="size-6" />
              </EmptyMedia>
              <EmptyTitle>ไม่พบข้อมูล</EmptyTitle>
              <EmptyDescription>
                ไม่พบสินค้าหรือรายการราคา กรุณาตรวจสอบข้อมูล
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()} className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50">
            <ArrowLeft className="size-4 text-gray-500" />
            กลับ
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">จัดการราคา</h2>
            <p className="text-sm text-gray-500 mt-1">{product.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetNewItemForm();
              setCreateDialogOpen(true);
            }}
            className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Plus className="size-4" />
            เพิ่มแพ็กเกจ
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
            <Save className="size-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </div>

      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">ตั้งค่าราคาแนะนำ</CardTitle>
          <CardDescription className="text-gray-500">
            เลือกราคาที่ต้องการให้แสดงเป็น "แนะนำ" ในหน้ารายละเอียดสินค้า
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 bg-gray-100 hover:bg-gray-100">
                  <TableHead className="w-[40px] text-gray-600"></TableHead>
                  <TableHead className="w-[100px] text-gray-600">สถานะ</TableHead>
                  <TableHead className="text-gray-600">แพ็กเกจ</TableHead>
                  <TableHead className="w-[120px] text-gray-600">SKU</TableHead>
                  <TableHead className="w-[200px] text-gray-600">Icon URL</TableHead>
                  <TableHead className="w-[150px] text-gray-600">ราคา</TableHead>
                  <TableHead className="w-[150px] text-gray-600">ราคาเดิม</TableHead>
                  <TableHead className="w-[100px] text-gray-600">Markup %</TableHead>
                  <TableHead className="w-[100px] text-gray-600">Markup ฿</TableHead>
                  <TableHead className="w-[120px] text-right text-gray-600">จัดการ</TableHead>
                  <TableHead className="w-[100px] text-center text-gray-600">ราคาสิทธิ์</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`border-gray-200 hover:bg-white transition-colors ${draggingItemId === item.id ? 'bg-red-50/60' : ''}`}
                    draggable
                    onDragStart={() => setDraggingItemId(item.id)}
                    onDragEnd={() => setDraggingItemId(null)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingItemId === null || draggingItemId === item.id) return;
                      setItems((prevItems) => {
                        const draggingIndex = prevItems.findIndex((i) => i.id === draggingItemId);
                        const targetIndex = prevItems.findIndex((i) => i.id === item.id);
                        if (draggingIndex === -1 || targetIndex === -1) return prevItems;
                        if (draggingIndex === targetIndex) return prevItems;
                        const newItems = [...prevItems];
                        const [dragged] = newItems.splice(draggingIndex, 1);
                        newItems.splice(targetIndex, 0, dragged);
                        return newItems;
                      });
                    }}
                  >
                    <TableCell className="text-gray-400 align-middle">
                      <div className="flex justify-center cursor-grab active:cursor-grabbing">
                        <GripVertical className="size-4" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`recommended-${item.id}`}
                          checked={item.is_recommended}
                          onCheckedChange={() => handleToggleRecommended(item.id, item.is_recommended)}
                        />
                        {item.is_recommended && (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs px-2 py-0.5">
                            <Star className="size-3 mr-1 text-yellow-600" />
                            แนะนำ
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setItems((prevItems) =>
                            prevItems.map((i) =>
                              i.id === item.id ? { ...i, name: value } : i
                            )
                          );
                        }}
                        placeholder="ชื่อแพ็กเกจ"
                        className="border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.sku}
                        onChange={(e) => {
                          const value = e.target.value;
                          setItems((prevItems) =>
                            prevItems.map((i) =>
                              i.id === item.id ? { ...i, sku: value } : i
                            )
                          );
                        }}
                        placeholder="SKU"
                        className="border-gray-300 font-mono text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.icon_url && (
                          <div className="flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={item.icon_url} 
                              alt="icon preview" 
                              className="h-6 w-6 object-contain rounded border border-gray-200 bg-white p-0.5"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <Input
                          type="text"
                          placeholder="https://example.com/icon.png"
                          value={item.icon_url || ''}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            setItems(prevItems =>
                              prevItems.map(i =>
                                i.id === item.id
                                  ? { ...i, icon_url: val || null }
                                  : i
                              )
                            );
                          }}
                          className="w-full text-sm font-mono border-gray-300"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.price}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setItems(prevItems =>
                              prevItems.map(i =>
                                i.id === item.id
                                  ? { ...i, price: val === '' ? 0 : parseFloat(val) || 0 }
                                  : i
                              )
                            );
                          }
                        }}
                        className="w-full border-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.original_price || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setItems(prevItems =>
                              prevItems.map(i =>
                                i.id === item.id
                                  ? { ...i, original_price: val === '' ? null : parseFloat(val) || null }
                                  : i
                              )
                            );
                          }
                        }}
                        className="w-full border-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.markup_percent}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setItems(prevItems =>
                              prevItems.map(i =>
                                i.id === item.id
                                  ? { ...i, markup_percent: val === '' ? 0 : parseFloat(val) || 0 }
                                  : i
                              )
                            );
                          }
                        }}
                        className="w-full border-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.markup_fixed}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setItems(prevItems =>
                              prevItems.map(i =>
                                i.id === item.id
                                  ? { ...i, markup_fixed: val === '' ? 0 : parseFloat(val) || 0 }
                                  : i
                              )
                            );
                          }
                        }}
                        className="w-full border-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.is_recommended && (
                          <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-100">
                            แนะนำ
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deletingItemId === item.id}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          {deletingItemId === item.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPriceDialog(item)}
                        className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <DollarSign className="size-4" />
                        ราคา
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetNewItemForm();
        }}
      >
        <DialogContent className="sm:max-w-[520px] bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">เพิ่มแพ็กเกจใหม่</DialogTitle>
            <DialogDescription className="text-gray-500">
              กรอกข้อมูลแพ็กเกจที่จะเพิ่มให้ครบถ้วน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="new_item_name" className="text-sm font-medium text-gray-700">
                  ชื่อแพ็กเกจ
                </Label>
                <Input
                  id="new_item_name"
                  type="text"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น 500 เพชร"
                  className="border-gray-300"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new_item_sku" className="text-sm font-medium text-gray-700">
                  SKU
                </Label>
                <Input
                  id="new_item_sku"
                  type="text"
                  value={newItemForm.sku}
                  onChange={(e) => setNewItemForm((prev) => ({ ...prev, sku: e.target.value }))}
                  placeholder="เช่น FF500"
                  className="border-gray-300 font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="new_item_price" className="text-sm font-medium text-gray-700">
                  ราคา (฿)
                </Label>
                <Input
                  id="new_item_price"
                  type="text"
                  inputMode="decimal"
                  value={newItemForm.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setNewItemForm((prev) => ({ ...prev, price: value }));
                    }
                  }}
                  placeholder="0.00"
                  className="border-gray-300"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new_item_original_price" className="text-sm font-medium text-gray-700">
                  ราคาเดิม (ถ้ามี)
                </Label>
                <Input
                  id="new_item_original_price"
                  type="text"
                  inputMode="decimal"
                  value={newItemForm.original_price}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setNewItemForm((prev) => ({ ...prev, original_price: value }));
                    }
                  }}
                  placeholder="0.00"
                  className="border-gray-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="new_item_markup_percent" className="text-sm font-medium text-gray-700">
                  Markup %
                </Label>
                <Input
                  id="new_item_markup_percent"
                  type="text"
                  inputMode="decimal"
                  value={newItemForm.markup_percent}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setNewItemForm((prev) => ({ ...prev, markup_percent: value }));
                    }
                  }}
                  placeholder="0"
                  className="border-gray-300"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new_item_markup_fixed" className="text-sm font-medium text-gray-700">
                  Markup ฿
                </Label>
                <Input
                  id="new_item_markup_fixed"
                  type="text"
                  inputMode="decimal"
                  value={newItemForm.markup_fixed}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setNewItemForm((prev) => ({ ...prev, markup_fixed: value }));
                    }
                  }}
                  placeholder="0.00"
                  className="border-gray-300"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new_item_icon_url" className="text-sm font-medium text-gray-700">
                Icon URL (ถ้ามี)
              </Label>
              <Input
                id="new_item_icon_url"
                type="text"
                value={newItemForm.icon_url}
                onChange={(e) => setNewItemForm((prev) => ({ ...prev, icon_url: e.target.value }))}
                placeholder="https://example.com/icon.png"
                className="border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">ตั้งเป็นแพ็กเกจแนะนำ</p>
                <p className="text-xs text-gray-500">แสดงป้ายแนะนำในหน้ารายละเอียดสินค้า</p>
              </div>
              <Switch
                checked={newItemForm.is_recommended}
                onCheckedChange={(checked) => setNewItemForm((prev) => ({ ...prev, is_recommended: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                resetNewItemForm();
                setCreateDialogOpen(false);
              }}
              className="border-gray-300"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleCreateItem}
              disabled={creatingItem}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {creatingItem ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              เพิ่มแพ็กเกจ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price Management Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              จัดการราคาตามสิทธิ์
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {selectedItemForPrice && (
                <div className="mt-2">
                  <div className="font-semibold text-gray-900">{selectedItemForPrice.name}</div>
                  <div className="text-sm text-gray-600">SKU: {selectedItemForPrice.sku}</div>
                  <div className="text-sm text-gray-500 mt-1">ราคาปกติ: {Number(selectedItemForPrice.price).toFixed(2)} ฿</div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add New Price */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">เพิ่มราคาใหม่</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="new_permission_id" className="text-sm font-medium text-gray-700">
                    สิทธิ์
                  </Label>
                  <select
                    id="new_permission_id"
                    value={newPriceForm.permission_id}
                    onChange={(e) => setNewPriceForm(prev => ({ ...prev, permission_id: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  >
                    <option value="" className="bg-white text-gray-900">เลือกสิทธิ์</option>
                    {permissions
                      .filter(p => !itemPrices.find(ip => ip.permission_id === p.id))
                      .map(perm => (
                        <option key={perm.id} value={perm.id} className="bg-white text-gray-900">
                          {perm.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new_price" className="text-sm font-medium text-gray-700">
                    ราคา (฿)
                  </Label>
                  <Input
                    id="new_price"
                    type="text"
                    inputMode="decimal"
                    value={newPriceForm.price}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setNewPriceForm(prev => ({ ...prev, price: val }));
                      }
                    }}
                    placeholder="0.00"
                    className="border-gray-300"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddPrice}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                disabled={!newPriceForm.permission_id || !newPriceForm.price}
              >
                เพิ่มราคา
              </Button>
            </div>

            {/* Existing Prices */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">ราคาตามสิทธิ์</h3>
              {loadingPrices ? (
                <div className="text-center py-4 text-gray-500">กำลังโหลด...</div>
              ) : itemPrices.length === 0 ? (
                <div className="text-center py-4 text-gray-500">ยังไม่มีราคาตามสิทธิ์</div>
              ) : (
                <div className="space-y-2">
                  {itemPrices.map((itemPrice) => (
                    <div
                      key={itemPrice.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {(itemPrice.permission as any)?.name || `สิทธิ์ #${itemPrice.permission_id}`}
                        </div>
                        {editingPriceId === itemPrice.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={editingPriceValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  setEditingPriceValue(val);
                                }
                              }}
                              className="w-32 border-gray-300"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const priceNum = parseFloat(editingPriceValue);
                                if (!isNaN(priceNum) && priceNum >= 0) {
                                  handleUpdatePrice(itemPrice.id, priceNum);
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              บันทึก
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingPriceId(null);
                                setEditingPriceValue('');
                              }}
                              className="border-gray-300"
                            >
                              ยกเลิก
                            </Button>
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-red-600 mt-1">
                            {Number(itemPrice.price).toFixed(2)} ฿
                          </div>
                        )}
                      </div>
                      {editingPriceId !== itemPrice.id && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPriceId(itemPrice.id);
                              setEditingPriceValue(itemPrice.price.toString());
                            }}
                            className="border-gray-300"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeletePrice(itemPrice.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

