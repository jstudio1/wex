'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Users } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type SocialOrder = {
  id: number;
  external_order_id: string | null;
  link: string;
  quantity: number;
  price: number;
  status: string | null;
  charge: number | null;
  start_count: number | null;
  remains: number | null;
  created_at: string;
  updated_at: string;
  social_services: {
    id: number;
    display_name: string | null;
    name: string;
  } | null;
  social_providers: {
    id: number;
    name: string;
  } | null;
};

function translateStatus(status: string | null): string {
  if (!status) return 'ไม่ทราบสถานะ';
  const map: Record<string, string> = {
    'pending': 'รอดำเนินการ',
    'processing': 'กำลังดำเนินการ',
    'completed': 'สำเร็จ',
    'partial': 'บางส่วน',
    'cancelled': 'ยกเลิก',
    'failed': 'ล้มเหลว'
  };
  return map[status.toLowerCase()] || status;
}

function getStatusColorClass(status: string | null): string {
  if (!status) return 'bg-white/10 text-[color:var(--text)]/70 border-white/20';
  const statusLower = status.toLowerCase();
  if (statusLower === 'completed') {
    return 'bg-emerald-600/30 text-emerald-300 border-emerald-500/30';
  } else if (statusLower === 'pending') {
    return 'bg-amber-600/30 text-amber-300 border-amber-500/30';
  } else if (statusLower === 'failed' || statusLower === 'cancelled') {
    return 'bg-red-600/30 text-red-300 border-red-500/30';
  } else if (statusLower === 'processing' || statusLower === 'partial') {
    return 'bg-blue-600/30 text-blue-300 border-blue-500/30';
  }
  return 'bg-white/10 text-[color:var(--text)]/70 border-white/20';
}

export default function SocialOrdersList() {
  const [orders, setOrders] = useState<SocialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasAutoRefreshed, setHasAutoRefreshed] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/social/orders');
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

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    const orderIds = orders
      .filter((o) => o.external_order_id)
      .map((o) => o.external_order_id!);

    if (orderIds.length === 0) {
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetch('/api/social/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: orderIds })
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

  // Initial fetch และดึงสถานะอัตโนมัติเมื่อเปิดดูประวัติ
  useEffect(() => {
    const loadAndRefresh = async () => {
      // 1. โหลด orders ก่อน
      await fetchOrders();
      
      // 2. รอสักครู่ให้ orders state อัพเดทแล้วค่อยดึงสถานะ
      setTimeout(async () => {
        const res = await fetch('/api/social/orders');
        const json = await res.json();
        
        if (json.ok && json.data && json.data.length > 0 && !hasAutoRefreshed) {
          const orderIds = json.data
            .filter((o: SocialOrder) => o.external_order_id)
            .map((o: SocialOrder) => o.external_order_id!);
          
          if (orderIds.length > 0) {
            try {
              await fetch('/api/social/orders/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_ids: orderIds })
              });
              // ดึง orders ใหม่หลังจากอัพเดทสถานะ
              await fetchOrders();
              setHasAutoRefreshed(true);
            } catch (err) {
              console.error('Auto-refresh status failed', err);
            }
          }
        }
      }, 500);
    };
    
    loadAndRefresh();
  }, []); // Run once when component mounts

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">บริการ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">Order ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">ลิงค์</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">จำนวน</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">ราคา</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">สถานะ</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">เริ่มต้น</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">คงเหลือ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">วันที่สร้าง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-24 mx-auto rounded" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
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
            <Users className="size-6" />
          </EmptyMedia>
          <EmptyTitle>ยังไม่มีคำสั่งซื้อปั้มโซเชียล</EmptyTitle>
          <EmptyDescription>
            คำสั่งซื้อปั้มโซเชียลจะแสดงที่นี่เมื่อมีการสั่งซื้อ
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/social'}>
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

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">บริการ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">Order ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">ลิงค์</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">จำนวน</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">ราคา</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">เริ่มต้น</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">คงเหลือ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">วันที่สร้าง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {orders.map((order) => {
                const service = order.social_services;
                return (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[color:var(--text)] truncate max-w-xs" title={service?.display_name || service?.name || 'บริการ'}>
                        {service?.display_name || service?.name || 'บริการ'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-[color:var(--text)]/70">{order.external_order_id || order.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={order.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline text-sm truncate block max-w-xs"
                        title={order.link}
                      >
                        {order.link}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-[color:var(--text)]/80 whitespace-nowrap">
                      {order.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-[color:var(--text)]/80 whitespace-nowrap">
                      {Number(order.price).toLocaleString()} ฿
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded border inline-block ${getStatusColorClass(order.status)}`}>
                        {translateStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[color:var(--text)]/70 text-sm whitespace-nowrap">
                      {order.start_count !== null ? Number(order.start_count).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-[color:var(--text)]/70 text-sm whitespace-nowrap">
                      {order.remains !== null ? Number(order.remains).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--text)]/60 text-sm whitespace-nowrap">
                      {new Date(order.created_at).toLocaleString('th-TH')}
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

