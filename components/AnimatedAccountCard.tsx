'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, Info } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { applyPermissionDiscount, type Permission } from '@/lib/pricing';
import { useWalletBalance } from '@/hooks/useWalletBalance';

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
  initialPermissionId?: number | null;
  initialPermission?: { id: number; name: string } | null;
  onQuickBuy: (account: GameAccount) => void;
};

export default function AnimatedAccountCard({ account, index, initialPermissionId = null, initialPermission = null, onQuickBuy }: Props) {
  const { ref, isVisible } = useScrollAnimation();
  const router = useRouter();
  const [permission, setPermission] = useState<Permission>(null);
  const [permissionName, setPermissionName] = useState<string | null>(initialPermission?.name || null);
  const { permission: walletPermission, permissionId: walletPermissionId } = useWalletBalance();
  
  // Use initialPermissionId from server or fetch from client
  const [userPermissionId, setUserPermissionId] = useState<number | null>(initialPermissionId);
  
  useEffect(() => {
    if (walletPermission) {
      setPermission(walletPermission);
      setPermissionName(walletPermission.name || initialPermission?.name || null);
    } else if (initialPermission) {
      setPermissionName(initialPermission.name);
    } else {
      setPermission(null);
      setPermissionName(null);
    }
  }, [initialPermission, walletPermission]);

  useEffect(() => {
    if (initialPermissionId) {
      setUserPermissionId(initialPermissionId);
      return;
    }
    if (walletPermissionId) {
      setUserPermissionId(walletPermissionId);
    } else if (!walletPermission && !initialPermission) {
      setUserPermissionId(null);
    }
  }, [initialPermission, initialPermissionId, walletPermissionId, walletPermission]);
  
  // คำนวณราคาหลังส่วนลดจากสิทธิ์
  // ถ้ามี initialPermissionId แสดงว่า server ได้ส่งราคาที่ถูกต้องมาแล้ว (account.price ถูกอัปเดตแล้ว)
  // ถ้าไม่มี initialPermissionId ให้ fetch custom price ใน client-side
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  
  useEffect(() => {
    // ถ้ามี initialPermissionId แสดงว่า server ได้ส่งราคาที่ถูกต้องมาแล้ว ไม่ต้อง fetch อีก
    if (initialPermissionId) {
      setCustomPrice(null); // ใช้ account.price จาก server เลย
      return;
    }
    
    // ถ้าไม่มี initialPermissionId ให้ fetch custom price ใน client-side
    if (userPermissionId && account.id) {
      fetch(`/api/game-accounts/${account.id}?permission_id=${userPermissionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok && data.data && data.data.price !== undefined) {
            const fetchedPrice = Number(data.data.price);
            const basePrice = Number(account.price);
            // ถ้าราคาที่ fetch มาไม่เท่ากับราคาปกติ แสดงว่ามี custom price
            if (fetchedPrice !== basePrice) {
              setCustomPrice(fetchedPrice);
            } else {
              setCustomPrice(null);
            }
          } else {
            setCustomPrice(null);
          }
        })
        .catch(() => {
          setCustomPrice(null);
        });
    } else {
      setCustomPrice(null);
    }
  }, [account.id, userPermissionId, initialPermissionId, account.price]);

  // ถ้ามี initialPermissionId แสดงว่า server ได้ส่งราคาที่ถูกต้องมาแล้ว (account.price ถูกอัปเดตแล้ว)
  // ถ้าไม่มี initialPermissionId แต่มี customPrice ให้ใช้ customPrice
  // ถ้าไม่มีทั้งคู่ ให้คำนวณส่วนลดตามปกติ
  const serverPrice = Number(account.price); // ราคาจาก server (อาจถูกอัปเดตแล้วถ้ามี permission_id)
  const productPermissionId = (account as any).permission_id || null;
  
  let finalPrice: number;
  let hasPermissionDiscount = false;
  let isCustomPriceFromServer = false;
  
  // ถ้ามี initialPermissionId แสดงว่า server ได้ส่งราคาที่ถูกต้องมาแล้ว
  // ใช้ราคาจาก server เลย (account.price ถูกอัปเดตแล้ว)
  const originalPriceForPermission = (account as any).original_price_for_permission;
  if (initialPermissionId && customPrice === null) {
    // ถ้ามี original_price_for_permission แสดงว่าเป็น custom price จาก server
    if (originalPriceForPermission !== null && originalPriceForPermission !== undefined) {
      finalPrice = serverPrice; // ราคา custom จาก server
      hasPermissionDiscount = true;
      isCustomPriceFromServer = true;
    } else {
      // ไม่มี custom price แต่มี permission ให้คำนวณส่วนลด
      finalPrice = applyPermissionDiscount(serverPrice, permission, productPermissionId, userPermissionId);
      hasPermissionDiscount = !!(permission && (productPermissionId === null || productPermissionId === userPermissionId) && finalPrice < serverPrice);
    }
  } else if (customPrice !== null) {
    // มีราคาที่ fetch จาก client-side
    finalPrice = customPrice;
    hasPermissionDiscount = customPrice !== serverPrice;
  } else {
    // ไม่มีราคาเฉพาะ ให้คำนวณส่วนลดตามปกติ
    finalPrice = applyPermissionDiscount(serverPrice, permission, productPermissionId, userPermissionId);
    hasPermissionDiscount = !!(permission && (productPermissionId === null || productPermissionId === userPermissionId) && finalPrice < serverPrice);
  }
  
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
      className={`group relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${
        isOutOfStock 
          ? 'border-slate-800 bg-slate-900/70 opacity-60 cursor-not-allowed'
          : 'border-emerald-500/20 bg-slate-900/80 shadow-[0_20px_60px_rgba(16,185,129,0.15)] hover:border-emerald-400/60'
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
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/5 to-teal-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
      
      {/* Badge ส่วนลด */}
      {!isOutOfStock && discountPercent !== null && discountPercent > 0 && (
        <div className="absolute top-2 right-2 z-20">
          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-900 border-0 shadow-lg text-xs font-bold px-3 py-1.5">
            ✦ ลด {discountPercent}%
          </Badge>
        </div>
      )}

      {/* Badge สถานะ */}
      <div className="absolute top-2 left-2 z-20">
        {account.stock > 0 ? (
          <Badge className="bg-emerald-500/15 text-emerald-200 border-emerald-400/30 text-xs backdrop-blur">
            พร้อมจำหน่าย
          </Badge>
        ) : (
          <Badge variant="destructive" className="bg-rose-500/10 text-rose-200 border-rose-400/30 text-xs backdrop-blur">
            ไม่พร้อมจำหน่าย
          </Badge>
        )}
      </div>

      {/* รูปภาพ */}
      <div className="relative block overflow-hidden">
        {isOutOfStock && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 rounded-t-xl">
            <Badge variant="destructive" className="text-base font-semibold px-4 py-2 bg-red-600">
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
          <div className={`w-full aspect-square bg-gradient-to-br from-slate-800 to-slate-900 ${
            isOutOfStock ? 'grayscale opacity-30' : ''
          }`} />
        )}
      </div>

      {/* เนื้อหา */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* ชื่อสินค้า */}
        <h3 className={`text-sm font-semibold line-clamp-2 mb-3 ${
          isOutOfStock 
            ? 'text-slate-500' 
            : 'text-white group-hover:text-emerald-200 transition-colors'
        }`}>
          {account.title}
        </h3>

        {/* ราคา */}
        <div className={`mb-4 ${isOutOfStock ? 'opacity-50' : ''}`}>
          {hasPermissionDiscount ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">
                  {finalPrice.toFixed(0)} พอยต์
                </span>
                {(() => {
                  // แสดงราคาเดิมที่ขีดฆ่า
                  let priceToShow: number | null = null;
                  if (isCustomPriceFromServer && originalPriceForPermission) {
                    // ถ้าเป็น custom price จาก server ให้แสดง original_price_for_permission
                    priceToShow = Number(originalPriceForPermission);
                  } else if (customPrice !== null) {
                    // ถ้าเป็น custom price จาก client ให้แสดง serverPrice
                    priceToShow = serverPrice;
                  } else if (originalPrice !== null) {
                    // ถ้ามี originalPrice จาก discount ให้แสดง
                    priceToShow = originalPrice;
                  }
                  
                  return priceToShow && priceToShow !== finalPrice ? (
                    <span className="text-sm text-slate-400 line-through">
                      {Number(priceToShow).toFixed(0)} พอยต์
                    </span>
                  ) : null;
                })()}
              </div>
              {(permission || initialPermission) && (
                <span className="text-xs text-emerald-300 font-medium">
                  {isCustomPriceFromServer || customPrice !== null 
                    ? `ราคาสิทธิ์ ${permissionName || initialPermission?.name || 'สิทธิ์ส่วนลด'}` 
                    : `ส่วนลดสิทธิ์: ${permissionName || initialPermission?.name || 'สิทธิ์ส่วนลด'}`}
                </span>
              )}
            </div>
          ) : discountPercent !== null && discountPercent > 0 && originalPrice !== null ? (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">
                {Number(account.price).toFixed(0)} พอยต์
              </span>
              <span className="text-sm text-slate-400 line-through">
                {originalPrice.toFixed(0)} พอยต์
              </span>
            </div>
          ) : (
            <span className="text-xl font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">
              {Number(account.price).toFixed(0)} พอยต์
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent mb-4"></div>

        {/* ปุ่มซื้อ */}
        {isOutOfStock ? (
          <Button
            className="w-full bg-slate-800 text-slate-500 font-medium gap-2 cursor-not-allowed mb-2 border border-slate-700"
            disabled
          >
            <ShoppingCart className="h-4 w-4" />
            ซื้อสินค้านี้
          </Button>
        ) : (
          <>
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold gap-2 mb-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onQuickBuy(account);
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              ซื้อสินค้านี้
            </Button>
            <Link href={`/accounts/${account.id}`} className="block">
              <Button
                variant="outline"
                className="w-full border-emerald-400/70 hover:bg-emerald-500/10 hover:border-emerald-400 !text-emerald-200"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="h-4 w-4 mr-2" />
                รายละเอียด
              </Button>
            </Link>
          </>
        )}

        {/* ข้อมูลสต็อก */}
        <div className={`flex items-center gap-1.5 text-xs mt-4 ${
          isOutOfStock ? 'text-slate-500' : 'text-slate-300'
        }`}>
          <Package className="h-3.5 w-3.5" />
          <span>เหลือทั้งหมด {account.stock} ชิ้น</span>
        </div>
      </div>
    </div>
  );
}
