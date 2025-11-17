'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Copy, Check, Gamepad2, RefreshCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type GameAccountOrder = {
  id: number;
  transaction_id: string;
  game_account_id: number;
  price: number;
  state: string;
  username: string;
  password: string;
  created_at: string;
  updated_at: string;
  game_accounts: {
    id: number;
    game_name: string;
    title: string;
    cover_image_url: string | null;
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

export default function GameAccountsOrdersList() {
  const toast = useToast();
  const [orders, setOrders] = useState<GameAccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
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
      const res = await fetch('/api/game-accounts/orders');
      const json = await res.json();
      console.log('Game accounts orders response:', json);
      if (json.ok && json.data) {
        setOrders(json.data);
      } else {
        console.error('Failed to fetch orders:', json);
      }
    } catch (error) {
      console.error('Failed to fetch game account orders', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = (orderId: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">เกม</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">Transaction ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">Password</th>
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
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
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
            <Gamepad2 className="size-6" />
          </EmptyMedia>
          <EmptyTitle>ยังไม่มีออเดอร์ซื้อไอดีเกม</EmptyTitle>
          <EmptyDescription>
            คำสั่งซื้อไอดีเกมจะแสดงที่นี่เมื่อมีการสั่งซื้อ
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/accounts'}>
            <RefreshCcw className="size-4" />
            ไปดูไอดีเกม
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">เกม</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">Transaction ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">Username</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90">Password</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">ราคา</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">วันที่สร้าง</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90">ดูไอดี</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {order.game_accounts?.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={order.game_accounts.cover_image_url}
                          alt={order.game_accounts.title}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-white/10" />
                      )}
                      <div>
                        <div className="font-medium text-[color:var(--text)]">{order.game_accounts?.game_name || 'N/A'}</div>
                        <div className="text-xs text-[color:var(--text)]/60">{order.game_accounts?.title || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm text-[color:var(--text)]/80">{order.transaction_id}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-[color:var(--text)]/90">{order.username}</code>
                      <button
                        onClick={() => copyToClipboard(order.username, `username-${order.id}`)}
                        className="text-[color:var(--text)]/60 hover:text-[color:var(--text)] transition-colors"
                        title="คัดลอก"
                      >
                        {copied[`username-${order.id}`] ? (
                          <Check className="size-4 text-green-400" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-[color:var(--text)]/90">
                        {showPasswords[order.id] ? order.password : '••••••••'}
                      </code>
                      <button
                        onClick={() => togglePassword(order.id)}
                        className="text-[color:var(--text)]/60 hover:text-[color:var(--text)] transition-colors"
                        title={showPasswords[order.id] ? 'ซ่อน' : 'แสดง'}
                      >
                        {showPasswords[order.id] ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(order.password, `password-${order.id}`)}
                        className="text-[color:var(--text)]/60 hover:text-[color:var(--text)] transition-colors"
                        title="คัดลอก"
                      >
                        {copied[`password-${order.id}`] ? (
                          <Check className="size-4 text-green-400" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold text-[color:var(--text)]">{Number(order.price).toFixed(2)}</div>
                    <div className="text-xs text-[color:var(--text)]/60">พอยต์</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={getStateColorClass(order.state)}>
                      {translateState(order.state)}
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
                    {order.game_account_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open(`/accounts/${order.game_account_id}`, '_blank');
                        }}
                      >
                        <Eye className="size-4 mr-2" />
                        ดูไอดี
                      </Button>
                    )}
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

