'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, ShoppingCart, Info, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type AppPremiumProduct = {
  id: number;
  provider_product_id: number;
  name: string;
  display_name: string;
  price: number;
  base_price: number;
  stock: number;
  image_url: string | null;
  description: string | null;
};

export default function PremiumAppDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [product, setProduct] = useState<AppPremiumProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [params?.id]);

  const fetchProduct = async () => {
    if (!params?.id) return;
    try {
      const res = await fetch(`/api/app-premium/products/${params.id}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setProduct(json.data as AppPremiumProduct);
      } else {
        toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่พบสินค้านี้', variant: 'destructive' });
        router.push('/premium-app');
      }
    } catch (err) {
      console.error('Failed to fetch product', err);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลได้', variant: 'destructive' });
      router.push('/premium-app');
    } finally {
      setLoading(false);
    }
  };

  const generateReference = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `APP_${timestamp}_${random}`;
  };

  const handleBuy = async () => {
    if (!product) return;
    
    const reference = generateReference();
    
    setBuying(true);
    try {
      const res = await fetch('/api/app-premium/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_id: product.id,
          reference: reference
        })
      });
      
      const json = await res.json();
      if (json.ok) {
        toast.show({ title: 'สำเร็จ', description: 'ซื้อสินค้าแอพพรีเมี่ยมเรียบร้อยแล้ว ตรวจสอบที่หน้าประวัติ' });
        window.dispatchEvent(new Event('wallet:changed'));
        router.push('/orders');
      } else {
        toast.show({ 
          title: 'เกิดข้อผิดพลาด', 
          description: json.detail || json.error || 'ไม่สามารถซื้อได้',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Buy error:', err);
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: 'ไม่สามารถซื้อได้',
        variant: 'destructive'
      });
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Skeleton className="h-10 w-24 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="aspect-square rounded-xl" />
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return null;
  }

  const canBuy = product.stock === null || product.stock > 0;

  const currencyFormatter = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()} 
        className="mb-6 gap-2 text-white/70 hover:text-white hover:bg-white/10"
      >
        <ArrowLeft className="size-4" />
        กลับ
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column - Image and Description */}
        <div className="space-y-6">
          {/* Image */}
          <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm group">
            {product.image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image_url}
                  alt={product.display_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {!canBuy && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                    <Badge variant="destructive" className="text-lg font-semibold px-6 py-3">
                      สินค้าหมด
                    </Badge>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                <Package className="size-16 text-white/20" />
              </div>
            )}
          </div>

        </div>

        {/* Right Column - Product Info and Buy Section */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Header Section */}
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
              {product.display_name}
            </h1>
            
            <div className="flex items-center gap-3 flex-wrap mb-4">
              {canBuy ? (
                <Badge className="bg-green-600/90 text-white border-green-500/30">
                  พร้อมจำหน่าย
                </Badge>
              ) : (
                <Badge variant="destructive">
                  ขายหมด
                </Badge>
              )}
            </div>
          </div>

          {/* Description - Scrollable Textarea */}
          {product.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="size-4 text-white/60" />
                <h3 className="text-sm font-semibold text-white/80">รายละเอียดสินค้า</h3>
              </div>
              <textarea
                readOnly
                value={product.description}
                className="w-full h-48 p-4 rounded-lg border border-white/10 bg-black/40 backdrop-blur-sm text-white/80 text-sm leading-relaxed resize-none overflow-y-auto"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
              />
            </div>
          )}

          {/* Price Section */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-accent">
                {currencyFormatter.format(product.price)}
              </span>
            </div>
            
            {product.stock !== null && (
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Package className="size-4" />
                <span>สต็อกคงเหลือ: <span className="text-white font-semibold">{product.stock}</span> ชิ้น</span>
              </div>
            )}
          </div>

          {/* Buy Button */}
          <div className="pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full bg-accent hover:opacity-90 shadow-lg shadow-accent/20" 
                  size="default"
                  disabled={!canBuy || buying}
                >
                  {buying ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      กำลังซื้อ...
                    </>
                  ) : canBuy ? (
                    <>
                      <ShoppingCart className="mr-2 size-4" />
                      ซื้อเลย
                    </>
                  ) : (
                    'ขายหมด'
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl">ยืนยันการซื้อสินค้าแอพพรีเมี่ยม</AlertDialogTitle>
                  <AlertDialogDescription className="pt-4">
                    <div className="space-y-3 text-white/80">
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-white/60">สินค้า:</span>
                        <span className="font-medium">{product.display_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 pt-4 border-t border-white/20">
                        <span className="text-lg font-semibold">ราคารวม:</span>
                        <span className="text-2xl font-bold text-accent">{currencyFormatter.format(product.price)}</span>
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm text-blue-300">
                          หลังจากซื้อ คุณจะได้รับข้อมูลสินค้าที่หน้าประวัติ
                        </p>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel disabled={buying} className="mt-2">ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleBuy} 
                    disabled={buying || !canBuy}
                    className="bg-accent hover:opacity-90"
                  >
                    {buying ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        กำลังซื้อ...
                      </>
                    ) : (
                      'ยืนยัน'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </main>
  );
}

