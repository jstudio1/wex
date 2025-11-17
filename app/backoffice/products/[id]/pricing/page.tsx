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
import { ArrowLeft, Save, Star, FileText } from 'lucide-react';
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
};

export default function ProductPricingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);

  useEffect(() => {
    if (params?.id) {
      fetchData();
    }
  }, [params?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/products/${params?.id}/pricing`);
      if (!res.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }
      const json = await res.json();
      if (json.ok) {
        setProduct(json.data.product);
        setItems(json.data.items || []);
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

  const handleToggleRecommended = async (itemId: number, currentValue: boolean) => {
    // Optimistic update
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, is_recommended: !currentValue }
          : item
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
            : item
        )
      );

      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/products/${params?.id}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            price: item.price,
            original_price: item.original_price,
            markup_percent: item.markup_percent,
            markup_fixed: item.markup_fixed,
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="size-4" />
            กลับ
          </Button>
          <div>
            <h2 className="text-2xl font-bold">จัดการราคา</h2>
            <p className="text-sm text-white/60 mt-1">{product.name}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="size-4" />
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>

      <Card className="bg-black/40 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle>ตั้งค่าราคาแนะนำ</CardTitle>
          <CardDescription>
            เลือกราคาที่ต้องการให้แสดงเป็น "แนะนำ" ในหน้ารายละเอียดสินค้า
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="w-[100px]">สถานะ</TableHead>
                  <TableHead>แพ็กเกจ</TableHead>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead className="w-[150px]">ราคา</TableHead>
                  <TableHead className="w-[150px]">ราคาเดิม</TableHead>
                  <TableHead className="w-[100px]">Markup %</TableHead>
                  <TableHead className="w-[100px]">Markup ฿</TableHead>
                  <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`recommended-${item.id}`}
                          checked={item.is_recommended}
                          onCheckedChange={() => handleToggleRecommended(item.id, item.is_recommended)}
                        />
                        {item.is_recommended && (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-2 py-0.5">
                            <Star className="size-3 mr-1" />
                            แนะนำ
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-white">{item.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-white/60 font-mono">{item.sku}</div>
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
                        className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={item.is_recommended ? 'border-yellow-500/50 text-yellow-300 bg-yellow-500/10' : ''}>
                        {item.is_recommended ? 'แนะนำ' : '-'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

