'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterUI } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, ShoppingCart, Star, Zap, CheckCircle2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';

type ProductItem = {
  id: number;
  name: string;
  sku: string;
  price: string;
  originalPrice: string;
  is_recommended?: boolean;
  icon_url?: string | null;
};

type Product = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  items: ProductItem[];
  badge?: { text?: string | null; percent?: number | null } | null;
};

type MtopupProductsLayoutProps = {
  products: Product[];
  isLoading?: boolean;
};

export default function MtopupProductsLayout({ products, isLoading }: MtopupProductsLayoutProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedItem, setSelectedItem] = useState<ProductItem | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const toast = useToast();
  const isMobile = useIsMobile();

  // Auto-select first product on load
  useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0]);
    }
  }, [products, selectedProduct]);

  // Auto-select first item when product changes
  useEffect(() => {
    if (selectedProduct && selectedProduct.items.length > 0) {
      const recommended = selectedProduct.items.find(item => item.is_recommended);
      setSelectedItem(recommended || selectedProduct.items[0]);
    }
  }, [selectedProduct]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.items && p.items.length > 0);
  }, [products]);

  const validatePhoneNumber = (phone: string): boolean => {
    const trimmed = phone.trim();
    // ตรวจสอบเบอร์โทรไทย (10 หลัก, ขึ้นต้นด้วย 0)
    return /^0[0-9]{9}$/.test(trimmed);
  };

  const canSubmit = useMemo(() => {
    return selectedItem && phoneNumber.trim() && validatePhoneNumber(phoneNumber);
  }, [selectedItem, phoneNumber]);

  const handleSubmit = async () => {
    if (!selectedProduct || !selectedItem || !canSubmit) return;

    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const res = await fetch('/api/mtopup/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_key: selectedProduct.key,
          item_sku: selectedItem.sku,
          input: {
            phone_number: phoneNumber.trim()
          }
        })
      });

      const json = await res.json();
      if (!res.ok) {
        let errorMsg = 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง';
        if (json?.detail) {
          if (typeof json.detail === 'string') {
            errorMsg = json.detail;
          } else if (Array.isArray(json.detail)) {
            errorMsg = json.detail.map((d: any) => {
              if (typeof d === 'string') return d;
              if (d?.message) return d.message;
              return JSON.stringify(d);
            }).join(', ');
          }
        } else if (json?.message) {
          errorMsg = typeof json.message === 'string' ? json.message : JSON.stringify(json.message);
        }
        throw new Error(errorMsg);
      }

      setSubmitMsg(`สร้างคำสั่งซื้อสำเร็จ\nเลขที่ทำรายการ: ${json.order?.transactionId || '-'}`);
      setResultOpen(true);
      toast.show({
        title: 'สร้างคำสั่งซื้อสำเร็จ',
        description: `เลขที่ทำรายการ: ${json.order?.transactionId}`,
        variant: 'default'
      });
      
      // Reset form
      setPhoneNumber('');
      window.dispatchEvent(new Event('wallet:changed'));
    } catch (e: unknown) {
      setSubmitMsg((e as Error).message);
      setResultOpen(true);
      toast.show({
        title: 'ไม่สามารถสั่งซื้อได้',
        description: (e as Error).message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-32 flex-shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>ไม่พบบริการเติมเงินมือถือ</p>
      </div>
    );
  }

  const sortedItems = selectedProduct?.items
    ? [...selectedProduct.items].sort((a, b) => {
        if (a.is_recommended && !b.is_recommended) return -1;
        if (!a.is_recommended && b.is_recommended) return 1;
        return Number(a.price) - Number(b.price);
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Product Selection - Mobile: Dropdown, Desktop: Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            ทั้งหมด {filteredProducts.length} รายการ
          </p>
        </div>
        
        {/* Mobile: Dropdown */}
        {isMobile ? (
          <Select
            value={selectedProduct?.id?.toString() || ''}
            onValueChange={(value) => {
              const product = filteredProducts.find(p => p.id.toString() === value);
              if (product) setSelectedProduct(product);
            }}
          >
            <SelectTrigger className="w-full bg-[#0a0a0a] border-gray-700 text-white">
              <SelectValue placeholder="เลือกเครือข่าย">
                {selectedProduct && (
                  <div className="flex items-center gap-2">
                    {selectedProduct.image_url && (
                      <div className="relative w-5 h-5 rounded overflow-hidden">
                        <Image
                          src={selectedProduct.image_url}
                          alt={selectedProduct.name}
                          fill
                          className="object-cover"
                          sizes="20px"
                        />
                      </div>
                    )}
                    <span>{selectedProduct.name}</span>
                    {selectedProduct.badge && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-1.5 py-0 ml-1">
                        <Zap className="size-2.5 mr-0.5" />
                        {selectedProduct.badge.text || `${selectedProduct.badge.percent}%`}
                      </Badge>
                    )}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-gray-700">
              {filteredProducts.map((product) => (
                <SelectItem
                  key={product.id}
                  value={product.id.toString()}
                  className="text-white focus:bg-emerald-600/20 focus:text-emerald-400"
                >
                  <div className="flex items-center gap-2">
                    {product.image_url && (
                      <div className="relative w-5 h-5 rounded overflow-hidden">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="20px"
                        />
                      </div>
                    )}
                    <span>{product.name}</span>
                    {product.badge && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-1.5 py-0 ml-1">
                        <Zap className="size-2.5 mr-0.5" />
                        {product.badge.text || `${product.badge.percent}%`}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          /* Desktop: Tabs - Wrap to multiple rows */
          <div className="flex flex-wrap gap-2">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  selectedProduct?.id === product.id
                    ? 'border-emerald-600 bg-emerald-600/10 text-emerald-400'
                    : 'border-gray-700 bg-[#0a0a0a] text-gray-300 hover:border-emerald-500 hover:text-emerald-400'
                }`}
              >
                {product.image_url && (
                  <div className="relative w-6 h-6 rounded overflow-hidden">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="24px"
                    />
                  </div>
                )}
                <span className="font-medium whitespace-nowrap">{product.name}</span>
                {product.badge && (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-1.5 py-0">
                    <Zap className="size-2.5 mr-0.5" />
                    {product.badge.text || `${product.badge.percent}%`}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Product Content */}
      {selectedProduct && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Package Selection */}
          <div className="lg:col-span-2">
            <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-500" />
                เลือกแพ็คเกจเติมเงิน
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {sortedItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`relative rounded-xl border-2 transition-all overflow-hidden group ${
                      selectedItem?.id === item.id
                        ? 'border-emerald-600 shadow-lg ring-2 ring-emerald-900/50 scale-[1.02]'
                        : 'border-gray-700 bg-[#0a0a0a] hover:border-emerald-500 hover:shadow-md'
                    }`}
                  >
                    {selectedItem?.id === item.id && (
                      <div className="absolute inset-0 bg-emerald-600/10 pointer-events-none" />
                    )}
                    
                    {item.is_recommended && (
                      <div className="absolute top-1.5 right-1.5 z-10">
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-1.5 py-0 shadow-md">
                          <Star className="size-2.5 mr-0.5" fill="currentColor" />
                          แนะนำ
                        </Badge>
                      </div>
                    )}
                    
                    <div className="p-4 text-center">
                      <div className="text-sm font-semibold text-white mb-2 line-clamp-2">
                        {item.name}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg font-bold text-emerald-500 tabular-nums">
                          {Number(item.price).toFixed(2)}฿
                        </span>
                        {Number(item.originalPrice) > Number(item.price) && (
                          <span className="text-xs text-gray-400 line-through tabular-nums">
                            {Number(item.originalPrice).toFixed(2)}฿
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order Summary with Phone Input */}
          <div className="lg:col-span-1">
            <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-6 sticky top-4 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-500" />
                  สรุปคำสั่งซื้อ
                </h3>
                
                <div className="space-y-3 mb-4 pb-4 border-b border-gray-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">เครือข่าย</span>
                    <span className="font-medium text-white">{selectedProduct.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">แพ็กเกจ</span>
                    <span className="font-medium text-white">{selectedItem?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">ราคา</span>
                    <span className="font-medium text-white tabular-nums">
                      {selectedItem ? `${Number(selectedItem.price).toFixed(2)}฿` : '-'}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-300 font-medium">ยอดรวม</span>
                  <span className="text-2xl font-bold text-emerald-500 tabular-nums">
                    {selectedItem ? `${Number(selectedItem.price).toFixed(2)}฿` : '0.00฿'}
                  </span>
                </div>
              </div>

              {/* Phone Number Input */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-emerald-500" />
                  ข้อมูลการเติมเงิน
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      เบอร์โทรศัพท์ <span className="text-emerald-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="0812345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
                      maxLength={10}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      กรุณากรอกเบอร์โทรศัพท์ 10 หลัก (ขึ้นต้นด้วย 0)
                    </p>
                    {phoneNumber && !validatePhoneNumber(phoneNumber) && (
                      <p className="mt-1 text-xs text-red-400">
                        กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก, ขึ้นต้นด้วย 0)
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <Spinner className="mr-2" />
                    กำลังดำเนินการ...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    สั่งซื้อสินค้า
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Result Dialog */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-sm bg-[#080808] border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {submitMsg?.includes('สำเร็จ') ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Phone className="h-5 w-5 text-emerald-500" />
              )}
              สถานะคำสั่งซื้อ
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-200 whitespace-pre-wrap break-words">
            {submitMsg || '—'}
          </div>
          <DialogFooterUI>
            <Button onClick={() => setResultOpen(false)}>ปิด</Button>
          </DialogFooterUI>
        </DialogContent>
      </Dialog>
    </div>
  );
}

