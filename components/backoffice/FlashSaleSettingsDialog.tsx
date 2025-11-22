'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Zap, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductItem {
  id: number;
  name: string;
  sku: string;
  price: number;
  original_price: number | null;
  public_price: number | null;
  is_recommended: boolean;
  icon_url: string | null;
  is_flashsale: boolean;
  flashsale_price: number | null;
  flashsale_max_quantity: number | null;
  flashsale_duration_days: number | null;
  flashsale_start_date: string | null;
}

interface FlashSaleSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: number;
    name: string;
    is_flashsale: boolean;
    flashsale_price: number | null;
  } | null;
  onSuccess?: () => void;
}

export default function FlashSaleSettingsDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: FlashSaleSettingsDialogProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isFlashsale, setIsFlashsale] = useState(false);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<number, { 
    isSelected: boolean; 
    flashsalePrice: string;
    maxQuantity: string;
    durationDays: string;
  }>>(new Map());

  useEffect(() => {
    if (product && open) {
      setIsFlashsale(product.is_flashsale || false);
      fetchItems();
    } else {
      setIsFlashsale(false);
      setItems([]);
      setSelectedItems(new Map());
    }
  }, [product, open]);

  const fetchItems = async () => {
    if (!product) return;
    
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/items`);
      if (!res.ok) throw new Error('ไม่สามารถดึงรายการสินค้าได้');
      const json = await res.json();
      const fetchedItems = json.data || [];
      setItems(fetchedItems);
      
      // Initialize selected items map
      const newMap = new Map<number, { 
        isSelected: boolean; 
        flashsalePrice: string;
        maxQuantity: string;
        durationDays: string;
      }>();
      fetchedItems.forEach((item: ProductItem) => {
        newMap.set(item.id, {
          isSelected: item.is_flashsale || false,
          flashsalePrice: item.flashsale_price ? item.flashsale_price.toString() : '',
          maxQuantity: item.flashsale_max_quantity ? item.flashsale_max_quantity.toString() : '',
          durationDays: item.flashsale_duration_days ? item.flashsale_duration_days.toString() : '',
        });
      });
      setSelectedItems(newMap);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoadingItems(false);
    }
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { isSelected: false, flashsalePrice: '', maxQuantity: '', durationDays: '' };
      newMap.set(itemId, { ...current, isSelected: !current.isSelected });
      return newMap;
    });
  };

  const updateItemFlashsalePrice = (itemId: number, price: string) => {
    setSelectedItems((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { isSelected: false, flashsalePrice: '', maxQuantity: '', durationDays: '' };
      newMap.set(itemId, { ...current, flashsalePrice: price });
      return newMap;
    });
  };

  const updateItemMaxQuantity = (itemId: number, quantity: string) => {
    setSelectedItems((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { isSelected: false, flashsalePrice: '', maxQuantity: '', durationDays: '' };
      newMap.set(itemId, { ...current, maxQuantity: quantity });
      return newMap;
    });
  };

  const updateItemDurationDays = (itemId: number, days: string) => {
    setSelectedItems((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { isSelected: false, flashsalePrice: '', maxQuantity: '', durationDays: '' };
      newMap.set(itemId, { ...current, durationDays: days });
      return newMap;
    });
  };

  const handleSave = async () => {
    if (!product) return;

    // Check if at least one item is selected
    const hasSelectedItem = Array.from(selectedItems.values()).some(item => item.isSelected);
    if (isFlashsale && !hasSelectedItem) {
      toast.show({
        title: 'กรุณาเลือกสินค้า',
        description: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการเพื่อแสดงใน Flash Sale',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Update product is_flashsale status
      const productRes = await fetch('/api/admin/products/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{
            id: product.id,
            name: product.name,
            is_flashsale: isFlashsale,
          }],
        }),
      });

      if (!productRes.ok) {
        const json = await productRes.json().catch(() => ({}));
        throw new Error(json.error || 'บันทึกไม่สำเร็จ');
      }

      // Update product items flash sale settings
      const itemUpdates = Array.from(selectedItems.entries()).map(([itemId, settings]) => {
        const updateData: any = {
          id: itemId,
          is_flashsale: settings.isSelected,
          flashsale_price: settings.flashsalePrice.trim() ? parseFloat(settings.flashsalePrice) : null,
          flashsale_max_quantity: settings.maxQuantity.trim() ? parseInt(settings.maxQuantity) : null,
          flashsale_duration_days: settings.durationDays.trim() ? parseInt(settings.durationDays) : null,
        };

        // If enabling flash sale and duration is set, set start_date to now
        if (settings.isSelected && settings.durationDays.trim()) {
          updateData.flashsale_start_date = new Date().toISOString();
        } else if (!settings.isSelected) {
          // If disabling flash sale, clear start_date
          updateData.flashsale_start_date = null;
        }

        return updateData;
      });

      if (itemUpdates.length > 0) {
        const itemsRes = await fetch('/api/admin/products/items/flashsale', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemUpdates }),
        });

        if (!itemsRes.ok) {
          const json = await itemsRes.json().catch(() => ({}));
          throw new Error(json.error || 'บันทึกการตั้งค่าสินค้าไม่สำเร็จ');
        }
      }

      toast.show({
        title: 'สำเร็จ',
        description: 'บันทึกการตั้งค่า Flash Sale สำเร็จ',
        variant: 'default',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
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

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-amber-500">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span>ตั้งค่า Flash Sale</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="rounded-lg border border-gray-800 p-3 bg-gray-900/30">
            <p className="text-sm font-medium text-gray-300 mb-1">สินค้า</p>
            <p className="text-white font-semibold">{product.name}</p>
          </div>

          <div className="rounded-lg border border-gray-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="flashsale-toggle" className="text-sm font-medium text-white cursor-pointer">
                  แสดงใน Flash Sale
                </Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  เปิดเพื่อแสดงสินค้านี้ในหน้าแรกส่วน Flash Sale
                </p>
              </div>
              <Switch
                id="flashsale-toggle"
                checked={isFlashsale}
                onCheckedChange={setIsFlashsale}
              />
            </div>

            {isFlashsale && (
              <div className="space-y-4 pt-2 border-t border-gray-800">
                <div>
                  <Label className="text-sm font-medium text-white mb-2 block">
                    เลือกสินค้าที่จะแสดงใน Flash Sale
                  </Label>
                  <p className="text-xs text-gray-400 mb-3">
                    เลือกสินค้าที่ต้องการแสดงในหน้าแรกส่วน Flash Sale และตั้งค่าราคาพิเศษ (ถ้าต้องการ)
                  </p>
                </div>

                {loadingItems ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">
                    ไม่พบรายการสินค้า
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {items.map((item) => {
                      const settings = selectedItems.get(item.id) || { isSelected: false, flashsalePrice: '', maxQuantity: '', durationDays: '' };
                      const isSelected = settings.isSelected;
                      
                      return (
                        <div
                          key={item.id}
                          className={`rounded-lg border p-3 transition-all ${
                            isSelected
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-gray-800 bg-gray-900/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleItemSelection(item.id)}
                              className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-gray-600 bg-transparent'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-white">{item.name}</p>
                                {item.is_recommended && (
                                  <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-xs">
                                    แนะนำ
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mb-2">SKU: {item.sku}</p>
                              <div className="flex items-center gap-4 text-xs">
                                <div>
                                  <span className="text-gray-500">ราคาปกติ: </span>
                                  <span className="text-white font-medium">
                                    {Number(item.price || 0).toFixed(2)} ฿
                                  </span>
                                </div>
                                {item.original_price && Number(item.original_price) > Number(item.price) && (
                                  <div>
                                    <span className="text-gray-500">ราคาเดิม: </span>
                                    <span className="text-gray-400 line-through">
                                      {Number(item.original_price).toFixed(2)} ฿
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
                              <div>
                                <Label className="text-xs font-medium text-gray-300 mb-1.5 block">
                                  ราคา Flash Sale (บาท) - ถ้าไม่ตั้งจะใช้ราคาปกติ
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={settings.flashsalePrice}
                                  onChange={(e) => updateItemFlashsalePrice(item.id, e.target.value)}
                                  placeholder="เช่น 299.00"
                                  className="bg-[#1a1a1a] border-gray-700 text-white text-sm"
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs font-medium text-gray-300 mb-1.5 block">
                                    จำนวนจำกัด (ชิ้น)
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={settings.maxQuantity}
                                    onChange={(e) => updateItemMaxQuantity(item.id, e.target.value)}
                                    placeholder="เช่น 100"
                                    className="bg-[#1a1a1a] border-gray-700 text-white text-sm"
                                  />
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    จำนวนสูงสุดที่ขายได้ (ถ้าไม่ตั้ง = ไม่จำกัด)
                                  </p>
                                </div>
                                
                                <div>
                                  <Label className="text-xs font-medium text-gray-300 mb-1.5 block">
                                    ระยะเวลาขาย (วัน)
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={settings.durationDays}
                                    onChange={(e) => updateItemDurationDays(item.id, e.target.value)}
                                    placeholder="เช่น 7"
                                    className="bg-[#1a1a1a] border-gray-700 text-white text-sm"
                                  />
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    จำนวนวันที่ขาย (ถ้าไม่ตั้ง = ไม่จำกัด)
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
          >
            {saving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                กำลังบันทึก...
              </>
            ) : (
              'บันทึก'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

