'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Check, Package, RefreshCcw, Info } from 'lucide-react';
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
    'refunded': 'คืนเงิน'
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
  }
  return 'bg-white/10 text-[color:var(--text)]/70 border-white/20';
}

export default function AppPremiumOrdersList() {
  const toast = useToast();
  const [orders, setOrders] = useState<AppPremiumOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [viewingProductDataOrderId, setViewingProductDataOrderId] = useState<number | null>(null);
  const [loadingTextFile, setLoadingTextFile] = useState<Record<number, boolean>>({});
  const [textFileContent, setTextFileContent] = useState<Record<number, string>>({});

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


  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/app-premium/orders');
      const json = await res.json();
      if (json.ok && json.data) {
        console.log('[AppPremiumOrdersList] Fetched orders:', json.data.length);
        // Debug: log first order to check product data
        if (json.data.length > 0) {
          console.log('[AppPremiumOrdersList] First order:', {
            id: json.data[0].id,
            product: json.data[0].app_premium_products,
            product_data: json.data[0].product_data,
            raw_response: json.data[0].raw_response
          });
        }
        setOrders(json.data);
      } else {
        console.error('[AppPremiumOrdersList] Failed to fetch orders:', json);
      }
    } catch (error) {
      console.error('[AppPremiumOrdersList] Failed to fetch app premium orders', error);
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

  const fetchTextFile = async (orderId: number, url: string) => {
    // ถ้ามีข้อมูลอยู่แล้ว ไม่ต้องดึงใหม่
    if (textFileContent[orderId]) {
      return;
    }

    setLoadingTextFile(prev => ({ ...prev, [orderId]: true }));
    try {
      // ใช้ API route เป็น proxy เพื่อหลีกเลี่ยง CORS
      const response = await fetch(`/api/app-premium/text-file?url=${encodeURIComponent(url)}`);
      const json = await response.json();
      
      if (!response.ok || !json.ok) {
        throw new Error(json.detail || `HTTP error! status: ${response.status}`);
      }
      
      setTextFileContent(prev => ({ ...prev, [orderId]: json.content }));
    } catch (error) {
      console.error('[AppPremiumOrdersList] Failed to fetch text file:', error);
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลได้', 
        variant: 'destructive' 
      });
      setTextFileContent(prev => ({ ...prev, [orderId]: '' }));
    } finally {
      setLoadingTextFile(prev => ({ ...prev, [orderId]: false }));
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
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {orders.map((order) => {
                const product = order.app_premium_products;
                
                // Extract product data from OTP24HR response format
                // OTP24HR response: { status, name, id, textid, amount, price, total_credit, linkz }
                let productDataTextid = '';
                let productDataLinkz = '';
                let productDataName = '';
                let productDataId = '';
                
                try {
                  const rawResponse = (order as any).raw_response;
                  // ถ้ามี raw_response จาก OTP24HR API
                  if (rawResponse) {
                    productDataTextid = rawResponse.textid || rawResponse.msg || '';
                    productDataLinkz = rawResponse.linkz || rawResponse.linktext || '';
                    productDataName = rawResponse.name || '';
                    productDataId = rawResponse.id || '';
                  }
                  // Fallback ไปที่ product_data ถ้าไม่มี raw_response
                  if (order.product_data) {
                    if (typeof order.product_data === 'object') {
                      productDataTextid = order.product_data.textid || order.product_data.msg || productDataTextid;
                      productDataLinkz = order.product_data.linkz || order.product_data.linktext || productDataLinkz;
                      productDataName = order.product_data.name || productDataName;
                      productDataId = order.product_data.id || productDataId;
                    } else if (typeof order.product_data === 'string') {
                        try {
                        const parsed = JSON.parse(order.product_data);
                        productDataTextid = parsed.textid || parsed.msg || productDataTextid;
                        productDataLinkz = parsed.linkz || parsed.linktext || productDataLinkz;
                        productDataName = parsed.name || productDataName;
                        productDataId = parsed.id || productDataId;
                        } catch {
                        // Ignore parse error
                      }
                    }
                  }
                } catch {
                  // Ignore errors
                }
                
                // ใช้ชื่อจาก product table ก่อน (เพราะมี display_name ที่ถูกต้อง) แล้วค่อย fallback ไปที่ OTP24HR response
                const productName = product?.display_name || product?.name || productDataName || 'N/A';
                // ใช้ id จาก OTP24HR response หรือ fallback ไปที่ reference
                const reference = productDataId || order.reference || order.external_reference || `#${order.id}`;
                
                // ใช้ time จาก OTP24HR response หรือ fallback ไปที่ created_at
                let orderTime = order.created_at;
                let orderPrice = order.price;
                try {
                  const rawResponse = (order as any).raw_response;
                  if (rawResponse?.time) {
                    orderTime = rawResponse.time;
                  } else if (order.product_data && typeof order.product_data === 'object' && order.product_data.time) {
                    orderTime = order.product_data.time;
                  }
                  // ใช้ราคาจาก OTP24HR response ถ้ามี (แต่แสดงราคาที่ชำระจริงในตาราง)
                  // orderPrice ยังคงเป็นราคาที่ชำระจริง (finalPrice)
                } catch {
                  // Ignore errors
                }

                // Debug log for missing product/image
                if (!product) {
                  console.warn(`[AppPremiumOrdersList] Order ${order.id} has no product data`);
                } else if (!product.image_url) {
                  console.warn(`[AppPremiumOrdersList] Order ${order.id} product ${product.id} has no image_url`);
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
                            onError={(e) => {
                              console.error(`[AppPremiumOrdersList] Image load error for order ${order.id}:`, product.image_url);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-white/10 flex items-center justify-center">
                            <Package className="size-6 text-white/30" />
                          </div>
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
                        className="gap-2 border-gray-700 hover:bg-gray-800 text-gray-300"
                      >
                        <Info className="size-4" />
                        ดูข้อมูลสินค้า
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-[color:var(--text)]">{Number(orderPrice).toFixed(2)}</div>
                      <div className="text-xs text-[color:var(--text)]/60">พอยต์</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={getStatusColorClass(order.status)}>
                        {translateStatus(order.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-[color:var(--text)]/80">
                        {orderTime ? new Date(orderTime).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </div>
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
        
        // Extract product data from OTP24HR response format
        let viewingProductDataTextid = '';
        let viewingProductDataLinkz = '';
        let viewingProductDataName = '';
        let viewingProductDataAmount = '';
        let viewingProductDataPrice = '';
        let viewingProductDataTotalCredit = '';
        
        try {
          const rawResponse = (viewingOrder as any).raw_response;
          // ถ้ามี raw_response จาก OTP24HR API
          if (rawResponse) {
            viewingProductDataTextid = rawResponse.textid || rawResponse.msg || '';
            viewingProductDataLinkz = rawResponse.linkz || rawResponse.linktext || '';
            viewingProductDataName = rawResponse.name || '';
            viewingProductDataAmount = rawResponse.amount || '';
            viewingProductDataPrice = rawResponse.price || '';
            viewingProductDataTotalCredit = rawResponse.total_credit || '';
                }
          // Fallback ไปที่ product_data ถ้าไม่มี raw_response
          if (!viewingProductDataTextid && viewingOrder.product_data) {
            if (typeof viewingOrder.product_data === 'object') {
              viewingProductDataTextid = viewingOrder.product_data.textid || viewingOrder.product_data.msg || '';
              viewingProductDataLinkz = viewingOrder.product_data.linkz || viewingOrder.product_data.linktext || '';
              viewingProductDataName = viewingOrder.product_data.name || '';
              viewingProductDataAmount = viewingOrder.product_data.amount || '';
              viewingProductDataPrice = viewingOrder.product_data.price || '';
              viewingProductDataTotalCredit = viewingOrder.product_data.total_credit || '';
            } else if (typeof viewingOrder.product_data === 'string') {
              try {
                const parsed = JSON.parse(viewingOrder.product_data);
                viewingProductDataTextid = parsed.textid || parsed.msg || '';
                viewingProductDataLinkz = parsed.linkz || parsed.linktext || '';
                viewingProductDataName = parsed.name || '';
                viewingProductDataAmount = parsed.amount || '';
                viewingProductDataPrice = parsed.price || '';
                viewingProductDataTotalCredit = parsed.total_credit || '';
              } catch {
                viewingProductDataTextid = viewingOrder.product_data;
              }
            }
          }
        } catch {
          // Ignore errors
        }
        
        // Build download URL for linkz
        // linkz อาจเป็น path เช่น "./logstext/1775617634105601.txt" หรือ full URL
        const downloadUrl = viewingProductDataLinkz 
          ? (viewingProductDataLinkz.startsWith('http') 
              ? viewingProductDataLinkz 
              : viewingProductDataLinkz.startsWith('./')
              ? `https://otp24hr.com/${viewingProductDataLinkz.replace('./', '')}`
              : `https://otp24hr.com${viewingProductDataLinkz.startsWith('/') ? '' : '/'}${viewingProductDataLinkz}`)
          : null;
        
        return (
          <Dialog open={viewingProductDataOrderId !== null} onOpenChange={(open) => {
            if (!open) {
              setViewingProductDataOrderId(null);
              // Reset text file content when closing dialog
              setTextFileContent(prev => {
                const newState = { ...prev };
                delete newState[viewingOrder.id];
                return newState;
              });
            }
          }}>
            <DialogContent className="max-w-3xl max-h-[80vh] bg-black/90 backdrop-blur-sm border-purple-500/20">
              <DialogHeader>
                <DialogTitle className="text-xl text-white">ข้อมูลสินค้า</DialogTitle>
                <div 
                  className="text-sm text-white/60"
                  dangerouslySetInnerHTML={{ 
                    __html: viewingProductDataName || viewingProductName || ''
                  }}
                  suppressHydrationWarning
                />
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Product Info */}
                {viewingProductDataAmount && (
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-white/60">จำนวน:</span>
                    <span className="font-medium text-white">{viewingProductDataAmount} ชิ้น</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-white/60">ราคาที่ชำระ:</span>
                  <span className="font-medium text-white">{Number(viewingOrder.price).toFixed(2)} พอยต์</span>
                </div>
                
                {/* Text ID (with HTML support) */}
                {viewingProductDataTextid && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white">รายละเอียดสินค้า:</p>
                    <div 
                      className="p-4 rounded-lg bg-black/40 border border-white/10 text-sm text-white/90 overflow-x-auto break-words leading-relaxed prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: viewingProductDataTextid
                      }}
                      suppressHydrationWarning
                    />
                  </div>
                )}
                
                {/* Text File Content */}
                {downloadUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">ไฟล์ข้อมูล:</p>
                      {!textFileContent[viewingOrder.id] && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchTextFile(viewingOrder.id, downloadUrl)}
                          disabled={loadingTextFile[viewingOrder.id]}
                          className="gap-2 border-gray-700 hover:bg-gray-800 text-gray-300"
                        >
                          {loadingTextFile[viewingOrder.id] ? (
                            <>
                              <Spinner className="size-4" />
                              กำลังโหลด...
                            </>
                          ) : (
                            <>
                              <Info className="size-4" />
                              ดูข้อมูล
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {textFileContent[viewingOrder.id] && (
                      <div 
                        className="p-4 rounded-lg bg-black/40 border border-white/10 text-sm text-white/90 overflow-x-auto break-words leading-relaxed prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: textFileContent[viewingOrder.id]
                        }}
                        suppressHydrationWarning
                      />
                    )}
                  </div>
                )}
                
                {!viewingProductDataTextid && !downloadUrl && (
                  <div className="p-4 rounded-lg bg-black/40 border border-white/10 text-sm text-white/60 text-center">
                    ไม่มีข้อมูลสินค้า
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}

