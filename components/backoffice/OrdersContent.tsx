'use client';

import { useEffect, useState, useMemo } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SearchIcon, ShoppingCart, RefreshCcw } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type OrderType = 'product' | 'game_account' | 'social' | 'all';

interface BaseOrder {
  id: string;
  transaction_id: string | null;
  user_id: string | null;
  created_at: string;
  state: string;
  price: number;
  user?: { id: string; username: string | null } | null;
}

interface ProductOrder extends BaseOrder {
  type: 'product';
  product_id: number;
  product?: { id: number; name: string; image_url: string | null; key: string } | null;
}

interface GameAccountOrder extends BaseOrder {
  type: 'game_account';
  game_account_id: number | null;
  username?: string;
  game_account?: { id: number; game_name: string; title: string; cover_image_url: string | null } | null;
}

interface SocialOrder extends BaseOrder {
  type: 'social';
  social_service_id: number | null;
  link?: string;
  quantity?: number;
  social_service?: { id: number; display_name: string | null; name: string } | null;
}

type Order = ProductOrder | GameAccountOrder | SocialOrder;

function translateState(state: string): string {
  const map: Record<string, string> = {
    'success': 'สำเร็จ',
    'completed': 'สำเร็จ',
    'pending': 'รอดำเนินการ',
    'failed': 'ล้มเหลว',
    'cancelled': 'ยกเลิก',
    'processing': 'กำลังดำเนินการ',
    'in_progress': 'กำลังดำเนินการ',
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
  } else if (stateLower === 'processing' || stateLower === 'in_progress') {
    return 'bg-blue-600/30 text-blue-300 border-blue-500/30';
  }
  return 'bg-white/10 text-[color:var(--text)]/70 border-white/20';
}

