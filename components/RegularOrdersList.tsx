'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShoppingCart, History, Check, Loader2, XCircle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type Order = {
  transaction_id: string;
  product_id: number;
  created_at: string;
  updated_at?: string | null;
  finished_at?: string | null;
  state: string;
  result_code?: string | null;
  price: number;
  input_json?: Record<string, any> | null;
  product: {
    id: number;
    name: string;
    image_url: string | null;
    key: string;
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
  return map[state] || state;
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

export default function RegularOrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineOrder, setTimelineOrder] = useState<Order | null>(null);
  const [timelineItems, setTimelineItems] = useState<{ state: string | null; message: string | null; created_at: string }[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.ok && json.data) {
        setOrders(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch และดึงสถานะอัตโนมัติเมื่อเปิดดูประวัติ
  useEffect(() => {
    const loadAndRefresh = async () => {
      // 1. โหลด orders ก่อน
      await fetchOrders();
      
      // 2. รอสักครู่แล้วดึงสถานะล่าสุด
      setTimeout(async () => {
        try {
          const res = await fetch('/api/orders');
          const json = await res.json();
          
          if (json.ok && json.data && json.data.length > 0) {
            const transactionIds = json.data
              .map((o: Order) => o.transaction_id);
            
            if (transactionIds.length > 0) {
              try {
                await fetch('/api/orders/status', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ transaction_ids: transactionIds })
                });
                // ดึง orders ใหม่หลังจากอัพเดทสถานะ
                await fetchOrders();
              } catch (err) {
                console.error('Auto-refresh status failed', err);
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch orders for refresh', err);
        }
      }, 500);
    };
    
    loadAndRefresh();
  }, []); // Run once when component mounts (เมื่อ user เปิดดูประวัติ)

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    const transactionIds = orders.map((o) => o.transaction_id);

    if (transactionIds.length === 0) {
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetch('/api/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_ids: transactionIds })
      });
      const json = await res.json();
      if (json.ok) {
        await fetchOrders();
      }
    } catch (error) {
      console.error('Failed to refresh status', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card flex items-center gap-4 p-3">
              <Skeleton className="h-16 w-16 rounded" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20 rounded" />
                </div>
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingCart className="size-6" />
          </EmptyMedia>
          <EmptyTitle>ยังไม่มีคำสั่งซื้อเติมเกม</EmptyTitle>
          <EmptyDescription>
            คำสั่งซื้อเติมเกมจะแสดงที่นี่เมื่อมีการสั่งซื้อ
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/products'}>
            <RefreshCw className="size-4" />
            ไปสั่งซื้อ
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[color:var(--text)]/60">กดรีเฟรชเพื่ออัปเดตสถานะล่าสุด</p>
        <Button onClick={handleRefreshStatus} disabled={refreshing} variant="outline" size="sm" className="gap-2">
          {refreshing ? (
            <>
              <Spinner className="size-4" />
              กำลังอัปเดต...
            </>
          ) : (
            <>
              <RefreshCw className="size-4" />
              อัปเดตสถานะ
            </>
          )}
        </Button>
      </div>
      <div className="card p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              <TableHead>บริการ</TableHead>
              <TableHead>ข้อมูลที่ส่ง</TableHead>
              <TableHead className="text-right">ราคา</TableHead>
              <TableHead className="text-right">สถานะ</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const prod = order.product;
              const inputs = order.input_json || {};
              const entries = Object.entries(inputs).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
              return (
                <TableRow key={order.transaction_id}>
                  <TableCell className="whitespace-nowrap text-[color:var(--text)]/80">{new Date(order.created_at).toLocaleString()}</TableCell>
                  <TableCell className="min-w-[160px]">
                    <div className="flex items-center gap-3">
                      {prod?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={prod.image_url} alt={prod?.name || 'บริการ'} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-white/10" />
                      )}
                      <div className="truncate font-medium">{prod?.name || 'บริการ'}</div>
                    </div>
                    <div className="mt-1 text-[10px] text-[color:var(--text)]/50">TX: {order.transaction_id}</div>
                  </TableCell>
                  <TableCell className="max-w-[380px]">
                    {entries.length === 0 ? (
                      <span className="text-xs text-[color:var(--text)]/50">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {entries.map(([k, v]) => {
                          const keyLabel = (k || '').toString().toUpperCase();
                          const prettyLabel = keyLabel === 'UID' ? 'UID' : keyLabel.replace(/_/g, ' ');
                          return (
                            <Badge key={k} variant="secondary" className="whitespace-nowrap">
                              {prettyLabel}: <span className="ml-1 text-white">{String(v)}</span>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{Number(order.price ?? 0).toLocaleString()} ฿</TableCell>
                  <TableCell className="text-right">
                    <span className={`text-xs px-2 py-1 rounded border ${getStateColorClass(order.state)}`}>
                      {translateState(order.state)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      aria-label="Timeline"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10"
                      onClick={async () => {
                        setTimelineOrder(order);
                        setTimelineItems(null);
                        setTimelineLoading(true);
                        setTimelineOpen(true);
                        try {
                          const res = await fetch(`/api/orders/timeline?tx=${encodeURIComponent(order.transaction_id)}`);
                          const json = await res.json();
                          if (res.ok && json.data) setTimelineItems(json.data);
                        } finally {
                          setTimelineLoading(false);
                        }
                      }}
                    >
                      <History className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Timeline Dialog */}
      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Timeline</DialogTitle>
          </DialogHeader>
          {timelineOrder && (
            <div className="space-y-4">
              <div className="text-xs text-[color:var(--text)]/60">ลำดับการดำเนินการของคำสั่งซื้อ</div>
              <div className="space-y-3">
                {timelineLoading && <div className="text-sm text-[color:var(--text)]/70">กำลังโหลดไทม์ไลน์...</div>}
                {!timelineLoading && timelineItems && timelineItems.map((it, idx) => {
                  const st = (it.state || '').toLowerCase();
                  const Icon = st === 'completed' || st === 'success' ? Check : st === 'failed' || st === 'cancelled' ? XCircle : st === 'processing' || st === 'confirming' ? Loader2 : Clock;
                  const label = st === 'pending' ? 'รอดำเนินการ' : st === 'processing' || st === 'confirming' ? 'กำลังดำเนินการ' : st === 'completed' || st === 'success' ? 'สำเร็จ' : translateState(st);
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <Icon className={`mt-0.5 size-4 ${st === 'completed' || st === 'success' ? 'text-emerald-400' : st === 'failed' || st === 'cancelled' ? 'text-red-400' : 'text-white/70'}`} />
                      <div>
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-[color:var(--text)]/70">{new Date(it.created_at).toLocaleString()}</div>
                        {it.message && <div className="text-xs text-[color:var(--text)]/60">{it.message}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

