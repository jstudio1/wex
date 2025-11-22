'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, ShoppingCart, Flame, Clock, Package, TrendingDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuthDialog } from '@/contexts/AuthDialogContext';

interface FlashSaleProduct {
  id: number;
  itemId: number;
  name: string;
  key: string;
  image_url: string | null;
  badge_enabled: boolean;
  badge_percent: number | null;
  badge_text: string | null;
  badge_apply_price: boolean;
  item: {
    id: number;
    name: string;
    price: string;
    originalPrice: string;
    icon_url: string | null;
  } | null;
  savings: string;
  totalSold: number;
  todaySold: number;
  maxQuantity: number | null;
  quantitySold: number;
  quantityRemaining: number | null;
  daysRemaining: number | null;
}

export default function FlashSaleSection() {
  const [products, setProducts] = useState<FlashSaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { openLoginDialog } = useAuthDialog();

  useEffect(() => {
    const fetchFlashSale = async () => {
      try {
        const res = await fetch('/api/products/flashsale', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (!res.ok) throw new Error('Failed to fetch flashsale products');
        const json = await res.json();
        setProducts(json.data || []);
      } catch (error) {
        console.error('Error fetching flashsale:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashSale();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchFlashSale, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBuy = async (productKey: string) => {
    try {
      const res = await fetch(`/api/products/${productKey}`);
      if (res.status === 401) {
        openLoginDialog();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch product');
      window.location.href = `/products/${productKey}`;
    } catch (error) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเข้าถึงสินค้าได้',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl p-5 bg-[#0a0a0a] border border-orange-500/20">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl p-5 bg-[#0a0a0a] border border-orange-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 flex items-center justify-center">
            <Image
              src="https://img2.pic.in.th/pic/pngtree-flash-sale-yellow-red-3d-png-image_5535040-removebg-preview.png"
              alt="Flash Sale"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">แฟลชเซลล์</h2>
            <p className="text-xs text-gray-400">สินค้าพิเศษราคาพิเศษ</p>
          </div>
        </div>
        <Link href="/products">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 text-sm h-8 px-3"
          >
            ดูทั้งหมด
          </Button>
        </Link>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {products.map((product) => {
          if (!product.item) return null;

          const daysRemaining = product.daysRemaining || 0;
          const quantityPercent = product.maxQuantity 
            ? Math.max(0, Math.min(100, (product.quantityRemaining || 0) / product.maxQuantity * 100))
            : null;

          return (
            <div
              key={`${product.id}-${product.itemId}`}
              className="group relative rounded-lg border border-gray-800 bg-[#0f0f0f] p-3 hover:border-orange-500/50 transition-all duration-200"
            >
              {/* Top Badge - Days Remaining */}
              {daysRemaining > 0 && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="flex items-center gap-1 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    <Clock className="h-3 w-3" />
                    <span>{daysRemaining}D</span>
                  </div>
                </div>
              )}

              {/* Savings Badge */}
              {Number(product.savings) > 0 && (
                <div className="absolute top-2 left-2 z-10">
                  <div className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    <TrendingDown className="h-3 w-3" />
                    <span>ประหยัด {Number(product.savings).toFixed(0)}฿</span>
                  </div>
                </div>
              )}

              {/* Product Image */}
              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gray-900 mb-2.5">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 180px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <ShoppingCart className="h-8 w-8" />
                  </div>
                )}
              </div>

              {/* Item Name */}
              <p className="text-white font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                {product.item.name}
              </p>

              {/* Price Section */}
              <div className="mb-2.5 space-y-1">
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold text-orange-400">
                    {Number(product.item.price).toFixed(0)}
                  </p>
                  <span className="text-xl font-bold text-orange-400">฿</span>
                </div>
                {Number(product.item.originalPrice) > Number(product.item.price) && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 line-through">{Number(product.item.originalPrice).toFixed(0)} ฿</p>
                    <span className="text-[10px] text-red-400 font-semibold">
                      -{Math.round((1 - Number(product.item.price) / Number(product.item.originalPrice)) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Quantity Progress Bar */}
              {product.quantityRemaining !== null && product.maxQuantity && (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Package className="h-3 w-3" />
                      <span>เหลือ {product.quantityRemaining} ชิ้น</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{Math.round(quantityPercent || 0)}%</span>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${quantityPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Days Remaining */}
              {product.daysRemaining !== null && (
                <div className="mb-2 flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>เหลือเวลา {product.daysRemaining} วัน</span>
                </div>
              )}

              {/* Buy Button */}
              <Button
                onClick={() => handleBuy(product.key)}
                size="sm"
                disabled={product.quantityRemaining !== null && product.quantityRemaining <= 0}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-2 h-9 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingCart className="mr-1.5 h-4 w-4" />
                {product.quantityRemaining !== null && product.quantityRemaining <= 0 ? 'หมดแล้ว' : 'ซื้อเลย'}
              </Button>

              {/* Stats Footer */}
              <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                {product.totalSold > 0 && (
                  <span>{product.totalSold} คนซื้อ</span>
                )}
                {product.todaySold > 0 && (
                  <span className="text-orange-400">{product.todaySold} คนวันนี้</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

