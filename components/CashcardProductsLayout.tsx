'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterUI } from '@/components/ui/dialog';
import { CreditCard, ShoppingCart, Star, Zap, CheckCircle2, X } from 'lucide-react';

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

type CashcardProductsLayoutProps = {
  products: Product[];
  isLoading?: boolean;
};

export default function CashcardProductsLayout({ products, isLoading }: CashcardProductsLayoutProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedItem, setSelectedItem] = useState<ProductItem | null>(null);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const toast = useToast();
  const { openLoginDialog } = useAuthDialog();

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.items && p.items.length > 0);
  }, [products]);

  const handleOpenPriceModal = (product: Product) => {
    setSelectedProduct(product);
    const recommended = product.items.find(item => item.is_recommended);
    setSelectedItem(recommended || product.items[0]);
    setPriceModalOpen(true);
  };

  const handleClosePriceModal = () => {
    setPriceModalOpen(false);
    setSelectedProduct(null);
    setSelectedItem(null);
  };

  const handleSubmit = async () => {
    if (!selectedProduct || !selectedItem) return;

    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const res = await fetch('/api/cashcard/wepay/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_key: selectedProduct.key,
          item_sku: selectedItem.sku
        })
      });

      // Check if unauthorized
      if (res.status === 401) {
        const json = await res.json().catch(() => ({}));
        if (json.error === 'unauthorized') {
          // Open login dialog
          openLoginDialog();
          return;
        }
      }

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
      handleClosePriceModal();
      toast.show({
        title: 'สร้างคำสั่งซื้อสำเร็จ',
        description: `เลขที่ทำรายการ: ${json.order?.transactionId}`,
        variant: 'default'
      });
      
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>ไม่พบบัตรเติมเงิน</p>
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
      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => handleOpenPriceModal(product)}
            className="group relative flex flex-col items-center rounded-xl border-2 border-gray-700 bg-gradient-to-br from-[#0a0a0a] to-[#050505] p-4 transition-all hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02]"
          >
            {/* Badge */}
            {product.badge && (
              <div className="absolute -top-2 -right-2 z-10">
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-2 py-0.5 shadow-md">
                  <Zap className="size-2.5 mr-0.5" />
                  {product.badge.text || `${product.badge.percent}%`}
                </Badge>
              </div>
            )}

            {/* Product Image */}
            <div className="relative w-20 h-20 mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              {product.image_url && !imageErrors.has(product.id) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                  onError={() => {
                    setImageErrors((prev) => new Set(prev).add(product.id));
                  }}
                />
              ) : (
                <CreditCard className="h-10 w-10 text-gray-500" />
              )}
            </div>

            {/* Product Name */}
            <h3 className="text-sm font-semibold text-white text-center line-clamp-2 mb-2 group-hover:text-emerald-400 transition-colors">
              {product.name}
            </h3>

            {/* Price Range */}
            <div className="text-xs text-gray-400 text-center">
              {product.items.length > 0 && (
                <>
                  <span className="text-emerald-400 font-medium">
                    {Number(product.items[0].price).toFixed(2)}฿
                  </span>
                  {product.items.length > 1 && (
                    <span className="text-gray-500"> - {Number(product.items[product.items.length - 1].price).toFixed(2)}฿</span>
                  )}
                </>
              )}
            </div>

            {/* Items Count */}
            <div className="mt-2 text-xs text-gray-500">
              {product.items.length} แพ็คเกจ
            </div>
          </button>
        ))}
      </div>

      {/* Price Selection Modal */}
      <Dialog open={priceModalOpen} onOpenChange={setPriceModalOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0a0a] border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" />
              {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1a1a1a] border border-gray-700">
                {selectedProduct.image_url && !imageErrors.has(selectedProduct.id) ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                      loading="eager"
                      onError={() => {
                        setImageErrors((prev) => new Set(prev).add(selectedProduct.id));
                      }}
                    />
                  </div>
                ) : null}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{selectedProduct.name}</h3>
                  <p className="text-sm text-gray-400">เลือกแพ็คเกจที่ต้องการ</p>
                </div>
              </div>

              {/* Price Options Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2">
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

              {/* Order Summary */}
              <div className="p-4 rounded-lg bg-[#1a1a1a] border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">แพ็กเกจที่เลือก</span>
                  <span className="font-medium text-white">{selectedItem?.name || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">ยอดรวม</span>
                  <span className="text-2xl font-bold text-emerald-500 tabular-nums">
                    {selectedItem ? `${Number(selectedItem.price).toFixed(2)}฿` : '0.00฿'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooterUI>
            <Button
              variant="outline"
              onClick={handleClosePriceModal}
              disabled={submitting}
            >
              ยกเลิก
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
              disabled={!selectedItem || submitting}
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
          </DialogFooterUI>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-sm bg-[#080808] border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {submitMsg?.includes('สำเร็จ') ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <CreditCard className="h-5 w-5 text-emerald-500" />
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
