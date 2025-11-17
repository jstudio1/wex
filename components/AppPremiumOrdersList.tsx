'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, AlertCircle, Package, RefreshCcw, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type AppPremiumOrder = {
  id: number;
  reference: string | null;
  external_reference: string | null;
  product_data: any;
  price: number;
  status: string;
  created_at: string;
  updated_at: string;
  app_premium_products: {
    id: number;
    display_name: string | null;
    name: string;
    image_url: string | null;
  } | null;
};

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    'success': 'สำเร็จ',
    'completed': 'สำเร็จ',
    'pending': 'รอดำเนินการ',
    'failed': 'ล้มเหลว',
    'cancelled': 'ยกเลิก',
    'processing': 'กำลังดำเนินการ',
    'confirming': 'กำลังยืนยัน',
    'refunded': 'คืนเงิน',
    'claimed': 'กำลังเคลม'
  };
  return map[status.toLowerCase()] || status;
}

function getStatusColorClass(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower === 'success' || statusLower === 'completed') {
    return 'bg-emerald-600/30 text-emerald-300 border-emerald-500/30';
  } else if (statusLower === 'pending') {
    return 'bg-amber-600/30 text-amber-300 border-amber-500/30';
  } else if (statusLower === 'failed') {
    return 'bg-red-600/30 text-red-300 border-red-500/30';
  } else if (statusLower === 'cancelled') {
    return 'bg-slate-600/30 text-slate-300 border-slate-500/30';
  } else if (statusLower === 'processing' || statusLower === 'confirming') {
    return 'bg-blue-600/30 text-blue-300 border-blue-500/30';
  } else if (statusLower === 'refunded') {
    return 'bg-orange-600/30 text-orange-300 border-orange-500/30';
  } else if (statusLower === 'claimed') {
    return 'bg-purple-600/30 text-purple-300 border-purple-500/30';
  }
  return 'bg-white/10 text-[color:var(--text)]/70 border-white/20';
}