export default function OrdersContent() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<OrderType>('all');
  const [orders, setOrders] = useState<{
    product: ProductOrder[];
    game_account: GameAccountOrder[];
    social: SocialOrder[];
    all: Order[];
  }>({
    product: [],
    game_account: [],
    social: [],
    all: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
      const json = await res.json();
      setOrders(json.data || { product: [], game_account: [], social: [], all: [] });
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getOrdersByType = (type: OrderType): Order[] => {
    if (type === 'all') return orders.all;
    return orders[type] || [];
  };

  const filteredOrders = useMemo(() => {
    const ordersToFilter = getOrdersByType(activeTab);
    if (!searchQuery.trim()) return ordersToFilter;

    const query = searchQuery.toLowerCase().trim();
    return ordersToFilter.filter((order) => {
      // ค้นหาจากรหัสคำสั่งซื้อ
      if (order.transaction_id?.toLowerCase().includes(query)) return true;

      // ค้นหาจากชื่อผู้ซื้อ
      if (order.user?.username?.toLowerCase().includes(query)) return true;

      // ค้นหาจากราคา
      if (order.price?.toString().includes(query)) return true;

      // ค้นหาตามประเภท
      if (order.type === 'product') {
        const productOrder = order as ProductOrder;
        if (productOrder.product?.name?.toLowerCase().includes(query)) return true;
        if (productOrder.product?.key?.toLowerCase().includes(query)) return true;
      } else if (order.type === 'game_account') {
        const gameOrder = order as GameAccountOrder;
        if (gameOrder.game_account?.title?.toLowerCase().includes(query)) return true;
        if (gameOrder.game_account?.game_name?.toLowerCase().includes(query)) return true;
      } else if (order.type === 'social') {
        const socialOrder = order as SocialOrder;
        if (socialOrder.social_service?.display_name?.toLowerCase().includes(query)) return true;
        if (socialOrder.social_service?.name?.toLowerCase().includes(query)) return true;
        if (socialOrder.link?.toLowerCase().includes(query)) return true;
      }

      return false;
    });
  }, [activeTab, orders, searchQuery]);

  const getOrderTypeLabel = (type: OrderType): string => {
    const labels: Record<OrderType, string> = {
      all: 'ทั้งหมด',
      product: 'เติมเกม',
      game_account: 'ไอดีเกม',
      social: 'โซเชียล',
    };
    return labels[type];
  };

  const renderOrderRow = (order: Order) => {
    if (order.type === 'product') {
      return (
        <TableRow key={order.id}>
          <TableCell className="font-medium">{order.transaction_id || '-'}</TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {order.product?.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={order.product.image_url}
                  alt={order.product.name}
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              <span>{order.product?.name || 'ไม่พบข้อมูล'}</span>
            </div>
          </TableCell>
          <TableCell>{order.user?.username || '-'}</TableCell>
          <TableCell>{new Date(order.created_at).toLocaleString('th-TH')}</TableCell>
          <TableCell>
            <span className={`text-xs px-2 py-1 rounded border ${getStateColorClass(order.state)}`}>
              {translateState(order.state)}
            </span>
          </TableCell>
          <TableCell className="text-right">{Number(order.price ?? 0).toLocaleString('th-TH')} ฿</TableCell>
        </TableRow>
      );
    }

    if (order.type === 'game_account') {
      return (
        <TableRow key={order.id}>
          <TableCell className="font-medium">{order.transaction_id || `GA-${order.id}`}</TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {order.game_account?.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={order.game_account.cover_image_url}
                  alt={order.game_account.title}
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              <div>
                <div className="font-medium">{order.game_account?.title || 'ไม่พบข้อมูล'}</div>
                <div className="text-xs text-[color:var(--text)]/60">{order.game_account?.game_name || ''}</div>
              </div>
            </div>
          </TableCell>
          <TableCell>{order.user?.username || '-'}</TableCell>
          <TableCell>{new Date(order.created_at).toLocaleString('th-TH')}</TableCell>
          <TableCell>
            <span className={`text-xs px-2 py-1 rounded border ${getStateColorClass(order.state)}`}>
              {translateState(order.state)}
            </span>
          </TableCell>
          <TableCell className="text-right">{Number(order.price ?? 0).toLocaleString('th-TH')} ฿</TableCell>
        </TableRow>
      );
    }

    if (order.type === 'social') {
      return (
        <TableRow key={order.id}>
          <TableCell className="font-medium">{order.transaction_id || `SO-${order.id}`}</TableCell>
          <TableCell>
            <div>
              <div className="font-medium">{order.social_service?.display_name || order.social_service?.name || 'ไม่พบข้อมูล'}</div>
              {order.link && (
                <div className="text-xs text-[color:var(--text)]/60 truncate max-w-xs">{order.link}</div>
              )}
              {order.quantity && (
                <div className="text-xs text-[color:var(--text)]/60">จำนวน: {order.quantity}</div>
              )}
            </div>
          </TableCell>
          <TableCell>{order.user?.username || '-'}</TableCell>
          <TableCell>{new Date(order.created_at).toLocaleString('th-TH')}</TableCell>
          <TableCell>
            <span className={`text-xs px-2 py-1 rounded border ${getStateColorClass(order.state)}`}>
              {translateState(order.state)}
            </span>
          </TableCell>
          <TableCell className="text-right">{Number(order.price ?? 0).toLocaleString('th-TH')} ฿</TableCell>
        </TableRow>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="card p-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold">ประวัติคำสั่งซื้อ</h2>
        <div className="flex-1 min-w-[200px] max-w-md">
          <InputGroup>
            <InputGroupInput
              placeholder="ค้นหารหัสคำสั่งซื้อ, ชื่อสินค้า, ผู้ซื้อ, ราคา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon size={16} />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OrderType)}>
        <TabsList>
          <TabsTrigger value="all" active={activeTab === 'all'}>
            ทั้งหมด ({orders.all.length})
          </TabsTrigger>
          <TabsTrigger value="product" active={activeTab === 'product'}>
            เติมเกม ({orders.product.length})
          </TabsTrigger>
          <TabsTrigger value="game_account" active={activeTab === 'game_account'}>
            ไอดีเกม ({orders.game_account.length})
          </TabsTrigger>
          <TabsTrigger value="social" active={activeTab === 'social'}>
            โซเชียล ({orders.social.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" active={activeTab === 'all'} className="mt-4">
          <div className="card p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8">
                      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ShoppingCart className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle>
                      {searchQuery ? 'ไม่พบคำสั่งซื้อที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ'}
                          </EmptyTitle>
                          <EmptyDescription>
                            {searchQuery 
                              ? 'ลองค้นหาด้วยคำอื่น หรือล้างเงื่อนไขการค้นหา'
                              : 'คำสั่งซื้อจะแสดงที่นี่เมื่อมีการสั่งซื้อ'}
                          </EmptyDescription>
                        </EmptyHeader>
                        {searchQuery && (
                          <EmptyContent>
                            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                              <RefreshCcw className="size-4" />
                              รีเฟรช
                            </Button>
                          </EmptyContent>
                        )}
                      </Empty>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => renderOrderRow(order))
                )}
              </TableBody>
            </Table>
                </div>
        </TabsContent>
        
        <TabsContent value="product" active={activeTab === 'product'} className="mt-4">
          <div className="card p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8">
                      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ShoppingCart className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle>
                      {searchQuery ? 'ไม่พบคำสั่งซื้อที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ ประเภทเติมเกม'}
                          </EmptyTitle>
                          <EmptyDescription>
                            {searchQuery 
                              ? 'ลองค้นหาด้วยคำอื่น หรือล้างเงื่อนไขการค้นหา'
                              : 'คำสั่งซื้อประเภทเติมเกมจะแสดงที่นี่'}
                          </EmptyDescription>
                        </EmptyHeader>
                        {searchQuery && (
                          <EmptyContent>
                            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                              <RefreshCcw className="size-4" />
                              รีเฟรช
                            </Button>
                          </EmptyContent>
                        )}
                      </Empty>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => renderOrderRow(order))
                )}
              </TableBody>
            </Table>
                </div>
        </TabsContent>

        <TabsContent value="game_account" active={activeTab === 'game_account'} className="mt-4">
          <div className="card p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8">
                      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ShoppingCart className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle>
                      {searchQuery ? 'ไม่พบคำสั่งซื้อที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ ประเภทไอดีเกม'}
                          </EmptyTitle>
                          <EmptyDescription>
                            {searchQuery 
                              ? 'ลองค้นหาด้วยคำอื่น หรือล้างเงื่อนไขการค้นหา'
                              : 'คำสั่งซื้อประเภทไอดีเกมจะแสดงที่นี่'}
                          </EmptyDescription>
                        </EmptyHeader>
                        {searchQuery && (
                          <EmptyContent>
                            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                              <RefreshCcw className="size-4" />
                              รีเฟรช
                            </Button>
                          </EmptyContent>
                        )}
                      </Empty>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => renderOrderRow(order))
                )}
              </TableBody>
            </Table>
              </div>
        </TabsContent>

        <TabsContent value="social" active={activeTab === 'social'} className="mt-4">
          <div className="card p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8">
                      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ShoppingCart className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle>
                      {searchQuery ? 'ไม่พบคำสั่งซื้อที่ค้นหา' : `ยังไม่มีคำสั่งซื้อ${activeTab !== 'all' ? ` ประเภท${getOrderTypeLabel(activeTab)}` : ''}`}
                          </EmptyTitle>
                          <EmptyDescription>
                            {searchQuery 
                              ? 'ลองค้นหาด้วยคำอื่น หรือล้างเงื่อนไขการค้นหา'
                              : 'คำสั่งซื้อจะแสดงที่นี่เมื่อมีการสั่งซื้อ'}
                          </EmptyDescription>
                        </EmptyHeader>
                        {searchQuery && (
                          <EmptyContent>
                            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                              <RefreshCcw className="size-4" />
                              รีเฟรช
                            </Button>
                          </EmptyContent>
                        )}
                      </Empty>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => renderOrderRow(order))
                )}
              </TableBody>
            </Table>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

