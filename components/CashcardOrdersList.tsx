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
  transaction_id: string;
  product_id: number;
  created_at: string;
  updated_at?: string | null;
  finished_at?: string | null;
  state: string;
  result_code?: string | null;
  price: number;
  input_json?: Record<string, any> | null;
  output_json?: Record<string, any> | null;
  product: {
    id: number;
    name: string;
    image_url: string | null;
    key: string;
  } | null;
  item: {
    id: number;
    name: string;
    sku: string;
  } | null;
};

function translateState(state: string): string {
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
  return map[state.toLowerCase()] || state;
}

function getStateColorClass(state: string): string {
  const stateLower = state.toLowerCase();
  if (stateLower === 'success' || stateLower === 'completed') {
    return 'bg-emerald-600/30 text-emerald-300 border-emerald-500/30';
  } else if (stateLower === 'pending') {
    return 'bg-amber-600/30 text-amber-300 border-amber-500/30';
  } else if (stateLower === 'failed') {
    return 'bg-red-600/30 text-red-300 border-red-500/30';
  } else if (stateLower === 'cancelled') {
    return 'bg-slate-600/30 text-slate-300 border-slate-500/30';
  } else if (stateLower === 'processing' || stateLower === 'confirming') {
    return 'bg-blue-600/30 text-blue-300 border-blue-500/30';
  } else if (stateLower === 'refunded') {
    return 'bg-orange-600/30 text-orange-300 border-orange-500/30';
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
      const res = await fetch('/api/cashcard/wepay/orders');
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">Transaction ID</th>
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">Transaction ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">ข้อมูลสินค้า</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90">ราคา</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">สถานะ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">วันที่</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const productName = order.product?.name || 'ไม่ทราบชื่อสินค้า';
                const productImage = order.product?.image_url;

                return (
                  <tr key={order.transaction_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
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
                          {order.item?.name && (
                            <div className="text-sm text-[color:var(--text)]/70 mt-0.5 truncate">{order.item.name}</div>
                          )}
                          {order.product?.key && (
                            <div className="text-xs text-[color:var(--text)]/50 mt-0.5">{order.product.key}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-[color:var(--text)]/70">
                          {order.transaction_id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(order.transaction_id, `ref-${order.transaction_id}`)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title="คัดลอก"
                        >
                          {copied[`ref-${order.transaction_id}`] ? (
                            <Check className="size-4 text-green-400" />
                          ) : (
                            <Copy className="size-4 text-[color:var(--text)]/50" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {order.state === 'pending' || order.state === 'processing' ? (
                        <span className="text-sm text-[color:var(--text)]/50">รอการดำเนินการ...</span>
                      ) : order.output_json && (order.state === 'completed' || order.state === 'success') ? (
                        <div className="space-y-2">
                          {/* แสดง PIN เป็นรหัสบัตร (PIN คือรหัสบัตรที่ต้องใช้) */}
                          {order.output_json && (order.output_json.card_pin || order.output_json.pin || order.output_json.password) && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[color:var(--text)]/50">รหัสบัตร:</span>
                              <span className="text-sm font-mono text-[color:var(--text)] bg-white/5 px-2 py-1 rounded">
                                {order.output_json.card_pin || order.output_json.pin || order.output_json.password}
                              </span>
                              <button
                                onClick={() => copyToClipboard(
                                  order.output_json?.card_pin || order.output_json?.pin || order.output_json?.password || '',
                                  `code-${order.transaction_id}`
                                )}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                title="คัดลอกรหัสบัตร"
                              >
                                {copied[`code-${order.transaction_id}`] ? (
                                  <Check className="size-4 text-green-400" />
                                ) : (
                                  <Copy className="size-4 text-[color:var(--text)]/50" />
                                )}
                              </button>
                            </div>
                          )}
                          {/* ถ้าไม่มี PIN ให้แสดง output อื่นๆ (ยกเว้น serial) */}
                          {order.output_json && !order.output_json.card_pin && !order.output_json.pin && !order.output_json.password && (
                            <div className="space-y-1">
                              {Object.entries(order.output_json)
                                .filter(([key]) => key !== 'serial' && key !== 'card_code' && key !== 'serial_no')
                                .map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="text-xs text-[color:var(--text)]/50 capitalize">{key}:</span>
                                    <span className="text-sm font-mono text-[color:var(--text)] bg-white/5 px-2 py-1 rounded">
                                      {String(value)}
                                    </span>
                                    <button
                                      onClick={() => copyToClipboard(String(value), `${key}-${order.transaction_id}`)}
                                      className="p-1 hover:bg-white/10 rounded transition-colors"
                                      title="คัดลอก"
                                    >
                                      {copied[`${key}-${order.transaction_id}`] ? (
                                        <Check className="size-4 text-green-400" />
                                      ) : (
                                        <Copy className="size-4 text-[color:var(--text)]/50" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
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
                      <Badge className={getStateColorClass(order.state)}>
                        {translateState(order.state)}
                      </Badge>
                      {(order.state === 'pending' || order.state === 'processing') && (
                        <div className="text-xs text-[color:var(--text)]/50 mt-1">
                          กำลังดำเนินการ
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-[color:var(--text)]/70">
                        {formatDate(order.created_at)}
                      </div>
                      {order.finished_at && (
                        <div className="text-xs text-[color:var(--text)]/50 mt-1">
                          เสร็จ: {formatDate(order.finished_at)}
                        </div>
                      )}
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

