'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter as DialogFooterUI } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { SpinnerCustom } from '@/components/ui/spinner-custom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Zap, Star, Coins, Gem, Gamepad2, Home, ShoppingCart, CheckCircle2, Flame } from 'lucide-react';
import dynamic from 'next/dynamic';

const HeroVideoDialog = dynamic(() => import('@/components/ui/hero-video-dialog').then(mod => ({ default: mod.HeroVideoDialog })), { 
  ssr: false,
  loading: () => <div className="w-full aspect-video bg-gray-800 rounded-md animate-pulse" />
});
const FlashSaleCountdown = dynamic(() => import('@/components/FlashSaleCountdown'), { ssr: false });
import ElectricBorder from '@/components/ElectricBorder';
import { Progress } from '@/components/ui/progress';

type Detail = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  banner_url?: string | null;
  icon_url?: string | null;
  tutorial_video_url?: string | null;
  tutorial_video_thumbnail_url?: string | null;
  items: { id: number; name: string; sku: string; price: string; originalPrice: string; original_price_for_permission?: string | null; is_recommended?: boolean; icon_url?: string | null; is_flashsale?: boolean; flashsale_price?: string | null; quantity_remaining?: number | null; max_quantity?: number | null }[];
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
  const { openLoginDialog } = useAuthDialog();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [input, setInput] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [openConfirm, setOpenConfirm] = useState(false);
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
  const [bannerError, setBannerError] = useState(false);

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
      return <Flame className={`${iconSize} text-cyan-400`} />;
    }
    return <Coins className={`${iconSize} text-yellow-400`} />;
  }, []);

  const handleIconError = useCallback(() => {
    if (iconUrl) {
      setIconErrors(prev => new Set(prev).add(iconUrl));
    }
  }, [iconUrl]);

  const getCurrencyIcon = useCallback((itemName: string, itemIconUrl?: string | null, size: 'sm' | 'lg' = 'sm') => {
    // ลำดับความสำคัญ: item icon > product icon > fallback
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
    isInitialMount.current = false;
    
    const controller = new AbortController();
    (async () => {
      try {
        setError(null);
        setInput({});
        setCouponCode('');
        setCouponData(null);
        setIconErrors(new Set());
        setBannerError(false);
        
        const timestamp = Date.now();
        const detailRes = await fetch(`/api/products/${currentKey ?? ''}?t=${timestamp}`, { 
            cache: 'no-store',
            headers: { 
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
            signal: controller.signal 
          });
        if (!detailRes.ok) throw new Error('ไม่พบบริการนี้');
        const detailJson = await detailRes.json();

        const sortItems = (items: Detail['items']) => {
          if (!Array.isArray(items)) return [];
          const isDiamondItem = (name: string) => {
            const lower = name.toLowerCase();
            return (
              lower.includes('diamond') ||
              lower.includes('เพชร') ||
              lower.includes('ดาบเพชร') // กันการสะกดแปลก
            );
          };
          return [...items].sort((a, b) => {
            const aDiamond = isDiamondItem(a.name) ? 0 : 1;
            const bDiamond = isDiamondItem(b.name) ? 0 : 1;
            if (aDiamond !== bDiamond) {
              return aDiamond - bDiamond;
            }
            return Number(a.price) - Number(b.price);
          });
        };

        const merged = { ...detailJson.data } as Detail;
        merged.items = sortItems(merged.items);
        setData(merged);
        setSku(merged.items?.[0]?.sku || '');
      } catch (e: unknown) {
        if ((e as any)?.name !== 'AbortError') setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [params?.key]);

  const regexCache = useRef<Map<string, RegExp>>(new Map());

  const canSubmit = useMemo(() => {
    if (!data || !sku) return false;
    if (!data.inputs || data.inputs.length === 0) return true;
    for (const inp of data.inputs) {
      const val = (input[inp.key] || '').trim();
      if (!val) return false;
      if (inp.regex) {
        try {
          let regex = regexCache.current.get(inp.regex);
          if (!regex) {
            regex = new RegExp(inp.regex);
            regexCache.current.set(inp.regex, regex);
          }
          if (!regex.test(val)) return false;
        } catch {
        }
      }
    }
    return true;
  }, [data, sku, input]);

  const canSubmitDialog = useMemo(() => {
    if (!data || !sku) return false;
    if (!data.inputs || data.inputs.length === 0) return true;
    for (const inp of data.inputs) {
      const val = (tempInput[inp.key] || '').trim();
      if (!val) return false;
      if (inp.regex) {
        try {
          let regex = regexCache.current.get(inp.regex);
          if (!regex) {
            regex = new RegExp(inp.regex);
            regexCache.current.set(inp.regex, regex);
          }
          if (!regex.test(val)) return false;
        } catch {
        }
      }
    }
    return true;
  }, [data, sku, tempInput]);

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
      
      // Check if unauthorized
      if (res.status === 401) {
        const json = await res.json().catch(() => ({}));
        if (json.error === 'unauthorized' || res.status === 401) {
          setSubmitting(false);
          openLoginDialog();
          return;
        }
      }
      
      const json = await res.json();
      if (!res.ok || json.status !== 1) throw new Error(json?.message || 'สร้าง QR ไม่สำเร็จ');
      setQrData({ base64: json.qr_image_base64, amount: Number(json.amount), idPay: json.id_pay, timeout: Number(json.time_out) });
      setQrLeft(Number(json.time_out) || 900);
      setShowInputDialog(false);
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
    if (data.key === 'free-fire-v1') {
      setTempInput({ ...input });
      setShowInputDialog(true);
      return;
    }
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
      
      // Check if unauthorized
      if (res.status === 401) {
        const contentType = res.headers.get('content-type');
        const json = contentType?.includes('application/json') 
          ? await res.json().catch(() => ({}))
          : {};
        if (json.error === 'unauthorized' || res.status === 401) {
          setSubmitting(false);
          openLoginDialog();
          return;
        }
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }
      
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

  if (error) return <main className="mx-auto max-w-6xl px-4 py-6 text-emerald-500">{error}</main>;
  
  if (loading || !data) {
    return (
      <div className="min-h-screen">
        <div className="relative h-48 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
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
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative overflow-hidden py-12 md:py-16 shadow-lg">
        {/* Background Image */}
        <div className="absolute inset-0">
          {data.banner_url && !bannerError ? (
            <img 
              src={data.banner_url}
              alt="Product Banner Background"
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setBannerError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950" />
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
            <Link href="/products" className="hover:text-white transition-colors flex items-center gap-1">
              <Gamepad2 className="h-4 w-4" />
              เติมเกมออนไลน์
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
                <Gamepad2 className="h-6 w-6" />
                <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
              </div>
              <p className="text-white/90 text-sm md:text-base">Top Up {data.name}</p>
              
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

      {/* Tutorial Video Section */}
      {data.tutorial_video_url && (
        <div className="bg-[#0a0a0a] border-b border-gray-800">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-500" />
                วิธีการเติม
              </h2>
              <p className="text-sm text-gray-400 mt-1">ดูวิดีโอวิธีการเติม {data.name}</p>
            </div>
            <HeroVideoDialog
              animationStyle="from-center"
              videoSrc={(() => {
                // ถ้าเป็น iframe code ให้ดึง src ออกมา
                if (data.tutorial_video_url && typeof data.tutorial_video_url === 'string' && data.tutorial_video_url.includes('<iframe')) {
                  const match = data.tutorial_video_url.match(/src=["']([^"']+)["']/);
                  return match?.[1] || data.tutorial_video_url;
                }
                return data.tutorial_video_url || '';
              })()}
              thumbnailSrc={data.tutorial_video_thumbnail_url || data.banner_url || data.image_url || 'https://via.placeholder.com/1280x720/0a0a0a/ffffff?text=วิดีโอวิธีการเติม'}
              thumbnailAlt={`วิดีโอวิธีการเติม ${data.name}`}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="md:col-span-2 space-y-4">
            {/* Step 1: Input Form */}
            {data.inputs && data.inputs.length > 0 && (
              <section className="bg-[#0a0a0a] rounded-xl shadow-sm border border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm">
                    1
                  </div>
                  <h2 className="text-lg font-bold text-white">ป้อน {data.inputs[0]?.title || 'ข้อมูล'}</h2>
                </div>
                <div className="space-y-4">
                  {data.inputs.map((inp, idx) => (
                    <div key={inp.key || idx}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">{inp.title}<span className="text-emerald-500">*</span></label>
                      {inp.type === 'select' ? (
                        <select 
                          className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#1a1a1a] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          value={input[inp.key] || ''} 
                          onChange={(e) => setInput((prev) => ({ ...prev, [inp.key]: e.target.value }))}
                        >
                          <option value="" disabled>โปรดเลือก</option>
                          {inp.options?.map((o) => (
                            <option key={o.value} value={o.value} className="bg-[#1a1a1a]">{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#1a1a1a] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" 
                          placeholder={inp.placeholder} 
                          value={input[inp.key] || ''} 
                          onChange={(e) => setInput((prev) => ({ ...prev, [inp.key]: e.target.value }))} 
                        />
                      )}
                      <p className="mt-1 text-xs text-gray-400">{inp.placeholder}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Step 2: Select Package */}
            <section className="bg-[#0a0a0a] rounded-xl shadow-sm border border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm">
                  2
                </div>
                <h2 className="text-lg font-bold text-white">เลือกแพ็คเกจ</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.items.map((it) => {
                  const isFlashsale = it.is_flashsale;
                  const isSelected = sku === it.sku;
                  const isRecommended = Boolean(it.is_recommended);
                  
                  return (
                    <div key={it.id} className="relative h-full">
                  <button 
                    onClick={() => setSku(it.sku)} 
                        className={`relative rounded-xl border-2 transition-all duration-200 overflow-visible group cursor-pointer h-full flex flex-col w-full ${
                          isSelected 
                            ? isFlashsale
                              ? 'border-orange-500 shadow-xl shadow-orange-500/20'
                              : 'border-white shadow-xl'
                            : isFlashsale
                              ? 'border-orange-500/50 bg-[#0a0a0a] hover:border-orange-500/80'
                              : 'border-gray-700 bg-[#0a0a0a] hover:border-gray-600'
                        }`}
                      >
                        {/* Electric Border สำหรับ Flash Sale */}
                        {isFlashsale && (
                          <div className="absolute -inset-1 z-0 pointer-events-none overflow-visible rounded-xl">
                            <ElectricBorder
                              color="#f97316"
                              speed={0.9}
                              chaos={0.3}
                              thickness={2}
                              style={{ borderRadius: 12 }}
                              className="absolute inset-0 w-full h-full overflow-visible"
                            >
                              <div className="w-full h-full" />
                            </ElectricBorder>
                          </div>
                        )}
                        {/* Flash Sale Badge */}
                        {isFlashsale && (
                          <div className="absolute top-2 left-2 z-10">
                            <Badge variant="destructive" className="bg-red-600 text-white border-0 text-xs px-2.5 py-1 shadow-lg">
                              แฟลชเซล
                            </Badge>
                          </div>
                    )}
                    
                        {/* Recommended Badge */}
                        {isRecommended && !isFlashsale && (
                      <div className="absolute top-2 right-2 z-20">
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-2 py-0.5 shadow-md">
                          <Star className="size-3 mr-0.5" fill="currentColor" />
                          แนะนำ
                        </Badge>
                      </div>
                    )}
                    
                        {/* Content Section */}
                        <div className="p-4 bg-[#0a0a0a] flex flex-col flex-1 relative z-10 rounded-xl">
                          {/* Icon */}
                          <div className="flex items-center justify-center mb-3 flex-shrink-0">
                      {getCurrencyIcon(it.name, it.icon_url, 'lg')}
                    </div>
                    
                          {/* Name - ใช้ min-height และ line-clamp เพื่อให้การ์ดทั้งหมดสูงเท่ากัน */}
                          <div className="text-sm font-medium text-white mb-3 text-center min-h-[60px] flex items-center justify-center leading-tight">
                            <span className="line-clamp-3">{it.name}</span>
                      </div>
                      
                          {/* Price Section - ใช้ mt-auto เพื่อให้อยู่ด้านล่าง */}
                          <div className="flex flex-col items-center gap-1.5 mt-auto">
                            <span className="text-2xl font-bold text-emerald-500 tabular-nums">
                              {Number(it.price).toFixed(2)}฿
                            </span>
                        {(() => {
                          // ถ้ามี original_price_for_permission แสดงว่าเป็น custom price จากสิทธิ์
                          if (it.original_price_for_permission) {
                            return (
                              <span className="text-xs text-gray-400 line-through tabular-nums">
                                {Number(it.original_price_for_permission).toFixed(2)}฿
                              </span>
                            );
                          }
                          // ถ้าไม่มี custom price แต่ originalPrice มากกว่า price ให้แสดง
                          if (Number(it.originalPrice) > Number(it.price)) {
                            return (
                              <span className="text-xs text-gray-400 line-through tabular-nums">
                                {Number(it.originalPrice).toFixed(2)}฿
                              </span>
                            );
                          }
                          return null;
                        })()}
                            
                            {/* แสดงจำนวนคงเหลือสำหรับ flash sale */}
                            {isFlashsale && it.quantity_remaining !== null && it.quantity_remaining !== undefined && (
                              <div className="mt-2 pt-2 border-t border-gray-700 w-full">
                                <span className="text-xs text-orange-400 font-medium">
                                  คงเหลือ {it.quantity_remaining} สิทธิ์
                                </span>
                              </div>
                            )}
                      </div>
                    </div>
                  </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-4">
            {/* Step 3: Summary */}
            <section className="bg-[#0a0a0a] rounded-xl shadow-sm border border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm">
                  3
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
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>ส่วนลด ({couponData.code})</span>
                    <span className="font-medium tabular-nums">-{couponData.discount_amount.toFixed(2)}฿</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-300 font-medium">ยอดรวม</span>
                <span className="text-2xl font-bold text-emerald-500 tabular-nums">{animatedFinalPrice.toFixed(2)}฿</span>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200" 
                disabled={!canSubmit || submitting}
                onClick={handleConfirmPurchase}
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

      {/* Dialogs */}
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
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>เหลือเวลา</span>
                  <span className="font-semibold text-emerald-500">{Math.ceil(qrLeft)} วินาที</span>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid place-items-center">
                  <img src={`data:image/png;base64,${qrData.base64}`} alt="QR Code" className="rounded bg-white p-3 max-w-[280px] w-full" />
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">ยอดชำระ</div>
                  <div className="text-xl font-bold text-emerald-500">{qrData.amount.toLocaleString()} ฿</div>
                </div>
                <Progress value={qrData.timeout ? ((qrData.timeout - qrLeft) / qrData.timeout) * 100 : 0} />
                <div className="text-xs text-center text-gray-500">
                  สแกน QR Code เพื่อชำระเงิน
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
                      className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#1a1a1a] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={tempInput[inp.key] || ''} 
                      onChange={(e) => setTempInput((prev) => ({ ...prev, [inp.key]: e.target.value }))}
                    >
                      <option value="" disabled className="bg-[#1a1a1a]">โปรดเลือก</option>
                      {inp.options?.map((o) => (
                        <option key={o.value} value={o.value} className="bg-[#1a1a1a]">{o.label}</option>
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
            
            <div className="border-t border-gray-800 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">แพ็กเกจ</span>
                <span className="text-white">{data?.items.find((i) => i.sku === sku)?.name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">ราคา</span>
                <span className="text-white">{Number(data?.items.find((i) => i.sku === sku)?.price || 0)}฿</span>
              </div>
              {couponData && (
                <>
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>ส่วนลด ({couponData.code})</span>
                    <span>-{couponData.discount_amount.toFixed(2)}฿</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-gray-800 pt-2">
                    <span className="text-gray-300">รวม</span>
                    <span className="text-emerald-500">{couponData.final_amount.toFixed(2)}฿</span>
                  </div>
                </>
              )}
              {!couponData && (
                <div className="flex justify-between text-sm font-semibold border-t border-gray-800 pt-2">
                  <span className="text-gray-300">รวม</span>
                  <span className="text-emerald-500">{Number(data?.items.find((i) => i.sku === sku)?.price || 0)}฿</span>
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
