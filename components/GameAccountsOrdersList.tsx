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

export default function GameAccountsOrdersList() {
  const toast = useToast();
  const [orders, setOrders] = useState<GameAccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchOrders();
  }, []);

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
      if (json.ok && json.data) {
        setOrders(json.data);
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
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">เกม</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Transaction ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Password</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">ราคา</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">สถานะ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">วันที่สร้าง</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ดูไอดี</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-24 mx-auto rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-20 mx-auto" /></td>
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
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Gamepad2 className="h-12 w-12 text-gray-400" />
          </EmptyMedia>
          <EmptyTitle className="text-gray-900">ยังไม่มีออเดอร์ซื้อไอดีเกม</EmptyTitle>
          <EmptyDescription className="text-gray-600">
            คำสั่งซื้อไอดีเกมจะแสดงที่นี่เมื่อมีการสั่งซื้อ
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/accounts'}>
            <RefreshCcw className="h-4 w-4" />
            ไปดูไอดีเกม
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">เกม</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Transaction ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Username</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Password</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">ราคา</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">วันที่สร้าง</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ดูไอดี</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {order.game_accounts?.cover_image_url ? (
                        <img
                          src={order.game_accounts.cover_image_url}
                          alt={order.game_accounts.title}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-gray-100" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{order.game_accounts?.game_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{order.game_accounts?.title || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{order.transaction_id}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-gray-900 bg-blue-50 px-2 py-1 rounded font-medium">{order.username}</code>
                      <button
                        onClick={() => copyToClipboard(order.username, `username-${order.id}`)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        title="คัดลอก"
                      >
                        {copied[`username-${order.id}`] ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-gray-900 bg-pink-50 px-2 py-1 rounded font-medium">
                        {showPasswords[order.id] ? order.password : '••••••••'}
                      </code>
                      <button
                        onClick={() => togglePassword(order.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        title={showPasswords[order.id] ? 'ซ่อน' : 'แสดง'}
                      >
                        {showPasswords[order.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(order.password, `password-${order.id}`)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        title="คัดลอก"
                      >
                        {copied[`password-${order.id}`] ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold text-gray-900">{Number(order.price).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">พอยต์</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={getStateColorClass(order.state)}>
                      {translateState(order.state)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600">
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
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                        onClick={() => {
                          window.open(`/accounts/${order.game_account_id}`, '_blank');
                        }}
                        title="ดูไอดี"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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
