'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter as DialogFooterUI } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { SpinnerCustom } from '@/components/ui/spinner-custom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Zap, Star, Coins, Gem, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
const FlashSaleCountdown = dynamic(() => import('@/components/FlashSaleCountdown'), { ssr: false });
import { Progress } from '@/components/ui/progress';

type Detail = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  icon_url?: string | null;
  items: { id: number; name: string; sku: string; price: string; originalPrice: string; is_recommended?: boolean }[];
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

export default function ProductDetailPage() {
  const params = useParams<{ key: string }>();
  const isMobile = useIsMobile();
  const toast = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true); // Start with true to show skeleton immediately
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [input, setInput] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [flashStart, setFlashStart] = useState<string | null>(null);
  const [flashEnd, setFlashEnd] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{ base64: string; amount: number; idPay: string; timeout: number } | null>(null);
  const [qrLeft, setQrLeft] = useState<number>(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState<{ discount_amount: number; final_amount: number; code: string } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [tempInput, setTempInput] = useState<Record<string, string>>({});
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
  const isInitialMount = useRef(true);

  const [iconErrors, setIconErrors] = useState<Set<string>>(new Set());

  // Memoize icon URL to avoid repeated trim() calls
  const iconUrl = useMemo(() => {
    return data?.icon_url?.trim() || null;
  }, [data?.icon_url]);

  // Memoize fallback icon component creation
  const getFallbackIcon = useCallback((itemName: string) => {
    const name = itemName.toLowerCase();
    if (name.includes('point')) {
      return <Coins className="size-5 text-yellow-400" />;
    }
    if (name.includes('coin') || name.includes('gem') || name.includes('เพชร')) {
      return <Gem className="size-5 text-blue-400" />;
    }
    if (name.includes('diamond') || name.includes('crystal')) {
      return <Sparkles className="size-5 text-cyan-400" />;
    }
    // Default to coins icon
    return <Coins className="size-5 text-yellow-400" />;
  }, []);

  // Memoize icon error handler
  const handleIconError = useCallback(() => {
    if (iconUrl) {
      setIconErrors(prev => new Set(prev).add(iconUrl));
    }
  }, [iconUrl]);

  // Function to get currency icon - use product icon_url if available, otherwise detect from item name
  const getCurrencyIcon = useCallback((itemName: string) => {
    // ถ้ามี icon_url จาก product และยังไม่มี error ให้ใช้รูปนั้น
    if (iconUrl && iconUrl.length > 0 && !iconErrors.has(iconUrl)) {
      return (
        <img 
          src={iconUrl} 
          alt={data?.name || 'icon'} 
          className="size-5 object-contain"
          onError={handleIconError}
        />
      );
    }
    // ถ้าไม่มี icon_url หรือมี error ให้ใช้ icon จากชื่อ
    return getFallbackIcon(itemName);
  }, [iconUrl, iconErrors, data?.name, getFallbackIcon, handleIconError]);

  useEffect(() => {
    const currentKey = params?.key;
    const prevKey = prevKeyRef.current;
    const isKeyChanged = currentKey !== prevKey && prevKey !== undefined;
    
    // เมื่อ mount ครั้งแรก: loading = true อยู่แล้ว ไม่ต้อง set ซ้ำ และไม่ต้อง clear data
    // เมื่อเปลี่ยน key: ต้อง set loading = true และ clear data
    if (isKeyChanged) {
      setLoading(true);
      setData(null); // Clear data เมื่อเปลี่ยน product เพื่อแสดง skeleton
    }
    // ถ้าเป็น mount ครั้งแรก ไม่ต้อง setLoading(true) เพราะ initial state = true อยู่แล้ว
    
    prevKeyRef.current = currentKey;
    isInitialMount.current = false;
    
    const controller = new AbortController();
    (async () => {
      try {
        setError(null);
        setInput({}); // Reset input state เมื่อเปลี่ยน product
        setCouponCode(''); // Reset coupon code
        setCouponData(null); // Reset coupon data
        setIconErrors(new Set()); // Reset icon error state
        
        const [detailRes, siteRes] = await Promise.all([
          fetch(`/api/products/${currentKey ?? ''}`, { 
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
        const merged = { ...detailJson.data } as any;
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

  // Memoize regex patterns to avoid recreating them on every validation
  const regexCache = useRef<Map<string, RegExp>>(new Map());

  const canSubmit = useMemo(() => {
    if (!data || !sku) return false;
    // ถ้าไม่มี inputs แสดงว่าบริการนี้ไม่ต้องการข้อมูลเพิ่มเติม (หรือยังไม่ได้ sync)
    // ในกรณีนี้ให้ submit ได้เลย
    if (!data.inputs || data.inputs.length === 0) return true;
    // ถ้ามี inputs ต้องกรอกครบทุกช่องและผ่าน validation
    for (const inp of data.inputs) {
      const val = (input[inp.key] || '').trim();
      if (!val) return false;
      if (inp.regex) {
        try {
          // Use cached regex if available
          let regex = regexCache.current.get(inp.regex);
          if (!regex) {
            regex = new RegExp(inp.regex);
            regexCache.current.set(inp.regex, regex);
          }
          if (!regex.test(val)) return false;
        } catch {
          // ignore invalid regex from upstream
        }
      }
    }
    return true;
  }, [data, sku, input]);

  const canSubmitDialog = useMemo(() => {
    if (!data || !sku) return false;
    // ถ้าไม่มี inputs แสดงว่าบริการนี้ไม่ต้องการข้อมูลเพิ่มเติม (หรือยังไม่ได้ sync)
    // ในกรณีนี้ให้ submit ได้เลย
    if (!data.inputs || data.inputs.length === 0) return true;
    // ถ้ามี inputs ต้องกรอกครบทุกช่องและผ่าน validation
    for (const inp of data.inputs) {
      const val = (tempInput[inp.key] || '').trim();
      if (!val) return false;
      if (inp.regex) {
        try {
          // Use cached regex if available
          let regex = regexCache.current.get(inp.regex);
          if (!regex) {
            regex = new RegExp(inp.regex);
            regexCache.current.set(inp.regex, regex);
          }
          if (!regex.test(val)) return false;
        } catch {
          // ignore invalid regex from upstream
        }
      }
    }
    return true;
  }, [data, sku, tempInput]);

  const validateCoupon = useCallback(async () => {
    const trimmedCode = couponCode.trim();
    // Validation: check if coupon code and price are valid
    if (!trimmedCode || !selectedPrice || selectedPrice <= 0) {
      toast.show({
        title: 'ใช้โค้ดไม่สำเร็จ',
        description: 'กรุณากรอกโค้ดคูปองและเลือกสินค้าก่อน',
        variant: 'destructive',
      });
      return;
    }

    // Prevent duplicate validation
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
      
      // Validate response data
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

  const createQRPayment = async () => {
    if (!data) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const amount = couponData ? couponData.final_amount : Number(data.items.find((i) => i.sku === sku)?.price || 0);
      const ref1 = `ORDER_${Date.now()}`;
      const res = await fetch('/api/payments/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, ref1 })
      });
      const json = await res.json();
      if (!res.ok || json.status !== 1) throw new Error(json?.message || 'สร้าง QR ไม่สำเร็จ');
      setQrData({ base64: json.qr_image_base64, amount: Number(json.amount), idPay: json.id_pay, timeout: Number(json.time_out) });
      setQrLeft(Number(json.time_out) || 900);
      setShowInputDialog(false);
      // เริ่มนับถอยหลังและโพลสถานะ
      const start = Date.now();
      const t = setInterval(async () => {
        setQrLeft(Math.max(0, (Number(json.time_out) * 1000 - (Date.now() - start)) / 1000));
        try {
          const st = await fetch(`/api/payments/status?id_pay=${encodeURIComponent(json.id_pay)}`);
          const sj = await st.json();
          if (sj.status === 'PAID') {
            clearInterval(t);
            setSubmitMsg('ชำระเงินสำเร็จ');
            setResultOpen(true);
            toast.show({ title: 'ชำระเงินสำเร็จ', description: 'ระบบกำลังดำเนินรายการให้คุณ', variant: 'default' });
            setQrData(null);
            setQrLeft(0);
          }
        } catch {}
      }, 2000);
      // cleanup interval when unmount
      const cleanup = () => clearInterval(t);
      window.addEventListener('beforeunload', cleanup);
      setTimeout(() => window.removeEventListener('beforeunload', cleanup), Number(json.time_out) * 1000 + 1000);
    } catch (err) {
      setSubmitMsg((err as Error).message);
      setResultOpen(true);
      toast.show({ title: 'ไม่สำเร็จ', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPurchase = () => {
    if (!data) return;
    // ถ้าเป็น free-fire-v1 ให้เปิด Dialog กรอก input
    if (data.key === 'free-fire-v1') {
      setTempInput({ ...input });
      setShowInputDialog(true);
      return;
    }
    // ถ้าไม่ใช่ ให้ทำตามเดิม
    onSubmit();
  };

  const onSubmit = async () => {
    if (!data) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_key: data.key, 
          item_sku: sku, 
          input,
          coupon_code: couponData?.code || undefined
        })
      });
      const json = await res.json();
      if (!res.ok) {
        // ถ้า error จาก provider ให้แสดงข้อความทั่วไป
        if (json?.error === 'provider_error' || res.status === 502) {
          throw new Error('เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง');
        }
        throw new Error(json?.detail || json?.error || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง');
      }
      setSubmitMsg('สร้างคำสั่งซื้อสำเร็จ เลขที่ทำรายการ: ' + json.order?.transactionId);
      setResultOpen(true);
      toast.show({ title: 'สร้างคำสั่งซื้อสำเร็จ', description: `เลขที่ทำรายการ: ${json.order?.transactionId}`, variant: 'default' });
      
      // อัพเดท wallet balance ทันที
      window.dispatchEvent(new Event('wallet:changed'));
    } catch (e: unknown) {
      setSubmitMsg((e as Error).message);
      setResultOpen(true);
      toast.show({ title: 'ไม่สามารถสั่งซื้อได้', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <main className="mx-auto max-w-3xl px-4 py-6 text-red-400">{error}</main>;
  
  // Show skeleton when loading or no data - smooth transition without flickering
  if (loading || !data) {
    return (
      <div className="relative min-h-screen pb-20 md:pb-6">
        <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-16 w-16 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-7 space-y-3">
              <section className="card p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-3 rounded border border-white/10">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              </section>
              <section className="card p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="p-3 rounded border border-white/10">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              </section>
              <section className="card p-4 space-y-3">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </section>
              <section className="card p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </section>
              <section className="card p-4 space-y-3">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </section>
              <Skeleton className="h-10 w-full rounded" />
            </div>
            <div className="col-span-12 md:col-span-5">
              <div className="card p-4 space-y-4">
                <Skeleton className="h-48 w-full rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-20 md:pb-6">
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        {data.image_url ? (
          <div className="relative h-16 w-16 rounded overflow-hidden">
            <Image 
              src={data.image_url} 
              alt={data.name} 
              fill
              className="object-cover" 
              sizes="64px"
              priority
            />
          </div>
        ) : (
          <div className="h-16 w-16 rounded bg-white/10" />
        )}
        <div>
          <h1 className="text-xl font-semibold">{data.name}</h1>
          {data.badge?.text && (
            <Badge variant="destructive" className="mt-2 inline-flex items-center gap-1">
              <Zap className="size-3" />
              <span className="font-semibold">{data.badge.text}</span>
            </Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {/* Left column: price options */}
        <div className="col-span-12 md:col-span-7 space-y-3">
          {/* Recommend Section */}
          {data.items.some(it => it.is_recommended) && (
            <section className="card p-4">
              <h2 className="text-sm mb-2">สินค้า Recommend</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                {data.items.filter(it => it.is_recommended).map((it) => (
                  <button key={it.id} onClick={() => setSku(it.sku)} className={`group relative px-3 py-2 rounded border-2 border-yellow-500 text-left transition-all duration-200 ${sku === it.sku ? 'bg-white/10 scale-[1.02]' : 'bg-white/5 hover:bg-white/10'} `}>
                    <div className="absolute top-1 right-1">
                      <Badge className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 ${isMobile ? 'px-1 py-0.5' : 'text-xs px-1.5 py-0.5'}`}>
                        <Star className={isMobile ? "size-3" : "size-2.5"} fill="currentColor" />
                        {!isMobile && <span className="ml-0.5">Recommend</span>}
                      </Badge>
                    </div>
                    <div className={`text-sm ${isMobile ? 'pr-8' : 'pr-16'} flex items-center gap-1.5`}>
                      {getCurrencyIcon(it.name)}
                      <span>{it.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-base font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent tabular-nums">{Number(it.price)}฿</span>
                      {Number(it.originalPrice) > Number(it.price) && (
                        <span className="text-xs text-white/40 line-through tabular-nums">{Number(it.originalPrice)}฿</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* All Prices Section */}
          <section className="card p-4">
            <h2 className="text-sm mb-2">สินค้าทั้งหมด</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {data.items.map((it) => (
                <button key={it.id} onClick={() => setSku(it.sku)} className={`group relative px-3 py-2 rounded border text-left transition-all duration-200 ${sku === it.sku ? 'border-accent bg-white/5 scale-[1.02]' : 'border-white/10 hover:border-white/20'} `}>
                  {it.is_recommended && (
                    <div className="absolute top-1 right-1">
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-1.5 py-0.5">
                        <Star className="size-2.5 mr-0.5" fill="currentColor" />
                        แนะนำ
                      </Badge>
                    </div>
                  )}
                  <div className="text-sm pr-12 flex items-center gap-1.5">
                    {getCurrencyIcon(it.name)}
                    <span>{it.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-base font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent tabular-nums">{Number(it.price)}฿</span>
                    {Number(it.originalPrice) > Number(it.price) && (
                      <span className="text-xs text-white/40 line-through tabular-nums">{Number(it.originalPrice)}฿</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right column: summary and confirm */}
        <div className="col-span-12 md:col-span-5 space-y-3 md:sticky md:top-20 self-start">
          {(data.badge && (flashStart || flashEnd)) && (
            <section className="card p-4">
              <div className="flex items-center justify-between">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://img2.pic.in.th/pic/flashsale.webp" alt="Flash Sale" className="h-5 md:h-6 w-auto" />
                <FlashSaleCountdown start={flashStart || undefined} end={flashEnd || undefined} />
              </div>
            </section>
          )}

          <section className={`card p-4 space-y-3 ${isMobile ? 'hidden' : ''}`}>
            <h2 className="text-sm mb-2">โค้ดส่วนลด</h2>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="ใส่โค้ดคูปอง"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponData(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') validateCoupon();
                }}
              />
              <Button
                type="button"
                onClick={validateCoupon}
                disabled={!couponCode.trim() || validatingCoupon || !selectedPrice}
                variant="outline"
              >
                {validatingCoupon ? <Spinner /> : 'ใช้'}
              </Button>
            </div>
            {couponData && (
              <div className="text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded px-2 py-1.5">
                ใช้โค้ด {couponData.code} ลด {couponData.discount_amount.toFixed(2)} ฿
                <button
                  type="button"
                  onClick={() => {
                    setCouponCode('');
                    setCouponData(null);
                  }}
                  className="ml-2 text-red-300 hover:text-red-400"
                >
                  ลบ
                </button>
              </div>
            )}
          </section>

          <section className={`card p-4 ${isMobile ? 'hidden' : ''}`}>
            <h2 className="text-sm mb-2">สรุปรายการ</h2>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span>แพ็กเกจ</span><span className="transition-colors duration-200">{data.items.find((i) => i.sku === sku)?.name || '-'}</span></div>
              <div className="flex justify-between"><span>ราคา</span><span className="tabular-nums transition-opacity duration-200">{animatedPrice.toFixed(0)}฿</span></div>
              {couponData && (
                <>
                  <div className="flex justify-between text-green-300">
                    <span>ส่วนลด ({couponData.code})</span>
                    <span className="tabular-nums">-{couponData.discount_amount.toFixed(2)}฿</span>
                  </div>
                  <div className="border-t border-white/10 pt-1 mt-1">
                    <div className="flex justify-between font-semibold">
                      <span>รวม</span>
                      <span className="tabular-nums text-accent">{animatedFinalPrice.toFixed(2)}฿</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {data.inputs && data.inputs.length > 0 && (
            <section className="card p-4 space-y-3">
              <h2 className="text-sm">ข้อมูลสำหรับเติม</h2>
              {data.inputs.map((inp, idx) => (
                <div key={inp.key || idx}>
                  <label className="block text-xs mb-1">{inp.title}</label>
                  {inp.type === 'select' ? (
                    <select className="input" value={input[inp.key] || ''} onChange={(e) => setInput((prev) => ({ ...prev, [inp.key]: e.target.value }))}>
                      <option value="" disabled>โปรดเลือก</option>
                      {inp.options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="input" placeholder={inp.placeholder} value={input[inp.key] || ''} onChange={(e) => setInput((prev) => ({ ...prev, [inp.key]: e.target.value }))} />
                  )}
                </div>
              ))}
            </section>
          )}

          <div className={isMobile ? 'hidden' : ''}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={!canSubmit || submitting}>ยืนยันสั่งซื้อ</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันคำสั่งซื้อ</AlertDialogTitle>
                  <AlertDialogDescription>
                    <div className="space-y-1 text-white/80">
                      <div className="flex justify-between"><span>บริการ</span><span>{data.name}</span></div>
                      <div className="flex justify-between"><span>แพ็กเกจ</span><span>{data.items.find((i) => i.sku === sku)?.name || '-'}</span></div>
                      <div className="flex justify-between"><span>ราคา</span><span>{Number(data.items.find((i) => i.sku === sku)?.price || 0)}฿</span></div>
                      {couponData && (
                        <>
                          <div className="flex justify-between text-green-300"><span>ส่วนลด ({couponData.code})</span><span>-{couponData.discount_amount.toFixed(2)}฿</span></div>
                          <div className="flex justify-between font-semibold"><span>รวม</span><span>{couponData.final_amount.toFixed(2)}฿</span></div>
                        </>
                      )}
                      {data.inputs && data.inputs.length > 0 ? (
                        data.inputs.map((inp) => {
                          const val = input[inp.key] || '';
                          return (
                            <div key={inp.key} className="flex justify-between">
                              <span>{inp.title}</span>
                              <span>{val || '-'}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex justify-between"><span>UID</span><span>{input.uid || '-'}</span></div>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={onSubmit} disabled={submitting}>
                    {submitting ? (<><Spinner />กำลังยืนยัน...</>) : 'ยืนยัน'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
      
      {/* QR Payment Dialog */}
      <Dialog open={!!qrData} onOpenChange={(open) => {
        if (!open) {
          setQrData(null);
          setQrLeft(0);
        }
      }}>
        <DialogContent className="max-w-sm">
          {qrData && (
            <>
              <DialogHeader>
                <DialogTitle>ชำระเงินด้วย QR Code</DialogTitle>
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>เหลือเวลา</span>
                  <span className="font-semibold text-accent">{Math.ceil(qrLeft)} วินาที</span>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid place-items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/png;base64,${qrData.base64}`} alt="QR Code" className="rounded bg-white p-3 max-w-[280px] w-full" />
                </div>
                <div className="text-center">
                  <div className="text-xs text-white/60 mb-1">ยอดชำระ</div>
                  <div className="text-xl font-bold text-accent">{qrData.amount.toLocaleString()} ฿</div>
                </div>
                <Progress value={qrData.timeout ? ((qrData.timeout - qrLeft) / qrData.timeout) * 100 : 0} />
                <div className="text-xs text-center text-white/60">
                  สแกน QR Code เพื่อชำระเงิน
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    {/* Input Dialog for QR Payment */}
    <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>กรอกข้อมูลสำหรับเติม</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {data?.inputs && data.inputs.length > 0 ? (
            data.inputs.map((inp, idx) => (
              <div key={inp.key || idx}>
                <label className="block text-sm mb-1.5 font-medium">{inp.title}</label>
                {inp.type === 'select' ? (
                  <select 
                    className="input w-full"
                    value={tempInput[inp.key] || ''} 
                    onChange={(e) => setTempInput((prev) => ({ ...prev, [inp.key]: e.target.value }))}
                  >
                    <option value="" disabled>โปรดเลือก</option>
                    {inp.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input 
                    placeholder={inp.placeholder} 
                    value={tempInput[inp.key] || ''} 
                    onChange={(e) => setTempInput((prev) => ({ ...prev, [inp.key]: e.target.value }))}
                  />
                )}
              </div>
            ))
          ) : (
            <div>
              <label className="block text-sm mb-1.5 font-medium">UID</label>
              <Input 
                placeholder="กรอก UID" 
                value={tempInput.uid || ''} 
                onChange={(e) => setTempInput((prev) => ({ ...prev, uid: e.target.value }))}
              />
            </div>
          )}
          
          {/* Summary */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">แพ็กเกจ</span>
              <span>{data?.items.find((i) => i.sku === sku)?.name || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">ราคา</span>
              <span>{Number(data?.items.find((i) => i.sku === sku)?.price || 0)}฿</span>
            </div>
            {couponData && (
              <>
                <div className="flex justify-between text-sm text-green-300">
                  <span>ส่วนลด ({couponData.code})</span>
                  <span>-{couponData.discount_amount.toFixed(2)}฿</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-2">
                  <span>รวม</span>
                  <span className="text-accent">{couponData.final_amount.toFixed(2)}฿</span>
                </div>
              </>
            )}
            {!couponData && (
              <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-2">
                <span>รวม</span>
                <span className="text-accent">{Number(data?.items.find((i) => i.sku === sku)?.price || 0)}฿</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooterUI>
          <Button variant="outline" onClick={() => setShowInputDialog(false)}>
            ยกเลิก
          </Button>
          <Button 
            onClick={() => {
              setInput(tempInput);
              createQRPayment();
            }}
            disabled={submitting || !canSubmitDialog}
          >
            {submitting ? (
              <>
                <Spinner className="mr-2" />
                กำลังสร้าง QR...
              </>
            ) : (
              'ซื้อ'
            )}
          </Button>
        </DialogFooterUI>
      </DialogContent>
    </Dialog>
    
    {/* Result Dialog for API responses */}
    <Dialog open={resultOpen} onOpenChange={setResultOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>สถานะคำสั่งซื้อ</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-white/80 whitespace-pre-wrap break-words">
          {submitMsg || '—'}
        </div>
        <DialogFooterUI>
          <Button onClick={() => setResultOpen(false)}>ปิด</Button>
        </DialogFooterUI>
      </DialogContent>
    </Dialog>
        </div>
      </div>
    </main>

    {/* Sticky Footer for Mobile */}
    {isMobile && data && (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-white/10 shadow-lg">
        <div className="mx-auto max-w-5xl px-4 py-3 space-y-2">
          {/* Coupon Section */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="ใส่โค้ดส่วนลด"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponData(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') validateCoupon();
              }}
              className="flex-1 text-sm h-9"
            />
            <Button
              type="button"
              onClick={validateCoupon}
              disabled={!couponCode.trim() || validatingCoupon || !selectedPrice}
              variant="outline"
              size="sm"
              className="h-9 min-w-[80px] px-4"
            >
              {validatingCoupon ? <Spinner className="size-4" /> : 'ใช้'}
            </Button>
          </div>
          {couponData && (
            <div className="text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded px-2 py-1 flex items-center justify-between">
              <span>ใช้โค้ด {couponData.code} ลด {couponData.discount_amount.toFixed(2)} ฿</span>
              <button
                type="button"
                onClick={() => {
                  setCouponCode('');
                  setCouponData(null);
                }}
                className="text-red-300 hover:text-red-400 ml-2"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* Price and Buy Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/60">รวม</div>
              <div className="text-lg font-bold text-accent tabular-nums">
                {animatedFinalPrice.toFixed(2)}฿
              </div>
            </div>
            <Button 
              className="flex-shrink-0" 
              disabled={!canSubmit || submitting} 
              size="lg"
              onClick={handleConfirmPurchase}
            >
              {submitting ? (
                <>
                  <Spinner className="mr-2" />
                  กำลังยืนยัน...
                </>
              ) : (
                'ยืนยันสั่งซื้อ'
              )}
            </Button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}


