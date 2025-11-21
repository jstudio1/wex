'use client';

import { useEffect, useState, useMemo } from 'react';
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
  return map[state] || state;
}

function getStateColorClass(state: string): string {
  const stateLower = state.toLowerCase();
  if (stateLower === 'success' || stateLower === 'completed') {
    return 'bg-green-600 text-white border-green-700 shadow-sm';
  } else if (stateLower === 'pending') {
    return 'bg-yellow-500 text-white border-yellow-600 shadow-sm';
  } else if (stateLower === 'failed') {
    return 'bg-red-600 text-white border-red-700 shadow-sm';
  } else if (stateLower === 'cancelled') {
    return 'bg-gray-600 text-white border-gray-700 shadow-sm';
  } else if (stateLower === 'processing' || stateLower === 'confirming') {
    return 'bg-blue-600 text-white border-blue-700 shadow-sm';
  } else if (stateLower === 'refunded') {
    return 'bg-orange-600 text-white border-orange-700 shadow-sm';
  }
  return 'bg-gray-500 text-white border-gray-600';
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
      const res = await fetch('/api/orders?product_type=gtopup');
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

  useEffect(() => {
    const loadAndRefresh = async () => {
      await fetchOrders();
      
      setTimeout(async () => {
        try {
          const res = await fetch('/api/orders?product_type=gtopup');
          const json = await res.json();
          
          if (json.ok && json.data && json.data.length > 0) {
            const transactionIds = json.data.map((o: Order) => o.transaction_id);
            
            if (transactionIds.length > 0) {
              try {
                await fetch('/api/orders/status', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ transaction_ids: transactionIds })
                });
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
  }, []);

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

  // Sort orders by created_at descending (newest first), then by transaction_id for stability
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aCreated = new Date(a.created_at || 0).getTime();
      const bCreated = new Date(b.created_at || 0).getTime();
      if (bCreated !== aCreated) {
        return bCreated - aCreated;
      }
      // Use transaction_id as secondary sort for stability
      return (b.transaction_id || '').localeCompare(a.transaction_id || '');
    });
  }, [orders]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingCart className="h-12 w-12 text-gray-500" />
          </EmptyMedia>
          <EmptyTitle className="text-white">ยังไม่มีคำสั่งซื้อเติมเกม</EmptyTitle>
          <EmptyDescription className="text-gray-400">
            คำสั่งซื้อเติมเกมจะแสดงที่นี่เมื่อมีการสั่งซื้อ
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/products'} className="border-gray-700 hover:bg-gray-800 text-gray-300">
            <RefreshCw className="h-4 w-4" />
            ไปสั่งซื้อ
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">กดรีเฟรชเพื่ออัปเดตสถานะล่าสุด</p>
        <Button onClick={handleRefreshStatus} disabled={refreshing} variant="outline" size="sm" className="gap-2 border-gray-700 hover:bg-gray-800 text-gray-300">
          {refreshing ? (
            <>
              <Spinner className="h-4 w-4" />
              กำลังอัปเดต...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              อัปเดตสถานะ
            </>
          )}
        </Button>
      </div>
      
      <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-900/50 hover:bg-gray-900/50">
              <TableHead className="text-white font-semibold">วันที่</TableHead>
              <TableHead className="text-white font-semibold">บริการ</TableHead>
              <TableHead className="text-white font-semibold">รายละเอียดไอดี</TableHead>
              <TableHead className="text-right text-white font-semibold">ราคา</TableHead>
              <TableHead className="text-right text-white font-semibold">สถานะ</TableHead>
              <TableHead className="text-right text-white font-semibold"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => {
              const prod = order.product;
              const inputs = order.input_json || {};
              const entries = Object.entries(inputs).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
              return (
                <TableRow key={order.transaction_id} className="hover:bg-gray-900/30">
                  <TableCell className="whitespace-nowrap text-gray-300">{new Date(order.created_at).toLocaleString('th-TH')}</TableCell>
                  <TableCell className="min-w-[160px]">
                    <div className="flex items-center gap-3">
                      {prod?.image_url ? (
                        <img src={prod.image_url} alt={prod?.name || 'บริการ'} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-800" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-white">{prod?.name || 'บริการ'}</div>
                        {order.item?.name && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate">{order.item.name}</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-500">TX: {order.transaction_id}</div>
                  </TableCell>
                  <TableCell className="max-w-[380px]">
                    {entries.length === 0 ? (
                      <span className="text-xs text-gray-500">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {entries.map(([k, v]) => {
                          const keyLabel = (k || '').toString().toUpperCase();
                          const prettyLabel = keyLabel === 'UID' ? 'UID' : keyLabel.replace(/_/g, ' ');
                          return (
                            <Badge key={k} variant="secondary" className="bg-blue-900/30 text-blue-300 border-blue-700">
                              {prettyLabel}: <span className="ml-1 font-semibold">{String(v)}</span>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-white">{Number(order.price ?? 0).toLocaleString()} ฿</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={getStateColorClass(order.state)}>
                      {translateState(order.state)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      aria-label="Timeline"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 bg-[#0a0a0a] hover:bg-gray-800 transition-colors"
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
                      <History className="h-4 w-4 text-gray-300" />
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
        <DialogContent className="max-w-md bg-[#0a0a0a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Order Timeline</DialogTitle>
          </DialogHeader>
          {timelineOrder && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400">ลำดับการดำเนินการของคำสั่งซื้อ</div>
              <div className="space-y-3">
                {timelineLoading && <div className="text-sm text-gray-400">กำลังโหลดไทม์ไลน์...</div>}
                {!timelineLoading && timelineItems && timelineItems.map((it, idx) => {
                  const st = (it.state || '').toLowerCase();
                  const Icon = st === 'completed' || st === 'success' ? Check : st === 'failed' || st === 'cancelled' ? XCircle : st === 'processing' || st === 'confirming' ? Loader2 : Clock;
                  const label = st === 'pending' ? 'รอดำเนินการ' : st === 'processing' || st === 'confirming' ? 'กำลังดำเนินการ' : st === 'completed' || st === 'success' ? 'สำเร็จ' : translateState(st);
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <Icon className={`mt-0.5 h-4 w-4 ${st === 'completed' || st === 'success' ? 'text-green-500' : st === 'failed' || st === 'cancelled' ? 'text-red-500' : 'text-gray-500'}`} />
                      <div>
                        <div className="font-medium text-white">{label}</div>
                        <div className="text-xs text-gray-400">{new Date(it.created_at).toLocaleString('th-TH')}</div>
                        {it.message && <div className="text-xs text-gray-300 mt-1">{it.message}</div>}
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
