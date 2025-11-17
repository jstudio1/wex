'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, CreditCard, RefreshCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type CashcardOrder = {
  id: number;
  reference: string;
  product_data: any;
  price: number;
  status: string;
  created_at: string;
  updated_at: string;
  cashcard_products: {
    id: number;
    display_name: string | null;
    name: string;
    image_url: string | null;
    category: string | null;
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
  } else if (statusLower === 'processing') {
    return 'bg-blue-600/30 text-blue-300 border-blue-500/30';
  }
  return 'bg-white/10 text-[color:var(--text)]/70 border-white/20';
}

export default function CashcardOrdersList() {
  const toast = useToast();
  const [orders, setOrders] = useState<CashcardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<Record<string, boolean>>({});

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
      const res = await fetch('/api/cashcard/orders');
      const json = await res.json();
      if (json.ok && json.data) {
        setOrders(json.data);
      } else {
        console.error('Failed to fetch orders:', json);
      }
    } catch (error) {
      console.error('Failed to fetch cashcard orders', error);
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">สถานะ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">วันที่</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <Skeleton className="h-16 w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-6 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
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
            <CreditCard className="size-6" />
          </EmptyMedia>
          <EmptyTitle>ยังไม่มีประวัติการซื้อบัตรเติมเงิน</EmptyTitle>
          <EmptyDescription>
            ประวัติการซื้อบัตรเติมเงินจะแสดงที่นี่เมื่อมีการสั่งซื้อ
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/cashcard'}>
            <RefreshCcw className="size-4" />
            ไปดูบัตรเติมเงิน
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const currencyFormatter = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  });

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

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
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">สถานะ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">วันที่</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const productName = order.cashcard_products?.display_name || order.cashcard_products?.name || 'ไม่ทราบชื่อสินค้า';
                const productImage = order.cashcard_products?.image_url;
                const productCategory = order.cashcard_products?.category;
                
                // Display product_data if available
                const productDataDisplay = order.product_data 
                  ? (typeof order.product_data === 'string' ? JSON.parse(order.product_data) : order.product_data)
                  : null;

                return (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {productImage && (
                          <div className="h-16 w-16 rounded overflow-hidden bg-white/5 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-[color:var(--text)] truncate">{productName}</div>
                          {productCategory && (
                            <div className="text-xs text-[color:var(--text)]/50">{productCategory}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-[color:var(--text)]/70">
                          {order.reference}
                        </span>
                        <button
                          onClick={() => copyToClipboard(order.reference, `ref-${order.id}`)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title="คัดลอก"
                        >
                          {copied[`ref-${order.id}`] ? (
                            <Check className="size-4 text-green-400" />
                          ) : (
                            <Copy className="size-4 text-[color:var(--text)]/50" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {productDataDisplay ? (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-[color:var(--text)]/70 hover:text-[color:var(--text)]">
                            ดูข้อมูลสินค้า
                          </summary>
                          <div className="mt-2 p-3 rounded bg-black/40 border border-white/10">
                            <pre className="text-xs text-[color:var(--text)]/80 whitespace-pre-wrap break-words">
                              {JSON.stringify(productDataDisplay, null, 2)}
                            </pre>
                          </div>
                        </details>
                      ) : order.status === 'pending' ? (
                        <span className="text-sm text-[color:var(--text)]/50">รอการดำเนินการ...</span>
                      ) : (
                        <span className="text-sm text-[color:var(--text)]/50">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-semibold text-[color:var(--text)]">
                        {currencyFormatter.format(order.price)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColorClass(order.status)}>
                        {translateStatus(order.status)}
                      </Badge>
                      {order.status === 'pending' && (
                        <div className="text-xs text-[color:var(--text)]/50 mt-1">
                          โปรดรอ 1-2 นาที
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-[color:var(--text)]/70">
                        {formatDate(order.created_at)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

