'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SpinnerCustom } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import {
  Save,
  Star,
  FileText,
  Plus,
  Trash2,
  DollarSign,
  GripVertical,
  Loader2,
} from 'lucide-react';

const darkInputClass =
  'bg-[#0f0f0f] border border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500';

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

const computeAgentCostFromDiscount = (publicPrice: number | null, discountPercent: number) => {
  if (publicPrice == null || !Number.isFinite(publicPrice)) return null;
  const clamped = Math.min(100, Math.max(0, discountPercent || 0));
  const cost = publicPrice * (1 - clamped / 100);
  return Number(cost.toFixed(4));
};

const computeDiscountFromCost = (publicPrice: number | null, agentCost: number) => {
  if (publicPrice == null || publicPrice <= 0 || !Number.isFinite(agentCost)) return 0;
  const diff = ((publicPrice - agentCost) / publicPrice) * 100;
  const clamped = Math.min(100, Math.max(0, diff));
  return Number(clamped.toFixed(2));
};

const normalizeItem = (item: any) => {
  const publicPrice = toNullableNumber(item.public_price ?? item.original_price);
  const agentCost = toNumber(item.agent_cost_price ?? item.price);
  const discountPercent = toNumber(item.agent_discount_percent, 0);
  return {
    id: item.id,
    name: item.name ?? '',
    sku: item.sku ?? '',
    price: agentCost,
    agent_cost_price: agentCost,
    public_price: publicPrice,
    original_price: publicPrice,
    agent_discount_percent: discountPercent,
    markup_percent: toNumber(item.markup_percent),
    markup_fixed: toNumber(item.markup_fixed),
    is_recommended: Boolean(item.is_recommended),
    icon_url: item.icon_url ?? null,
  };
};

const normalizeItemPrice = (price: any) => ({
  id: price.id,
  permission_id: price.permission_id,
  price: toNumber(price.price),
  permission: price.permission
    ? { id: price.permission.id, name: price.permission.name }
    : undefined,
});

const sortItems = (items: any[]) => {
  if (!Array.isArray(items)) return [];
  const isDiamond = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes('diamond') || lower.includes('เพชร');
  };
  return [...items].sort((a, b) => {
    const aScore = isDiamond(a.name) ? 0 : 1;
    const bScore = isDiamond(b.name) ? 0 : 1;
    if (aScore !== bScore) return aScore - bScore;
    const aPrice = Number.isFinite(a.agent_cost_price) ? a.agent_cost_price : a.price;
    const bPrice = Number.isFinite(b.agent_cost_price) ? b.agent_cost_price : b.price;
    return aPrice - bPrice;
  });
};

type Product = {
  id: number;
  name: string;
  key: string;
};

type ProductItem = ReturnType<typeof normalizeItem>;

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number | null;
}

