'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, ChevronRight, ArrowLeft, ShoppingCart, Package, Info } from 'lucide-react';
import Image from 'next/image';

type GameAccount = {
  id: number;
  game_name: string;
  game_category_id: number | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  additional_images: string[];
  price: number;
  original_price?: number | null;
  discount_percent?: number | null;
  stock: number;
  created_at: string;
  game_categories: { id: number; name: string; slug: string } | null;
};

interface GameAccountDetailClientProps {
  account: GameAccount;
}

export default function GameAccountDetailClient({ account }: GameAccountDetailClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [buying, setBuying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const handleBuy = async () => {
    if (quantity < 1 || quantity > account.stock) {
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: `กรุณากรอกจำนวนระหว่าง 1-${account.stock}`,
        variant: 'destructive'
      });
      return;
    }
    
    setBuying(true);
    try {
      const res = await fetch('/api/game-accounts/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          game_name: account.game_name,
          title: account.title.split(' #')[0],
          quantity: quantity
        })
      });
      
      const json = await res.json();
      if (json.ok) {
        toast.show({ title: 'สำเร็จ', description: `ซื้อไอดีเกม ${quantity} ชิ้นเรียบร้อยแล้ว ตรวจสอบที่หน้าประวัติ` });
        window.dispatchEvent(new Event('wallet:changed'));
        router.push('/orders?tab=game-accounts');
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

  const allImages = account.cover_image_url 
    ? [account.cover_image_url, ...(account.additional_images || [])]
    : (account.additional_images || []);

  const canBuy = account.stock > 0;

  // Calculate discount
  let discountPercent: number | null = null;
  let originalPrice: number | null = null;

  if (account.discount_percent !== null && account.discount_percent !== undefined && account.discount_percent > 0) {
    discountPercent = account.discount_percent;
    if (account.original_price !== null && account.original_price !== undefined && account.original_price > 0) {
      originalPrice = account.original_price;
    } else {
      originalPrice = Number(account.price) / (1 - account.discount_percent / 100);
    }
  } else if (account.original_price !== null && account.original_price !== undefined && account.original_price > Number(account.price)) {
    originalPrice = account.original_price;
    discountPercent = Math.round(((originalPrice - Number(account.price)) / originalPrice) * 100);
  }

  const totalPrice = Number(account.price) * quantity;

  return (
    <main className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(220, 38, 38) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>
      
      {/* Decorative Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-red-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 relative">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="mb-6 gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm group">
              {allImages.length > 0 ? (
                <>
                  <Image
                    src={allImages[currentImageIndex]}
                    alt={account.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority={currentImageIndex === 0}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  {!canBuy && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                      <Badge variant="destructive" className="text-lg font-semibold px-6 py-3 bg-red-600">
                        สินค้าหมด
                      </Badge>
                    </div>
                  )}
                  {/* Discount Badge */}
                  {canBuy && discountPercent !== null && discountPercent > 0 && (
                    <div className="absolute top-4 right-4 z-20">
                      <Badge className="bg-gradient-to-r from-red-600 to-orange-500 text-white border-0 shadow-lg text-sm font-bold px-4 py-2">
                        🔥 ลด {discountPercent}%
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <Package className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex 
                        ? 'border-red-600 ring-2 ring-red-100' 
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${account.title} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                      loading={index < 3 ? 'eager' : 'lazy'}
                    />
                    {index === currentImageIndex && (
                      <div className="absolute inset-0 bg-red-600/10" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Navigation Arrows for Main Image */}
            {allImages.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-white lg:hidden"
                  onClick={() => setCurrentImageIndex(i => (i - 1 + allImages.length) % allImages.length)}
                >
                  <ChevronLeft className="h-5 w-5 text-gray-700" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-white lg:hidden"
                  onClick={() => setCurrentImageIndex(i => (i + 1) % allImages.length)}
                >
                  <ChevronRight className="h-5 w-5 text-gray-700" />
                </Button>
              </>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {/* Header Section */}
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                    {account.title}
                  </h1>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  {account.game_categories && (
                    <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                      {account.game_categories.name}
                    </Badge>
                  )}
                  {canBuy ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      พร้อมจำหน่าย
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                      ขายหมด
                    </Badge>
                  )}
                </div>
              </div>

              {/* Price Section */}
              <div className="space-y-2 p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
                {discountPercent !== null && discountPercent > 0 && originalPrice !== null ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold text-red-600">
                        {Number(account.price).toFixed(2)}
                      </span>
                      <span className="text-lg text-gray-600">พอยต์</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg text-gray-400 line-through">
                        {originalPrice.toFixed(2)} พอยต์
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-red-600">
                      {Number(account.price).toFixed(2)}
                    </span>
                    <span className="text-lg text-gray-600">พอยต์</span>
                  </div>
                )}
                
                {account.stock > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-200">
                    <Package className="h-4 w-4" />
                    <span>สต็อกคงเหลือ: <span className="text-gray-900 font-semibold">{account.stock}</span> ชิ้น</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            {canBuy && (
              <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm space-y-4">
                <Label htmlFor="quantity" className="text-base font-semibold text-gray-900">จำนวน</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="rounded-none h-12 w-12 hover:bg-gray-100 text-gray-700"
                    >
                      <span className="text-xl">−</span>
                    </Button>
                    <Input
                      id="quantity"
                      type="text"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || '';
                        if (val === '' || (val >= 1 && val <= account.stock)) {
                          setQuantity(val === '' ? 1 : val);
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (!val || val < 1) {
                          setQuantity(1);
                        } else if (val > account.stock) {
                          setQuantity(account.stock);
                        }
                      }}
                      className="w-20 text-center text-lg font-semibold border-0 focus-visible:ring-0 rounded-none h-12"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.min(account.stock, quantity + 1))}
                      disabled={quantity >= account.stock}
                      className="rounded-none h-12 w-12 hover:bg-gray-100 text-gray-700"
                    >
                      <span className="text-xl">+</span>
                    </Button>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="text-sm text-gray-600 mb-1">ราคารวม</div>
                    <div className="text-2xl font-bold text-red-600">
                      {totalPrice.toFixed(2)} <span className="text-base text-gray-600 font-normal">พอยต์</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {account.description && (
              <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">รายละเอียดสินค้า</h3>
                </div>
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {account.description}
                </p>
              </div>
            )}

            {/* Buy Button */}
            <div className="pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full h-14 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg" 
                    size="lg"
                    disabled={!canBuy || buying}
                  >
                    {buying ? (
                      <>
                        <Spinner className="mr-2 h-5 w-5" />
                        กำลังซื้อ...
                      </>
                    ) : canBuy ? (
                      <>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        ซื้อเลย
                      </>
                    ) : (
                      'ขายหมด'
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md bg-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl text-gray-900">ยืนยันการซื้อไอดีเกม</AlertDialogTitle>
                    <AlertDialogDescription className="pt-4">
                      <div className="space-y-3 text-gray-700">
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">เกม:</span>
                          <span className="font-medium text-gray-900">{account.game_name}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">ไอดี:</span>
                          <span className="font-medium text-gray-900">{account.title}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">จำนวน:</span>
                          <span className="font-medium text-gray-900">{quantity} ชิ้น</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">ราคาต่อชิ้น:</span>
                          <span className="text-gray-900">{Number(account.price).toFixed(2)} พอยต์</span>
                        </div>
                        <div className="flex justify-between items-center py-3 pt-4 border-t border-gray-200">
                          <span className="text-lg font-semibold text-gray-900">ราคารวม:</span>
                          <span className="text-2xl font-bold text-red-600">{totalPrice.toFixed(2)} พอยต์</span>
                        </div>
                        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-sm text-blue-700">
                            หลังจากซื้อ คุณจะได้รับ username และ password ที่หน้าประวัติ
                          </p>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel disabled={buying} className="mt-2 border-gray-200 text-gray-700 hover:bg-gray-50">ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleBuy} 
                      disabled={buying || !canBuy}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {buying ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
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
      </div>
    </main>
  );
}
