'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter as DialogFooterUI } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Zap, Star, Coins, Gem, Sparkles, CreditCard, Home, ShoppingCart } from 'lucide-react';
import dynamic from 'next/dynamic';
const FlashSaleCountdown = dynamic(() => import('@/components/FlashSaleCountdown'), { ssr: false });

type Detail = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  banner_url?: string | null;
  icon_url?: string | null;
  items: { id: number; name: string; sku: string; price: string; originalPrice: string; original_price_for_permission?: string | null; is_recommended?: boolean; icon_url?: string | null }[];
  inputs: { key: string; title: string; regex: string; type: string; placeholder: string; options: { label: string; value: string }[] }[];
  badge?: { text?: string | null; percent?: number | null } | null;
};

function useAnimatedNumber(value: number, durationMs = 400) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    startRef.current = null;
    const from = fromRef.current;
    const to = value;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return display;
}

export default function CashcardDetailPage() {
  const params = useParams<{ key: string }>();
  const isMobile = useIsMobile();
  const toast = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [flashStart, setFlashStart] = useState<string | null>(null);
  const [flashEnd, setFlashEnd] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState<{ discount_amount: number; final_amount: number; code: string } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);

  const selectedPrice = useMemo(() => {
    return Number((data?.items || []).find((i) => i.sku === sku)?.price || 0);
  }, [data, sku]);

  const finalPrice = useMemo(() => {
    if (couponData) return couponData.final_amount;
    return selectedPrice;
  }, [selectedPrice, couponData]);

  const animatedPrice = useAnimatedNumber(selectedPrice, 250);
  const animatedFinalPrice = useAnimatedNumber(finalPrice, 250);
  const prevKeyRef = useRef<string | undefined>(undefined);

  const [iconErrors, setIconErrors] = useState<Set<string>>(new Set());

  const iconUrl = useMemo(() => {
    return data?.icon_url?.trim() || null;
  }, [data?.icon_url]);

  const getFallbackIcon = useCallback((itemName: string, size: 'sm' | 'lg' = 'sm') => {
    const name = itemName.toLowerCase();
    const iconSize = size === 'lg' ? 'w-16 h-16' : 'size-5';
    
    if (name.includes('point')) {
      return <Coins className={`${iconSize} text-yellow-400`} />;
    }
    if (name.includes('coin') || name.includes('gem') || name.includes('เพชร')) {
      return <Gem className={`${iconSize} text-blue-400`} />;
    }
    if (name.includes('diamond') || name.includes('crystal')) {
      return <Sparkles className={`${iconSize} text-cyan-400`} />;
    }
    return <Coins className={`${iconSize} text-yellow-400`} />;
  }, []);

  const getCurrencyIcon = useCallback((itemName: string, itemIconUrl?: string | null, size: 'sm' | 'lg' = 'sm') => {
    const targetIconUrl = itemIconUrl || iconUrl;
    const sizeClass = size === 'lg' ? 'w-16 h-16' : 'size-5';
    
    if (targetIconUrl && targetIconUrl.length > 0 && !iconErrors.has(targetIconUrl)) {
      return (
        <img 
          src={targetIconUrl} 
          alt={itemName} 
          className={`${sizeClass} object-contain`}
          onError={() => {
            if (targetIconUrl) {
              setIconErrors(prev => new Set(prev).add(targetIconUrl));
            }
          }}
        />
      );
    }
    return getFallbackIcon(itemName, size);
  }, [iconUrl, iconErrors, getFallbackIcon]);

  useEffect(() => {
    const currentKey = params?.key;
    const prevKey = prevKeyRef.current;
    const isKeyChanged = currentKey !== prevKey && prevKey !== undefined;
    
    if (isKeyChanged) {
      setLoading(true);
      setData(null);
    }
    
    prevKeyRef.current = currentKey;
    
    const controller = new AbortController();
    (async () => {
      try {
        setError(null);
        setCouponCode('');
        setCouponData(null);
        setIconErrors(new Set());
        
        const [detailRes, siteRes] = await Promise.all([
          fetch(`/api/cashcard/wepay/${currentKey ?? ''}`, { 
            cache: 'default',
            headers: { 'Cache-Control': 'max-age=30' },
            signal: controller.signal 
          }),
          fetch(`/api/site`, { 
            cache: 'default',
            headers: { 'Cache-Control': 'max-age=120' },
            signal: controller.signal 
          })
        ]);
        if (!detailRes.ok) throw new Error('ไม่พบบริการนี้');
        const detailJson = await detailRes.json();

        const sortItems = (items: Detail['items']) => {
          if (!Array.isArray(items)) return [];
          return [...items].sort((a, b) => {
            if (a.is_recommended && !b.is_recommended) return -1;
            if (!a.is_recommended && b.is_recommended) return 1;
            return Number(a.price) - Number(b.price);
          });
        };

        const merged = { ...detailJson.data } as Detail;
        merged.items = sortItems(merged.items);
        setData(merged);
        setSku(merged.items?.[0]?.sku || '');
        if (siteRes.ok) {
          const sj = await siteRes.json();
          setFlashStart(sj.flashStart || null);
          setFlashEnd(sj.flashEnd || null);
        }
      } catch (e: unknown) {
        if ((e as any)?.name !== 'AbortError') setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [params?.key]);

  const validateCoupon = useCallback(async () => {
    const trimmedCode = couponCode.trim();
    if (!trimmedCode || !selectedPrice || selectedPrice <= 0) {
      toast.show({
        title: 'ใช้โค้ดไม่สำเร็จ',
        description: 'กรุณากรอกโค้ดคูปองและเลือกสินค้าก่อน',
        variant: 'destructive',
      });
      return;
    }

    if (validatingCoupon) return;

    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmedCode, total_amount: selectedPrice }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || 'ไม่สามารถใช้คูปองนี้ได้');
      }
      
      if (!json.coupon || typeof json.coupon.discount_amount !== 'number' || typeof json.coupon.final_amount !== 'number') {
        throw new Error('ข้อมูลคูปองไม่ถูกต้อง');
      }

      setCouponData(json.coupon);
      toast.show({
        title: 'ใช้โค้ดสำเร็จ',
        description: `ใช้โค้ด ${json.coupon.code} ลด ${json.coupon.discount_amount.toFixed(2)} ฿`,
        variant: 'default',
      });
    } catch (err) {
      setCouponData(null);
      toast.show({
        title: 'ใช้โค้ดไม่สำเร็จ',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setValidatingCoupon(false);
    }
  }, [couponCode, selectedPrice, validatingCoupon, toast]);

  const onSubmit = async () => {
    if (!data) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch('/api/cashcard/wepay/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_key: data.key, 
          item_sku: sku, 
          coupon_code: couponData?.code || undefined
        })
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === 'provider_error' || res.status === 502) {
          throw new Error('เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง');
        }
        throw new Error(json?.detail || json?.error || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง');
      }
      setSubmitMsg('สร้างคำสั่งซื้อสำเร็จ เลขที่ทำรายการ: ' + json.order?.transactionId);
      setResultOpen(true);
      toast.show({ title: 'สร้างคำสั่งซื้อสำเร็จ', description: `เลขที่ทำรายการ: ${json.order?.transactionId}`, variant: 'default' });
      
      window.dispatchEvent(new Event('wallet:changed'));
    } catch (e: unknown) {
      setSubmitMsg((e as Error).message);
      setResultOpen(true);
      toast.show({ title: 'ไม่สามารถสั่งซื้อได้', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <main className="mx-auto max-w-6xl px-4 py-6 text-purple-500">{error}</main>;
  
  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black">
        <div className="relative h-48 bg-gradient-to-br from-purple-950 via-purple-900 to-purple-950">
          <Skeleton className="h-full w-full" />
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(168, 85, 247) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>
      
      {/* Decorative Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-purple-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden py-12 md:py-16 shadow-lg">
        {/* Background Image */}
        <div className="absolute inset-0">
          {data.banner_url ? (
            <Image 
              src={data.banner_url}
              alt="Product Banner Background"
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-purple-900 to-purple-950" />
          )}
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
        
        {/* Breadcrumb */}
        <div className="relative mx-auto max-w-6xl px-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
              <Home className="h-4 w-4" />
              หน้าแรก
            </Link>
            <span>/</span>
            <Link href="/cashcard" className="hover:text-white transition-colors flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              บัตรเติมเงิน
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{data.name}</span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row items-center gap-6 text-white">
            {/* Product Image */}
            {data.image_url && (
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/20">
                <Image 
                  src={data.image_url} 
                  alt={data.name} 
                  fill
                  className="object-cover" 
                  sizes="(max-width: 768px) 128px, 160px"
                  priority
                />
              </div>
            )}
            
            {/* Product Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <CreditCard className="h-6 w-6" />
                <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
              </div>
              <p className="text-white/90 text-sm md:text-base">Cash Card {data.name}</p>
              
              {data.badge?.text && (
                <Badge variant="secondary" className="mt-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-lg">
                  <Zap className="size-3 mr-1" />
                  {data.badge.text}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Select Package */}
          <div className="md:col-span-2 space-y-4">
            {/* Step 1: Select Package */}
            <section className="bg-[#0a0a0a] rounded-xl shadow-sm border border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-sm">
                  1
                </div>
                <h2 className="text-lg font-bold text-white">เลือกแพ็คเกจ</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.items.map((it) => (
                  <button 
                    key={it.id} 
                    onClick={() => setSku(it.sku)} 
                    className={`relative rounded-2xl border-2 transition-all duration-200 overflow-hidden group ${
                      sku === it.sku 
                        ? 'border-purple-600 shadow-lg ring-4 ring-purple-900/50 scale-[1.02]' 
                        : 'border-gray-700 bg-[#0a0a0a] hover:border-purple-500 hover:shadow-md'
                    }`}
                  >
                    {/* Selected Indicator */}
                    {sku === it.sku && (
                      <div className="absolute inset-0 bg-purple-600/10 pointer-events-none" />
                    )}
                    
                    {it.is_recommended && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-2 py-0.5 shadow-md">
                          <Star className="size-3 mr-0.5" fill="currentColor" />
                          แนะนำ
                        </Badge>
                      </div>
                    )}
                    
                    {/* Icon Section */}
                    <div className={`flex items-center justify-center py-8 px-4 transition-colors ${
                      sku === it.sku 
                        ? 'bg-gradient-to-br from-purple-900/30 to-purple-800/30' 
                        : 'bg-gradient-to-br from-gray-800 to-gray-900'
                    }`}>
                      {getCurrencyIcon(it.name, it.icon_url, 'lg')}
                    </div>
                    
                    {/* Content Section */}
                    <div className="p-4 text-center bg-[#0a0a0a] relative">
                      <div className="text-sm font-semibold text-white mb-2">
                        {it.name}
                      </div>
                      
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xl font-bold text-purple-500 tabular-nums">{Number(it.price).toFixed(2)}฿</span>
                        {(() => {
                          if (it.original_price_for_permission) {
                            return (
                              <span className="text-xs text-gray-400 line-through tabular-nums">
                                {Number(it.original_price_for_permission).toFixed(2)}฿
                              </span>
                            );
                          }
                          if (Number(it.originalPrice) > Number(it.price)) {
                            return (
                              <span className="text-xs text-gray-400 line-through tabular-nums">
                                {Number(it.originalPrice).toFixed(2)}฿
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-4">
            {/* Step 2: Summary */}
            <section className="bg-[#0a0a0a] rounded-xl shadow-sm border border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-sm">
                  2
                </div>
                <h2 className="text-lg font-bold text-white">สรุปคำสั่งซื้อ</h2>
              </div>
              
              <div className="space-y-3 mb-4 pb-4 border-b border-gray-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">แพ็กเกจที่เลือก</span>
                  <span className="font-medium text-white">{data.items.find((i) => i.sku === sku)?.name || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">ราคา</span>
                  <span className="font-medium text-white tabular-nums">{animatedPrice.toFixed(2)}฿</span>
                </div>
                {couponData && (
                  <div className="flex justify-between text-sm text-purple-400">
                    <span>ส่วนลด ({couponData.code})</span>
                    <span className="font-medium tabular-nums">-{couponData.discount_amount.toFixed(2)}฿</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-300 font-medium">ยอดรวม</span>
                <span className="text-2xl font-bold text-purple-500 tabular-nums">{animatedFinalPrice.toFixed(2)}฿</span>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200" 
                disabled={!sku || submitting}
                onClick={onSubmit}
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
            </section>
          </div>
        </div>
      </main>
    
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-sm bg-[#080808] border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">สถานะคำสั่งซื้อ</DialogTitle>
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