export default function AppPremiumOrdersList() {
  const toast = useToast();
  const [orders, setOrders] = useState<AppPremiumOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [claimingOrderId, setClaimingOrderId] = useState<number | null>(null);
  const [claimStatus, setClaimStatus] = useState<string>('');
  const [claimDescription, setClaimDescription] = useState<string>('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [viewingProductDataOrderId, setViewingProductDataOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Refresh when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Reset button styles when dialog closes
  useEffect(() => {
    if (!claimingOrderId) {
      // Remove any forced styles from buttons when dialog closes
      const buttons = document.querySelectorAll('[data-claim-button]');
      buttons.forEach((btn) => {
        if (btn instanceof HTMLElement) {
          btn.style.backgroundColor = '';
        }
      });
    }
  }, [claimingOrderId]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/app-premium/orders');
      const json = await res.json();
      if (json.ok && json.data) {
        setOrders(json.data);
      } else {
        console.error('Failed to fetch orders:', json);
      }
    } catch (error) {
      console.error('Failed to fetch app premium orders', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(prev => ({ ...prev, [key]: true }));
      toast.show({ title: 'สำเร็จ', description: 'คัดลอกแล้ว' });
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถคัดลอกได้', variant: 'destructive' });
    }
  };

  const handleClaim = async (orderId: number) => {
    if (!claimStatus || !claimDescription.trim()) {
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: 'กรุณาเลือกสถานะและกรอกคำอธิบาย', 
        variant: 'destructive' 
      });
      return;
    }

    setSubmittingClaim(true);
    try {
      const res = await fetch('/api/app-premium/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          status: claimStatus,
          description: claimDescription.trim()
        })
      });

      const json = await res.json();
      if (json.ok) {
        toast.show({ 
          title: 'สำเร็จ', 
          description: json.message || 'ส่งคำขอเคลมเรียบร้อยแล้ว กรุณารอการตรวจสอบจากทีมงาน' 
        });
        // Close dialog and reset states
        setClaimingOrderId(null);
        setClaimStatus('');
        setClaimDescription('');
        await fetchOrders(); // Refresh orders
      } else {
        toast.show({ 
          title: 'เกิดข้อผิดพลาด', 
          description: json.detail || json.error || 'ไม่สามารถส่งคำขอเคลมได้', 
          variant: 'destructive' 
        });
      }
    } catch (err) {
      console.error('Claim error:', err);
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: 'ไม่สามารถส่งคำขอเคลมได้', 
        variant: 'destructive' 
      });
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">สินค้า</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">Reference</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">ข้อมูลสินค้า</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90">ราคา</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90">สถานะ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">วันที่สร้าง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-24 mx-auto rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Package className="size-6" />
          </EmptyMedia>
          <EmptyTitle>ยังไม่มีออเดอร์ซื้อแอพพรีเมี่ยม</EmptyTitle>
          <EmptyDescription>
            คำสั่งซื้อแอพพรีเมี่ยมจะแสดงที่นี่เมื่อมีการสั่งซื้อ
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/premium-app'}>
            <RefreshCcw className="size-4" />
            ไปดูสินค้า
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">สินค้า</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">Reference</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">ข้อมูลสินค้า</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">ราคา</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">วันที่สร้าง</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {orders.map((order) => {
                const product = order.app_premium_products;
                const productName = product?.display_name || product?.name || 'N/A';
                const reference = order.reference || order.external_reference || `#${order.id}`;
                
                // Extract product data from product_data (อาจเป็น object หรือ string)
                let productDataDisplay = 'ไม่มีข้อมูล';
                let hasClaimedData = false;
                let originalProductData = null;
                
                // ตรวจสอบว่ามีข้อมูลเคลมหรือไม่ และดึง ticketId, callbackUrl
                let ticketId: string | null = null;
                let callbackUrl: string | null = null;
                let callbackReceived = false;
                let callbackAt: string | null = null;
                try {
                  const rawResponse = (order as any).raw_response;
                  ticketId = rawResponse?.claim?.ticketId || null;
                  callbackUrl = rawResponse?.claim?.callbackUrl || null;
                  callbackReceived = !!rawResponse?.claim?.callbackAt;
                  callbackAt = rawResponse?.claim?.callbackAt || null;
                  if (rawResponse?.claim?.callbackStatus === 'success' && rawResponse?.claim?.callbackPrize) {
                    hasClaimedData = true;
                    // เก็บข้อมูลเดิมไว้ถ้ามี (จาก raw_response.originalProductData หรือ product_data)
                    if (rawResponse.originalProductData) {
                      if (typeof rawResponse.originalProductData === 'string') {
                        try {
                          originalProductData = JSON.parse(rawResponse.originalProductData);
                        } catch {
                          originalProductData = rawResponse.originalProductData;
                        }
                      } else {
                        originalProductData = rawResponse.originalProductData;
                      }
                    } else if (order.product_data) {
                      // Fallback ถ้าไม่มี originalProductData (กรณีเก่า)
                      if (typeof order.product_data === 'string') {
                        try {
                          originalProductData = JSON.parse(order.product_data);
                        } catch {
                          originalProductData = order.product_data;
                        }
                      } else {
                        originalProductData = order.product_data;
                      }
                    }
                    // ข้อมูลใหม่จากเคลม (ใช้ callbackPrize)
                    productDataDisplay = typeof rawResponse.claim.callbackPrize === 'string' 
                      ? rawResponse.claim.callbackPrize 
                      : JSON.stringify(rawResponse.claim.callbackPrize, null, 2);
                  } else if (order.product_data) {
                    // แสดงข้อมูลปัจจุบัน (ไม่มีเคลม)
                    if (typeof order.product_data === 'string') {
                      const parsed = JSON.parse(order.product_data);
                      productDataDisplay = JSON.stringify(parsed, null, 2);
                    } else if (typeof order.product_data === 'object') {
                      productDataDisplay = JSON.stringify(order.product_data, null, 2);
                    }
                  }
                } catch {
                  if (order.product_data) {
                    productDataDisplay = String(order.product_data);
                  }
                }

                return (
                  <tr key={order.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={productName}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-white/10" />
                        )}
                        <div>
                          <div className="font-medium text-[color:var(--text)]">{productName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-[color:var(--text)]/80">{reference}</code>
                        <button
                          onClick={() => copyToClipboard(reference, `ref-${order.id}`)}
                          className="text-[color:var(--text)]/60 hover:text-[color:var(--text)] transition-colors"
                          title="คัดลอก"
                        >
                          {copied[`ref-${order.id}`] ? (
                            <Check className="size-4 text-green-400" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingProductDataOrderId(order.id)}
                        className="gap-2"
                      >
                        <Info className="size-4" />
                        ดูข้อมูลสินค้า
                            {hasClaimedData && (
                          <Badge variant="outline" className="bg-green-600/30 text-green-300 border-green-500/30 text-xs px-2 py-0 ml-1">
                                มีข้อมูลใหม่
                              </Badge>
                            )}
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-[color:var(--text)]">{Number(order.price).toFixed(2)}</div>
                      <div className="text-xs text-[color:var(--text)]/60">พอยต์</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={getStatusColorClass(order.status)}>
                        {translateStatus(order.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-[color:var(--text)]/80">
                        {new Date(order.created_at).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {order.status === 'completed' && (
                        <AlertDialog 
                          open={claimingOrderId === order.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setClaimingOrderId(null);
                              setClaimStatus('');
                              setClaimDescription('');
                            } else {
                              setClaimingOrderId(order.id);
                            }
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setClaimingOrderId(order.id);
                                // Force remove hover state immediately
                                const button = e.currentTarget;
                                button.blur();
                                // Force remove hover background by setting inline style
                                requestAnimationFrame(() => {
                                  button.style.backgroundColor = 'transparent';
                                });
                              }}
                              onMouseDown={(e) => {
                                // Remove hover state on mousedown (before click)
                                const button = e.currentTarget;
                                button.style.backgroundColor = 'transparent';
                                button.blur();
                              }}
                              className="gap-2"
                              data-claim-button="true"
                              style={claimingOrderId === order.id ? { backgroundColor: 'transparent' } : undefined}
                            >
                              <AlertCircle className="size-4" />
                              เคลมสินค้า
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent 
                            className="max-w-md"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl">เคลมสินค้าแอพพรีเมี่ยม</AlertDialogTitle>
                              <AlertDialogDescription className="pt-4">
                                <div className="space-y-4 text-white/80">
                                  <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-white/60">สินค้า:</span>
                                    <span className="font-medium">{productName}</span>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="claim-status">สถานะปัญหา *</Label>
                                    <Select 
                                      value={claimStatus} 
                                      onValueChange={(value) => {
                                        setClaimStatus(value);
                                      }}
                                    >
                                      <SelectTrigger 
                                        id="claim-status"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <SelectValue placeholder="เลือกสถานะปัญหา" />
                                      </SelectTrigger>
                                      <SelectContent 
                                        className="z-[100]"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <SelectItem value="wrong_password">รหัสผ่านผิด</SelectItem>
                                        <SelectItem value="incorrect_pin">PIN ไม่ถูกต้อง</SelectItem>
                                        <SelectItem value="youtube_premium_disconnect">Youtube Premium หลุด</SelectItem>
                                        <SelectItem value="netflix_screen_disconnect">จอ Netflix / แอพอื่นหลุด</SelectItem>
                                        <SelectItem value="others">ปัญหาอื่น ๆ</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="claim-description">คำอธิบาย *</Label>
                                    <Textarea
                                      id="claim-description"
                                      value={claimDescription}
                                      onChange={(e) => setClaimDescription(e.target.value)}
                                      placeholder="อธิบายปัญหาที่พบ..."
                                      rows={4}
                                      maxLength={500}
                                    />
                                    <p className="text-xs text-white/50">
                                      {claimDescription.length}/500 ตัวอักษร
                                    </p>
                                  </div>
                                  <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-sm text-blue-300">
                                      หลังจากส่งคำขอเคลมแล้ว ทีมงานจะตรวจสอบและแจ้งผลกลับให้คุณ
                                    </p>
                                  </div>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel 
                                disabled={submittingClaim} 
                                onClick={() => {
                                  setClaimStatus('');
                                  setClaimDescription('');
                                }}
                              >
                                ยกเลิก
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleClaim(order.id);
                                  // Dialog will be closed by onOpenChange after success
                                }}
                                closeOnClick={false}
                                disabled={submittingClaim || !claimStatus || !claimDescription.trim()}
                                className="bg-accent hover:opacity-90"
                              >
                                {submittingClaim ? (
                                  <>
                                    <Spinner className="mr-2 size-4" />
                                    กำลังส่ง...
                                  </>
                                ) : (
                                  'ส่งคำขอเคลม'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {order.status === 'claimed' && (
                            <Badge variant="outline" className="bg-purple-600/30 text-purple-300 border-purple-500/30">
                              กำลังเคลม
                            </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Product Data Dialog - Outside of table loop */}
      {viewingProductDataOrderId && (() => {
        const viewingOrder = orders.find(o => o.id === viewingProductDataOrderId);
        if (!viewingOrder) return null;
        
        const viewingProduct = viewingOrder.app_premium_products;
        const viewingProductName = viewingProduct?.display_name || viewingProduct?.name || 'N/A';
        
        // Extract product data for viewing order
        let viewingProductDataDisplay = 'ไม่มีข้อมูล';
        let viewingHasClaimedData = false;
        let viewingOriginalProductData = null;
        
        try {
          const rawResponse = (viewingOrder as any).raw_response;
          if (rawResponse?.claim?.callbackStatus === 'success' && rawResponse?.claim?.callbackPrize) {
            viewingHasClaimedData = true;
            if (rawResponse.originalProductData) {
              if (typeof rawResponse.originalProductData === 'string') {
                try {
                  viewingOriginalProductData = JSON.parse(rawResponse.originalProductData);
                } catch {
                  viewingOriginalProductData = rawResponse.originalProductData;
                }
              } else {
                viewingOriginalProductData = rawResponse.originalProductData;
              }
            } else if (viewingOrder.product_data) {
              if (typeof viewingOrder.product_data === 'string') {
                try {
                  viewingOriginalProductData = JSON.parse(viewingOrder.product_data);
                } catch {
                  viewingOriginalProductData = viewingOrder.product_data;
                }
              } else {
                viewingOriginalProductData = viewingOrder.product_data;
              }
            }
            // ถ้าเป็น string ให้ใช้ตรงๆ (อาจมี \n)
            if (typeof rawResponse.claim.callbackPrize === 'string') {
              viewingProductDataDisplay = rawResponse.claim.callbackPrize;
            } else {
              viewingProductDataDisplay = JSON.stringify(rawResponse.claim.callbackPrize, null, 2);
            }
          } else if (viewingOrder.product_data) {
            // ถ้า product_data เป็น string ที่มี \n ให้ใช้ตรงๆ
            if (typeof viewingOrder.product_data === 'string') {
              // ลอง parse JSON ก่อน ถ้าไม่ได้ก็ใช้ string ตรงๆ
              try {
                const parsed = JSON.parse(viewingOrder.product_data);
                // ถ้า parse ได้และเป็น object ให้ stringify กลับ
                if (typeof parsed === 'object') {
                  viewingProductDataDisplay = JSON.stringify(parsed, null, 2);
                } else {
                  viewingProductDataDisplay = viewingOrder.product_data;
                }
              } catch {
                // ถ้า parse ไม่ได้ แสดงว่าเป็น plain text ให้ใช้ตรงๆ
                viewingProductDataDisplay = viewingOrder.product_data;
              }
            } else if (typeof viewingOrder.product_data === 'object') {
              viewingProductDataDisplay = JSON.stringify(viewingOrder.product_data, null, 2);
            }
          }
        } catch {
          if (viewingOrder.product_data) {
            viewingProductDataDisplay = String(viewingOrder.product_data);
          }
        }
        
        return (
          <Dialog open={viewingProductDataOrderId !== null} onOpenChange={(open) => {
            if (!open) setViewingProductDataOrderId(null);
          }}>
            <DialogContent className="max-w-3xl max-h-[80vh] bg-black/90 backdrop-blur-sm border-purple-500/20">
              <DialogHeader>
                <DialogTitle className="text-xl text-white">ข้อมูลสินค้า</DialogTitle>
                <DialogDescription className="text-white/60">
                  {viewingProductName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {viewingHasClaimedData && viewingOriginalProductData && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-amber-300">ข้อมูลเดิม:</p>
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-[color:var(--text)]/90 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                      {typeof viewingOriginalProductData === 'string' 
                        ? viewingOriginalProductData
                            .replace(/\\n/g, '\n')
                            .replace(/\\r/g, '\r')
                            .replace(/\\t/g, '\t')
                        : JSON.stringify(viewingOriginalProductData, null, 2)}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {viewingHasClaimedData && (
                    <p className="text-sm font-semibold text-green-300">ข้อมูลใหม่ (เคลมแล้ว):</p>
                  )}
                  <div className={`p-4 rounded-lg border text-sm text-[color:var(--text)]/90 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed ${
                    viewingHasClaimedData 
                      ? 'bg-green-500/10 border-green-500/20' 
                      : 'bg-black/40 border-white/10'
                  }`}>
                    {typeof viewingProductDataDisplay === 'string' 
                      ? viewingProductDataDisplay
                          .replace(/\\n/g, '\n')
                          .replace(/\\r/g, '\r')
                          .replace(/\\t/g, '\t')
                      : viewingProductDataDisplay}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}

