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

export default function MtopupOrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineOrder, setTimelineOrder] = useState<Order | null>(null);
  const [timelineItems, setTimelineItems] = useState<{ state: string | null; message: string | null; created_at: string }[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/mtopup/orders');
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
          const res = await fetch('/api/mtopup/orders');
          const json = await res.json();
          if (json.ok && json.data) {
            setOrders(json.data);
          }
        } catch (error) {
          console.error('Failed to refresh orders', error);
        }
      }, 3000);
    };
    loadAndRefresh();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
  };

  const fetchTimeline = async (order: Order) => {
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/orders/status?transaction_id=${encodeURIComponent(order.transaction_id)}`);
      const json = await res.json();
      if (json.ok && json.logs) {
        setTimelineItems(json.logs);
      } else {
        setTimelineItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch timeline', error);
      setTimelineItems([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleViewTimeline = (order: Order) => {
    setTimelineOrder(order);
    setTimelineOpen(true);
    fetchTimeline(order);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>สินค้า</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-16 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <ShoppingCart className="size-6" />
          </EmptyMedia>
          <EmptyTitle>ยังไม่มีประวัติการเติมเงินมือถือ</EmptyTitle>
          <EmptyDescription>
            ประวัติการเติมเงินมือถือจะแสดงที่นี่เมื่อมีการสั่งซื้อ
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/mtopup'}>
            <RefreshCw className="size-4" />
            ไปดูบริการเติมเงินมือถือ
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">ประวัติการเติมเงินมือถือ</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Spinner className="size-4 mr-2" />
          ) : (
            <RefreshCw className="size-4 mr-2" />
          )}
          รีเฟรช
        </Button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>สินค้า</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>เบอร์โทร</TableHead>
                <TableHead className="text-right">ราคา</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.transaction_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {order.product?.image_url && (
                        <div className="h-16 w-16 rounded overflow-hidden bg-white/5 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={order.product.image_url} alt={order.product.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{order.product?.name || 'ไม่ทราบชื่อสินค้า'}</div>
                        {order.item?.name && (
                          <div className="text-sm text-gray-300 mt-0.5 truncate">{order.item.name}</div>
                        )}
                        {order.product?.key && (
                          <div className="text-xs text-gray-400 mt-0.5">{order.product.key}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono text-gray-300">{order.transaction_id}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-300">
                      {order.input_json?.phone_number || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-semibold text-white">
                      {formatCurrency(order.price)} ฿
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStateColorClass(order.state)}>
                      {translateState(order.state)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-300">
                      {formatDate(order.created_at)}
                    </div>
                    {order.finished_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        เสร็จ: {formatDate(order.finished_at)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewTimeline(order)}
                    >
                      <History className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0a0a] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Timeline: {timelineOrder?.transaction_id}</DialogTitle>
          </DialogHeader>
          {timelineLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : (
            <div className="space-y-4">
              {timelineItems && timelineItems.length > 0 ? (
                timelineItems.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        item.state === 'completed' || item.state === 'success' ? 'bg-green-500' :
                        item.state === 'failed' ? 'bg-red-500' :
                        item.state === 'processing' || item.state === 'confirming' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`} />
                      {idx < timelineItems.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-700 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="text-sm font-medium text-white">{item.message || item.state || '—'}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatDate(item.created_at)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">ไม่มีข้อมูล timeline</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

