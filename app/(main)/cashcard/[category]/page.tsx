'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, ShoppingCart, Camera, CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type CashcardProduct = {
  id: number;
  provider_product_id: number;
  category: string | null;
  category_display_name: string | null;
  name: string;
  display_name: string;
  price: number;
  base_price: number;
  recommended_price: number | null;
  discount: number | null;
  image_url: string | null;
  info: string | null;
  format_id: string | null;
};

export default function CashcardCategoryPage() {
  const params = useParams<{ category: string }>();
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState<CashcardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CashcardProduct | null>(null);
  const [categoryImage, setCategoryImage] = useState<string | null>(null);
  const [categoryDisplayName, setCategoryDisplayName] = useState<string | null>(null);
  const [categoryInfo, setCategoryInfo] = useState<string | null>(null);

  const category = params?.category ? decodeURIComponent(params.category) : null;

  useEffect(() => {
    if (category) {
      fetchProducts();
    }
  }, [category]);

  const fetchProducts = async () => {
    if (!category) return;
      setLoading(true);
    try {
      const res = await fetch(`/api/cashcard/products/category/${encodeURIComponent(category)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch');
      }
      const json = await res.json();
      setProducts(json.products || []);
      // Use category image if available, otherwise fallback to representative image
      setCategoryImage(json.category_image_url || json.representative_image || null);
      setCategoryDisplayName(json.category_display_name || category);
      setCategoryInfo(json.representative_info || null);
    } catch (err) {
      console.error('Failed to fetch products', err);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลได้', variant: 'destructive' });
      router.push('/cashcard');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (product: CashcardProduct) => {
    setSelectedProduct(product);
  };

  const confirmBuy = async () => {
    if (!selectedProduct) return;
    
    setBuying(true);
    try {
      const reference = `CASH_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      
      const res = await fetch('/api/cashcard/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_id: selectedProduct.id,
          reference: reference
        })
      });
      
      const json = await res.json();
      if (json.ok) {
        toast.show({ 
          title: 'สำเร็จ', 
          description: json.message || 'ซื้อบัตรเติมเงินเรียบร้อยแล้ว ตรวจสอบที่หน้าประวัติ' 
        });
        window.dispatchEvent(new Event('wallet:changed'));
        router.push('/orders');
      } else {
        toast.show({ 
          title: 'เกิดข้อผิดพลาด', 
          description: json.detail || json.error || 'ไม่สามารถซื้อได้',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: 'ไม่สามารถซื้อได้',
        variant: 'destructive'
      });
    } finally {
      setBuying(false);
      setSelectedProduct(null);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  });

  
  // Calculate average discount
  const avgDiscount = products.length > 0 
    ? products.reduce((sum, p) => {
        if (p.discount && p.recommended_price) {
          const discountPct = ((p.recommended_price - p.price) / p.recommended_price) * 100;
          return sum + discountPct;
        }
        return sum;
      }, 0) / products.filter(p => p.discount && p.recommended_price).length
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-32 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 gap-2">
          <ArrowLeft className="size-4" />
          กลับ
        </Button>
        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCard className="size-6" />
            </EmptyMedia>
            <EmptyTitle>ไม่พบสินค้าในหมวดหมู่นี้</EmptyTitle>
            <EmptyDescription>
              ลองเลือกหมวดหมู่อื่นหรือดูรายการทั้งหมด
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Starry Night Background Effect */}
      <div className="fixed inset-0 bg-black" style={{
        backgroundImage: `
          radial-gradient(2px 2px at 20% 30%, white, transparent),
          radial-gradient(2px 2px at 60% 70%, white, transparent),
          radial-gradient(1px 1px at 50% 50%, white, transparent),
          radial-gradient(1px 1px at 80% 10%, white, transparent),
          radial-gradient(2px 2px at 90% 40%, white, transparent),
          radial-gradient(1px 1px at 33% 60%, white, transparent),
          radial-gradient(2px 2px at 10% 80%, white, transparent),
          radial-gradient(1px 1px at 70% 20%, white, transparent),
          radial-gradient(2px 2px at 40% 90%, white, transparent),
          radial-gradient(1px 1px at 15% 50%, white, transparent)
        `,
        backgroundSize: '200% 200%',
        backgroundPosition: '0% 0%',
        opacity: 0.3
      }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button 
        variant="ghost" 
          onClick={() => router.back()} 
        className="mb-6 gap-2 text-white/70 hover:text-white hover:bg-white/10"
      >
        <ArrowLeft className="size-4" />
        กลับ
      </Button>

        {/* Hero Section */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-purple-600/10 rounded-2xl"></div>
          <div className="relative bg-black/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
              {/* Category Image */}
              <div className="flex-shrink-0">
                {categoryImage ? (
                  <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-xl overflow-hidden bg-gradient-to-br from-purple-600/20 to-purple-500/10 border-2 border-purple-500/30 shadow-lg shadow-purple-500/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                      src={categoryImage} 
                      alt={categoryDisplayName || ''} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
                  <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Camera className="size-12 text-purple-400" />
            </div>
          )}
        </div>

              {/* Category Info */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/30 mb-4">
                  <span className="text-xs font-medium text-purple-400">บัตรเติมเงิน</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                  {categoryDisplayName || category}
            </h1>
                {categoryInfo && (
                  <p className="text-sm lg:text-base text-white/70 mb-4 line-clamp-2">
                    {categoryInfo}
                  </p>
                )}
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4">
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-xs">
                ระบบอัตโนมัติ
              </Badge>
                  {avgDiscount > 0 && (
                    <Badge variant="secondary" className="bg-yellow-500/30 text-yellow-400 border-yellow-500/50 text-xs">
                      ส่วนลด {avgDiscount.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-white/60 bg-black/30 rounded-lg px-3 py-2 inline-block">
                  หากซื้อผิด ร้านจะไม่รับผิดชอบทุกกรณี กรุณาเช็คให้เรียบร้อย
            </div>
            </div>
          </div>
        </div>
      </div>

        {/* Products Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingCart className="size-5 text-purple-400" />
            เลือกสินค้า
          </h2>
            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
              const value = product.recommended_price || product.base_price;
              const currentPrice = product.price;
              const originalPrice = product.recommended_price && product.recommended_price > product.price ? product.recommended_price : null;

              return (
                <div
                  key={product.id}
                  className="group relative bg-black/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-5 hover:border-purple-500/50 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1"
                  onClick={() => handleBuy(product)}
                >
                  {/* Gradient Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-purple-600/0 to-purple-600/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  
                  <div className="relative space-y-4">
                    {/* Product Name */}
                    <div className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                      {product.display_name}
                    </div>
                    
                    {/* Value */}
                    <div className="text-sm text-white/60">
                      มูลค่า <span className="font-medium text-white/80">{currencyFormatter.format(value)}</span> บาท
                    </div>
                    
                    {/* Divider */}
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                    
                    {/* Price */}
                    <div>
                      <div className="text-3xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                        {currencyFormatter.format(currentPrice)}
                      </div>
                      {originalPrice && originalPrice > currentPrice && (
                        <div className="text-sm text-red-400 line-through">
                          {currencyFormatter.format(originalPrice)}
                        </div>
                      )}
                    </div>
                    
                    {/* Buy Indicator */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ShoppingCart className="size-3" />
                        <span>คลิกเพื่อซื้อ</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Purchase Confirmation Dialog */}
      <AlertDialog open={!!selectedProduct} onOpenChange={(open) => {
        if (!open) setSelectedProduct(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการซื้อ</AlertDialogTitle>
            <AlertDialogDescription className="pt-4 space-y-2">
              {selectedProduct && (
                <>
                    <div className="font-semibold text-[color:var(--text)]">
                    {selectedProduct.display_name}
                    </div>
                    <div className="text-sm text-[color:var(--text)]/60">
                    มูลค่า: {currencyFormatter.format(selectedProduct.recommended_price || selectedProduct.base_price)} บาท
                    </div>
                  <div className="text-lg font-bold text-purple-400">
                    ราคา: {currencyFormatter.format(selectedProduct.price)} บาท
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={buying}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBuy}
              disabled={buying}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {buying ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  กำลังซื้อ...
                </>
              ) : (
                <>
                  <ShoppingCart className="size-4 mr-2" />
                  ยืนยันการซื้อ
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