export default function PricingDialog({ open, onOpenChange, productId }: PricingDialogProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    sku: '',
    price: '',
    original_price: '',
    discount_percent: '',
    markup_percent: '',
    markup_fixed: '',
    icon_url: '',
    is_recommended: false,
  });
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedItemForPrice, setSelectedItemForPrice] = useState<ProductItem | null>(null);
  const [itemPrices, setItemPrices] = useState<
    Array<{ id: number; permission_id: number; price: number; permission?: { id: number; name: string } }>
  >([]);
  const [permissions, setPermissions] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [newPriceForm, setNewPriceForm] = useState({ permission_id: '', price: '' });
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');

  useEffect(() => {
    if (open && productId) {
      fetchData();
      fetchPermissions();
    } else {
      setProduct(null);
      setItems([]);
      setPermissions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  const fetchData = async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/products/${productId}/pricing`);
      if (!res.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }
      const json = await res.json();
      if (json.ok) {
        setProduct(json.data.product);
        setItems(sortItems((json.data.items || []).map((item: any) => normalizeItem(item))));
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาด');
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

  const fetchPermissions = async () => {
    try {
      const permissionsRes = await fetch('/api/admin/permissions');
      if (permissionsRes.ok) {
        const permJson = await permissionsRes.json();
        setPermissions(permJson.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRecommended = async (itemId: number, currentValue: boolean) => {
    if (!productId) return;
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, is_recommended: !currentValue } : item,
      ),
    );

    try {
      const res = await fetch(`/api/admin/products/${productId}/pricing`, {
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
    } catch (err) {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, is_recommended: currentValue } : item,
        ),
      );

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
      discount_percent: '',
      markup_percent: '',
      markup_fixed: '',
      icon_url: '',
      is_recommended: false,
    });
  };

  const handleCreateItem = async () => {
    if (!productId) return;
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

    const originalPriceRaw = newItemForm.original_price.trim();
    const originalPriceNum = originalPriceRaw === '' ? null : parseFloat(originalPriceRaw);
    if (originalPriceNum !== null && (Number.isNaN(originalPriceNum) || originalPriceNum < 0)) {
      toast.show({
        title: 'ราคาเดิมไม่ถูกต้อง',
        description: 'กรุณากรอกราคาเดิมเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive',
      });
      return;
    }
    const effectivePublicPrice = originalPriceNum ?? priceNum;

    const discountPercentNum =
      newItemForm.discount_percent.trim() === '' ? 0 : parseFloat(newItemForm.discount_percent);
    if (Number.isNaN(discountPercentNum) || discountPercentNum < 0) {
      toast.show({
        title: 'ส่วนลดไม่ถูกต้อง',
        description: 'ส่วนลดต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive',
      });
      return;
    }

    const markupPercentNum =
      newItemForm.markup_percent.trim() === '' ? 0 : parseFloat(newItemForm.markup_percent);
    if (Number.isNaN(markupPercentNum) || markupPercentNum < 0) {
      toast.show({
        title: 'Markup % ไม่ถูกต้อง',
        description: 'Markup % ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive',
      });
      return;
    }

    const markupFixedNum =
      newItemForm.markup_fixed.trim() === '' ? 0 : parseFloat(newItemForm.markup_fixed);
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
      const agentCostValue =
        effectivePublicPrice !== null && discountPercentNum > 0
          ? computeAgentCostFromDiscount(effectivePublicPrice, discountPercentNum) ?? priceNum
          : priceNum;
      const res = await fetch(`/api/admin/products/${productId}/pricing/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          sku: trimmedSku,
          price: Number.isFinite(agentCostValue) ? agentCostValue : 0,
          original_price: effectivePublicPrice,
          public_price: effectivePublicPrice,
          agent_discount_percent: discountPercentNum,
          agent_cost_price: Number.isFinite(agentCostValue) ? agentCostValue : 0,
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
    if (!productId) return;
    const targetItem = items.find((item) => item.id === itemId);
    if (!targetItem) return;

    const confirmed = confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแพ็กเกจ "${targetItem.name}"?`);
    if (!confirmed) return;

    try {
      setDeletingItemId(itemId);
      const res = await fetch(`/api/admin/products/${productId}/pricing/${itemId}`, {
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
    if (!productId) return;
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
      const res = await fetch(`/api/admin/products/${productId}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            name: item.name.trim(),
            sku: item.sku.trim(),
            price: item.agent_cost_price,
            original_price: item.public_price ?? item.original_price,
            public_price: item.public_price ?? item.original_price,
            agent_cost_price: item.agent_cost_price,
            agent_discount_percent: item.agent_discount_percent,
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
      onOpenChange(false);
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

  const openPriceDialog = (item: ProductItem) => {
    setSelectedItemForPrice(item);
    setPriceDialogOpen(true);
    setNewPriceForm({ permission_id: '', price: '' });
    setEditingPriceId(null);
    setEditingPriceValue('');
    fetchItemPrices(item.id);
  };

  const fetchItemPrices = async (itemId: number) => {
    if (!productId) return;
    try {
      setLoadingPrices(true);
      const res = await fetch(`/api/admin/products/${productId}/pricing/${itemId}/prices`);
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
    if (!productId || !selectedItemForPrice) return;
    if (!newPriceForm.permission_id || !newPriceForm.price) {
      toast.show({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        description: 'กรุณาเลือกสิทธิ์และกรอกราคา',
        variant: 'destructive',
      });
      return;
    }

    const priceNum = parseFloat(newPriceForm.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.show({
        title: 'ราคาไม่ถูกต้อง',
        description: 'ราคาต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${productId}/pricing/${selectedItemForPrice.id}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission_id: parseInt(newPriceForm.permission_id, 10),
          price: priceNum,
        }),
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
    if (!productId || !selectedItemForPrice) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}/pricing/${selectedItemForPrice.id}/prices/${priceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice }),
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
    if (!productId || !selectedItemForPrice) return;
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบราคานี้?')) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}/pricing/${selectedItemForPrice.id}/prices/${priceId}`, {
        method: 'DELETE',
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

  const dialogTitle = product ? `จัดการราคา - ${product.name}` : 'จัดการราคา';

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          onOpenChange(false);
          setCreateDialogOpen(false);
          setPriceDialogOpen(false);
          setSelectedItemForPrice(null);
        } else {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent className="!max-w-6xl max-h-[90vh] overflow-y-auto bg-[#040404] border border-gray-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-gray-400">
            ตั้งค่าราคา ขนาดแพ็กเกจ และราคาตามสิทธิ์ได้จากหน้าต่างนี้
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <SpinnerCustom className="py-0" />
          </div>
        ) : !product || items.length === 0 ? (
          <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText className="size-6" />
              </EmptyMedia>
              <EmptyTitle>ไม่พบข้อมูล</EmptyTitle>
              <EmptyDescription>ไม่พบรายการราคา กรุณาตรวจสอบข้อมูล</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm text-gray-400">สินค้า</p>
                <h3 className="text-lg font-semibold text-white">{product.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetNewItemForm();
                    setCreateDialogOpen(true);
                  }}
                  className="gap-2 border-gray-700 text-white bg-[#050505] hover:bg-gray-900"
                >
                  <Plus className="size-4" />
                  เพิ่มแพ็กเกจ
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-900/40"
                >
                  <Save className="size-4" />
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </div>
            </div>

            <Card className="bg-[#050505] border border-gray-900 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
              <CardHeader>
                <CardTitle className="text-white">ตั้งค่าราคาแนะนำ</CardTitle>
                <CardDescription className="text-gray-400">
                  เลือกราคาที่ต้องการให้แสดงเป็น "แนะนำ" ในหน้ารายละเอียดสินค้า
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-gray-900 bg-[#0a0a0a] overflow-hidden">
                  <Table className="min-w-[1200px]">
                    <TableHeader>
                      <TableRow className="border-gray-900 bg-white/5 hover:bg-white/5 text-gray-300">
                        <TableHead className="min-w-[40px] text-gray-300"></TableHead>
                        <TableHead className="min-w-[120px] text-gray-300">สถานะ</TableHead>
                        <TableHead className="min-w-[220px] text-gray-300">แพ็กเกจ</TableHead>
                        <TableHead className="min-w-[140px] text-gray-300">SKU</TableHead>
                        <TableHead className="min-w-[260px] text-gray-300">Icon URL</TableHead>
                        <TableHead className="min-w-[150px] text-gray-300">ราคา Public</TableHead>
                        <TableHead className="min-w-[140px] text-gray-300">% ส่วนลด</TableHead>
                        <TableHead className="min-w-[150px] text-gray-300">ราคาทุน</TableHead>
                        <TableHead className="min-w-[120px] text-gray-300">Markup %</TableHead>
                        <TableHead className="min-w-[120px] text-gray-300">Markup ฿</TableHead>
                        <TableHead className="min-w-[120px] text-right text-gray-300">จัดการ</TableHead>
                        <TableHead className="min-w-[120px] text-center text-gray-300">ราคาสิทธิ์</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow
                          key={item.id}
                          className={`border-gray-900 hover:bg-white/5 transition-colors ${
                            draggingItemId === item.id ? 'bg-emerald-500/5' : ''
                          }`}
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
                          <TableCell className="text-gray-500 align-middle">
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
                                <Badge className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 text-xs px-2 py-0.5">
                                  <Star className="size-3 mr-1 text-emerald-200" />
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
                                  prevItems.map((i) => (i.id === item.id ? { ...i, name: value } : i)),
                                );
                              }}
                              placeholder="ชื่อแพ็กเกจ"
                              className={`${darkInputClass} w-full min-w-[220px]`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              value={item.sku}
                              onChange={(e) => {
                                const value = e.target.value;
                                setItems((prevItems) =>
                                  prevItems.map((i) => (i.id === item.id ? { ...i, sku: value } : i)),
                                );
                              }}
                              placeholder="SKU"
                              className={`${darkInputClass} font-mono text-sm w-full min-w-[140px]`}
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
                                    className="h-6 w-6 object-contain rounded border border-gray-700 bg-black p-0.5"
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
                                  setItems((prevItems) =>
                                    prevItems.map((i) =>
                                      i.id === item.id ? { ...i, icon_url: val || null } : i,
                                    ),
                                  );
                                }}
                                className={`${darkInputClass} w-full min-w-[240px] text-sm font-mono`}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={
                                item.public_price === null || item.public_price === undefined
                                  ? ''
                                  : String(item.public_price)
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  setItems((prevItems) =>
                                    prevItems.map((i) => {
                                      if (i.id !== item.id) return i;
                                      if (val === '') {
                                        return {
                                          ...i,
                                          public_price: null,
                                          original_price: null,
                                        };
                                      }
                                      const parsed = parseFloat(val);
                                      if (Number.isNaN(parsed) || parsed < 0) return i;
                                      const recalculatedCost =
                                        computeAgentCostFromDiscount(parsed, i.agent_discount_percent) ??
                                        i.agent_cost_price;
                                      return {
                                        ...i,
                                        public_price: parsed,
                                        original_price: parsed,
                                        price: recalculatedCost,
                                        agent_cost_price: recalculatedCost,
                                      };
                                    }),
                                  );
                                }
                              }}
                              placeholder="0.00"
                              className={`${darkInputClass} w-full min-w-[150px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={item.agent_discount_percent ?? 0}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  setItems((prevItems) =>
                                    prevItems.map((i) => {
                                      if (i.id !== item.id) return i;
                                      const percent = val === '' ? 0 : parseFloat(val) || 0;
                                      const clamped = Math.max(0, Math.min(100, percent));
                                      const recalculatedCost =
                                        computeAgentCostFromDiscount(i.public_price ?? i.original_price, clamped) ??
                                        i.agent_cost_price;
                                      return {
                                        ...i,
                                        agent_discount_percent: clamped,
                                        price: recalculatedCost,
                                        agent_cost_price: recalculatedCost,
                                      };
                                    }),
                                  );
                                }
                              }}
                              placeholder="0"
                              className={`${darkInputClass} w-full min-w-[130px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={item.agent_cost_price ?? item.price}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  setItems((prevItems) =>
                                    prevItems.map((i) => {
                                      if (i.id !== item.id) return i;
                                      const parsed = val === '' ? 0 : parseFloat(val) || 0;
                                      const newDiscount = computeDiscountFromCost(
                                        i.public_price ?? i.original_price,
                                        parsed,
                                      );
                                      return {
                                        ...i,
                                        price: parsed,
                                        agent_cost_price: parsed,
                                        agent_discount_percent: Number.isFinite(newDiscount)
                                          ? newDiscount
                                          : i.agent_discount_percent,
                                      };
                                    }),
                                  );
                                }
                              }}
                              placeholder="0.00"
                              className={`${darkInputClass} w-full min-w-[150px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
                                  setItems((prevItems) =>
                                    prevItems.map((i) =>
                                      i.id === item.id
                                        ? { ...i, markup_percent: val === '' ? 0 : parseFloat(val) || 0 }
                                        : i,
                                    ),
                                  );
                                }
                              }}
                              className={`${darkInputClass} w-full min-w-[130px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
                                  setItems((prevItems) =>
                                    prevItems.map((i) =>
                                      i.id === item.id
                                        ? { ...i, markup_fixed: val === '' ? 0 : parseFloat(val) || 0 }
                                        : i,
                                    ),
                                  );
                                }
                              }}
                              className={`${darkInputClass} w-full min-w-[130px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={deletingItemId === item.id}
                                className="border-red-600/40 text-red-300 hover:bg-red-900/20"
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
                              className="gap-2 border-gray-700 text-white hover:bg-gray-900"
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
              onOpenChange={(openState) => {
                setCreateDialogOpen(openState);
                if (!openState) resetNewItemForm();
              }}
            >
              <DialogContent className="sm:max-w-[520px] bg-[#050505] text-white border border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">เพิ่มแพ็กเกจใหม่</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    กรอกข้อมูลแพ็กเกจที่จะเพิ่มให้ครบถ้วน
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="new_item_name" className="text-sm font-medium text-gray-200">
                        ชื่อแพ็กเกจ
                      </Label>
                      <Input
                        id="new_item_name"
                        type="text"
                        value={newItemForm.name}
                        onChange={(e) => setNewItemForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="เช่น 500 เพชร"
                        className={darkInputClass}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new_item_sku" className="text-sm font-medium text-gray-200">
                        SKU
                      </Label>
                      <Input
                        id="new_item_sku"
                        type="text"
                        value={newItemForm.sku}
                        onChange={(e) => setNewItemForm((prev) => ({ ...prev, sku: e.target.value }))}
                        placeholder="เช่น FF500"
                        className={`${darkInputClass} font-mono text-sm`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="new_item_price" className="text-sm font-medium text-gray-200">
                        ราคาทุน (หลังส่วนลด)
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
                        className={darkInputClass}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new_item_original_price" className="text-sm font-medium text-gray-200">
                        ราคา Public (จาก wePAY)
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
                        className={darkInputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="new_item_discount_percent" className="text-sm font-medium text-gray-200">
                      % ส่วนลดตัวแทน
                    </Label>
                    <Input
                      id="new_item_discount_percent"
                      type="text"
                      inputMode="decimal"
                      value={newItemForm.discount_percent}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setNewItemForm((prev) => ({ ...prev, discount_percent: value }));
                        }
                      }}
                      placeholder="0"
                      className={darkInputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="new_item_markup_percent" className="text-sm font-medium text-gray-200">
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
                        className={darkInputClass}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new_item_markup_fixed" className="text-sm font-medium text-gray-200">
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
                        className={darkInputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="new_item_icon_url" className="text-sm font-medium text-gray-200">
                      Icon URL (ถ้ามี)
                    </Label>
                    <Input
                      id="new_item_icon_url"
                      type="text"
                      value={newItemForm.icon_url}
                      onChange={(e) => setNewItemForm((prev) => ({ ...prev, icon_url: e.target.value }))}
                      placeholder="https://example.com/icon.png"
                      className={darkInputClass}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-black/30 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">ตั้งเป็นแพ็กเกจแนะนำ</p>
                      <p className="text-xs text-gray-400">แสดงป้ายแนะนำในหน้ารายละเอียดสินค้า</p>
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
                    className="border-gray-700 text-white hover:bg-gray-900"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={handleCreateItem}
                    disabled={creatingItem}
                    className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                  >
                    {creatingItem ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    เพิ่มแพ็กเกจ
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-[#050505] text-white border border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">จัดการราคาตามสิทธิ์</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    {selectedItemForPrice && (
                      <div className="mt-2 space-y-1 text-left">
                        <div className="font-semibold text-white">{selectedItemForPrice.name}</div>
                        <div className="text-sm text-gray-400">SKU: {selectedItemForPrice.sku}</div>
                        <div className="text-sm text-gray-500">
                          ราคาปกติ: {Number(selectedItemForPrice.agent_cost_price ?? selectedItemForPrice.price).toFixed(2)} ฿
                        </div>
                      </div>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="border border-gray-800 rounded-lg p-4 bg-black/30">
                    <h3 className="font-semibold text-white mb-3">เพิ่มราคาใหม่</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="new_permission_id" className="text-sm font-medium text-gray-200">
                          สิทธิ์
                        </Label>
                        <select
                          id="new_permission_id"
                          value={newPriceForm.permission_id}
                          onChange={(e) => setNewPriceForm((prev) => ({ ...prev, permission_id: e.target.value }))}
                          className="w-full rounded-md border border-gray-700 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <option value="" className="bg-[#0f0f0f] text-white">
                            เลือกสิทธิ์
                          </option>
                          {permissions
                            .filter((p) => !itemPrices.find((ip) => ip.permission_id === p.id))
                            .map((perm) => (
                              <option key={perm.id} value={perm.id} className="bg-[#0f0f0f] text-white">
                                {perm.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new_price" className="text-sm font-medium text-gray-200">
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
                              setNewPriceForm((prev) => ({ ...prev, price: val }));
                            }
                          }}
                          placeholder="0.00"
                          className={darkInputClass}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAddPrice}
                      className="mt-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                      disabled={!newPriceForm.permission_id || !newPriceForm.price}
                    >
                      เพิ่มราคา
                    </Button>
                  </div>

                  <div>
                    <h3 className="font-semibold text-white mb-3">ราคาตามสิทธิ์</h3>
                    {loadingPrices ? (
                      <div className="text-center py-4 text-gray-500">กำลังโหลด...</div>
                    ) : itemPrices.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">ยังไม่มีราคาตามสิทธิ์</div>
                    ) : (
                      <div className="space-y-2">
                        {itemPrices.map((itemPrice) => (
                          <div
                            key={itemPrice.id}
                            className="flex items-center justify-between p-3 border border-gray-800 rounded-lg bg-black/40"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-white">
                                {itemPrice.permission?.name || `Permission ${itemPrice.permission_id}`}
                              </div>
                              <div className="text-xs text-gray-500">ID: {itemPrice.permission_id}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingPriceId === itemPrice.id ? (
                                <>
                                  <Input
                                    value={editingPriceValue}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        setEditingPriceValue(val);
                                      }
                                    }}
                                    className={`${darkInputClass} w-24 text-right`}
                                  />
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() =>
                                      handleUpdatePrice(itemPrice.id, parseFloat(editingPriceValue || '0') || 0)
                                    }
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
                                  >
                                    ยกเลิก
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <div className="text-lg font-semibold text-white">
                                    {itemPrice.price.toFixed(2)} ฿
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingPriceId(itemPrice.id);
                                      setEditingPriceValue(String(itemPrice.price));
                                    }}
                                  >
                                    แก้ไข
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-600/40 text-red-300 hover:bg-red-900/20"
                                    onClick={() => handleDeletePrice(itemPrice.id)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

