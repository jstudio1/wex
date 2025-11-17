'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, Info } from 'lucide-react';
import Link from 'next/link';

type GameAccount = {
  id: number;
  game_name: string;
  game_category_id: number | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  additional_images: string[];
  price: number;
  stock: number;
  discount_percent?: number | null;
  original_price?: number | null;
  created_at?: string;
  category?: { id: number; name: string; slug: string } | null;
};

type Props = {
  account: GameAccount;
  index: number;
  onQuickBuy: (account: GameAccount) => void;
};

export default function AnimatedAccountCard({ account, index, onQuickBuy }: Props) {
  const { ref, isVisible } = useScrollAnimation();
  const router = useRouter();
  
  let discountPercent: number | null = null;
  let originalPrice: number | null = null;

  if (account.discount_percent != null && account.discount_percent > 0) {
    discountPercent = account.discount_percent;
    if (account.original_price != null && account.original_price > 0) {
      originalPrice = account.original_price;
    } else {
      originalPrice = Number(account.price) / (1 - account.discount_percent / 100);
    }
  } else if (account.original_price != null && account.original_price > Number(account.price)) {
    originalPrice = account.original_price;
    discountPercent = Math.round(((originalPrice - Number(account.price)) / originalPrice) * 100);
  }
  
  const isOutOfStock = account.stock === 0;
  
  return (
    <div
      ref={ref}
      className={`group relative flex flex-col bg-black/50 backdrop-blur-sm border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 ${
        isOutOfStock 
          ? 'border-purple-500/10 opacity-60 cursor-not-allowed' 
          : 'border-purple-500/20 hover:border-purple-500/50'
      } ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        transitionDelay: isVisible ? `${index * 50}ms` : '0ms',
        cursor: isOutOfStock ? 'not-allowed' : 'pointer'
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, a')) {
          return;
        }
        if (!isOutOfStock) {
          router.push(`/accounts/${account.id}`);
        }
      }}
    >
      {/* Gradient Overlay on Hover */}
      {!isOutOfStock && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-purple-600/0 to-purple-600/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      )}
      {/* Badge ส่วนลด */}
      {!isOutOfStock && discountPercent !== null && discountPercent > 0 && (
        <div className="absolute top-2 right-2 z-20">
          <Badge className="bg-gradient-to-r from-red-600 to-orange-500 text-[color:var(--text)] border-2 border-orange-300/50 shadow-lg shadow-red-500/50 text-xs font-bold px-3 py-1.5 animate-pulse">
            🔥 ลด {discountPercent}%
          </Badge>
        </div>
      )}

      {/* Badge สถานะ */}
      <div className="absolute top-2 left-2 z-20">
        {account.stock > 0 ? (
          <Badge className="bg-green-600/90 text-[color:var(--text)] border-green-500/30 text-xs">
            พร้อมจำหน่าย
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-xs">
            ไม่พร้อมจำหน่าย
          </Badge>
        )}
      </div>

      {/* รูปภาพ */}
      <div className="relative block overflow-hidden">
        {isOutOfStock && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 rounded-t-xl">
            <Badge variant="destructive" className="text-base font-semibold px-4 py-2">
              สินค้าหมด
            </Badge>
          </div>
        )}
        {account.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.cover_image_url}
            alt={account.title}
            className={`w-full aspect-square object-cover transition-transform duration-300 ${
              isOutOfStock 
                ? 'grayscale opacity-30' 
                : 'group-hover:scale-105'
            }`}
          />
        ) : (
          <div className={`w-full aspect-square bg-gradient-to-br from-white/10 to-white/5 ${
            isOutOfStock ? 'grayscale opacity-30' : ''
          }`} />
        )}
      </div>

      {/* เนื้อหา */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* ชื่อสินค้า */}
        <h3 className={`text-sm font-semibold line-clamp-2 mb-3 ${
          isOutOfStock 
            ? 'text-white/60' 
            : 'text-white group-hover:text-purple-300 transition-colors'
        }`}>
          {account.title}
        </h3>

        {/* ราคา */}
        <div className={`mb-4 ${isOutOfStock ? 'opacity-50' : ''}`}>
          {discountPercent !== null && discountPercent > 0 && originalPrice !== null ? (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                {Number(account.price).toFixed(0)} พอยต์
              </span>
              <span className="text-sm text-white/50 line-through">
                {originalPrice.toFixed(0)} พอยต์
              </span>
            </div>
          ) : (
            <span className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
              {Number(account.price).toFixed(0)} พอยต์
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mb-4"></div>

        {/* ปุ่มซื้อ */}
        {isOutOfStock ? (
          <Button
            className="w-full bg-gray-600 text-gray-300 font-medium gap-2 cursor-not-allowed mb-2"
            disabled
          >
            <ShoppingCart className="size-4" />
            ซื้อสินค้านี้
          </Button>
        ) : (
          <>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium gap-2 mb-2"
              onClick={(e) => {
                e.stopPropagation();
                onQuickBuy(account);
              }}
            >
              <ShoppingCart className="size-4" />
              ซื้อสินค้านี้
            </Button>
            <Link href={`/accounts/${account.id}`} className="block">
              <Button
                variant="outline"
                className="w-full border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="size-4 mr-2" />
                รายละเอียด
              </Button>
            </Link>
          </>
        )}

        {/* ข้อมูลสต็อก */}
        <div className={`flex items-center gap-1.5 text-xs mt-4 ${
          isOutOfStock ? 'text-white/40' : 'text-white/60'
        }`}>
          <Package className="size-3.5" />
          <span>เหลือทั้งหมด {account.stock} ชิ้น</span>
        </div>
      </div>
    </div>
  );
}

