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

type OrderType = 'all' | 'gtopup' | 'mtopup' | 'cashcard' | 'app_premium' | 'social';

interface BaseOrder {
  id: string;
  transaction_id: string | null;
  user_id: string | null;
  created_at: string;
  state: string;
  price: number;
  user?: { id: string; username: string | null } | null;
}

interface GtopupOrder extends BaseOrder {
  type: 'gtopup';
  product_id: number;
  input_json?: Record<string, any> | null;
  result_code?: string | null;
  result_message?: string | null;
  product?: { id: number; name: string; image_url: string | null; key: string } | null;
}

interface MtopupOrder extends BaseOrder {
  type: 'mtopup';
  product_id: number;
  input_json?: Record<string, any> | null;
  result_code?: string | null;
  result_message?: string | null;
  product?: { id: number; name: string; image_url: string | null; key: string } | null;
}

interface CashcardOrder extends BaseOrder {
  type: 'cashcard';
  product_id: number;
  input_json?: Record<string, any> | null;
  result_code?: string | null;
  result_message?: string | null;
  product?: { id: number; name: string; image_url: string | null; key: string } | null;
}

interface AppPremiumOrder extends BaseOrder {
  type: 'app_premium';
  product_id: number;
  product_data?: any;
  raw_response?: any;
  product?: { id: number; display_name: string | null; name: string; image_url: string | null; icon_url: string | null } | null;
}

interface SocialOrder extends BaseOrder {
  type: 'social';
  social_service_id: number | null;
  link?: string;
  quantity?: number;
  social_service?: { id: number; display_name: string | null; name: string } | null;
}

type Order = GtopupOrder | MtopupOrder | CashcardOrder | AppPremiumOrder | SocialOrder;

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
    return 'bg-emerald-500 text-white border-emerald-500/30';
  } else if (stateLower === 'pending') {
    return 'bg-amber-600/30 text-amber-300 border-amber-500/30';
  } else if (stateLower === 'failed') {
    return 'bg-red-600/30 text-red-300 border-red-500/30';
  } else if (stateLower === 'cancelled') {
    return 'bg-slate-600/30 text-slate-300 border-slate-500/30';
  } else if (stateLower === 'processing' || stateLower === 'in_progress') {
    return 'bg-blue-600/30 text-blue-300 border-blue-500/30';
  }
  return 'bg-secondary text-muted-foreground border-border';
}

export default function OrdersContent() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<OrderType>('all');
  const [orders, setOrders] = useState<{
    gtopup: GtopupOrder[];
    mtopup: MtopupOrder[];
    cashcard: CashcardOrder[];
    app_premium: AppPremiumOrder[];
    social: SocialOrder[];
    all: Order[];
  }>({
    gtopup: [],
    mtopup: [],
    cashcard: [],
    app_premium: [],
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
      setOrders(json.data || { gtopup: [], mtopup: [], cashcard: [], app_premium: [], social: [], all: [] });
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
    if (type === 'gtopup') return orders.gtopup;
    if (type === 'mtopup') return orders.mtopup;
    if (type === 'cashcard') return orders.cashcard;
    if (type === 'app_premium') return orders.app_premium;
    if (type === 'social') return orders.social;
    return [];
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
      if (order.type === 'gtopup' || order.type === 'mtopup' || order.type === 'cashcard') {
        const productOrder = order as GtopupOrder | MtopupOrder | CashcardOrder;
        if (productOrder.product?.name?.toLowerCase().includes(query)) return true;
        if (productOrder.product?.key?.toLowerCase().includes(query)) return true;
      } else if (order.type === 'app_premium') {
        const appOrder = order as AppPremiumOrder;
        if (appOrder.product?.display_name?.toLowerCase().includes(query)) return true;
        if (appOrder.product?.name?.toLowerCase().includes(query)) return true;
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
      gtopup: 'เติมเกม',
      mtopup: 'เติมเงินมือถือ',
      cashcard: 'บัตรเติมเงิน',
      app_premium: 'แอพพรีเมี่ยม',
      social: 'ปั้มโซเชียล',
    };
    return labels[type];
  };

  const renderOrderRow = (order: Order) => {
    // Gtopup, Mtopup, Cashcard orders
    if (order.type === 'gtopup' || order.type === 'mtopup' || order.type === 'cashcard') {
      const productOrder = order as GtopupOrder | MtopupOrder | CashcardOrder;
      const inputData = productOrder.input_json || {};
      const inputEntries = Object.entries(inputData).filter(([_, v]) => v != null && v !== '');
      
      return (
        <TableRow key={order.id}>
          <TableCell className="font-medium text-white">{order.transaction_id || '-'}</TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {productOrder.product?.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={productOrder.product.image_url}
                  alt={productOrder.product.name}
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              <span className="text-white">{productOrder.product?.name || 'ไม่พบข้อมูล'}</span>
            </div>
          </TableCell>
          <TableCell className="text-gray-300">{order.user?.username || '-'}</TableCell>
          <TableCell className="text-gray-300">
            <div className="space-y-1">
              {inputEntries.length > 0 ? (
                inputEntries.map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="text-gray-400">{key}:</span>{' '}
                    <span className="text-white font-medium">{String(value)}</span>
                  </div>
                ))
              ) : (
                <span className="text-gray-500 text-xs">ไม่มีข้อมูล</span>
              )}
            </div>
          </TableCell>
          <TableCell className="text-gray-300">
            <div className="space-y-1">
              {productOrder.result_code && (
                <div className="text-xs">
                  <span className="text-gray-400">รหัส:</span>{' '}
                  <span className="text-emerald-400 font-mono">{productOrder.result_code}</span>
                </div>
              )}
              {productOrder.result_message && (
                <div className="text-xs">
                  <span className="text-gray-400">ข้อความ:</span>{' '}
                  <span className="text-emerald-400">{productOrder.result_message}</span>
                </div>
              )}
              {!productOrder.result_code && !productOrder.result_message && (
                <span className="text-gray-500 text-xs">-</span>
              )}
            </div>
          </TableCell>
          <TableCell className="text-gray-300">{new Date(order.created_at).toLocaleString('th-TH')}</TableCell>
          <TableCell>
            <span className={`text-xs px-2 py-1 rounded border ${getStateColorClass(order.state)}`}>
              {translateState(order.state)}
            </span>
          </TableCell>
          <TableCell className="text-right text-white font-semibold">{Number(order.price ?? 0).toLocaleString('th-TH')} ฿</TableCell>
        </TableRow>
      );
    }

    // App Premium orders
    if (order.type === 'app_premium') {
      const appOrder = order as AppPremiumOrder;
      const productData = appOrder.product_data || {};
      const inputEntries = Object.entries(productData).filter(([_, v]) => v != null && v !== '');
      const resultData = appOrder.raw_response || {};
      
      return (
        <TableRow key={order.id}>
          <TableCell className="font-medium text-white">{order.transaction_id || '-'}</TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {(appOrder.product?.image_url || appOrder.product?.icon_url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={appOrder.product.image_url || appOrder.product.icon_url || ''}
                  alt={appOrder.product.display_name || appOrder.product.name}
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              <span className="text-white">{appOrder.product?.display_name || appOrder.product?.name || 'ไม่พบข้อมูล'}</span>
            </div>
          </TableCell>
          <TableCell className="text-gray-300">{order.user?.username || '-'}</TableCell>
          <TableCell className="text-gray-300">
            <div className="space-y-1">
              {inputEntries.length > 0 ? (
                inputEntries.map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="text-gray-400">{key}:</span>{' '}
                    <span className="text-white font-medium">{String(value)}</span>
                  </div>
                ))
              ) : (
                <span className="text-gray-500 text-xs">ไม่มีข้อมูล</span>
              )}
            </div>
          </TableCell>
          <TableCell className="text-gray-300">
            {resultData.prize || resultData.code || resultData.result ? (
              <div className="text-xs space-y-1">
                {resultData.prize && (
                  <div>
                    <span className="text-gray-400">รางวัล:</span>{' '}
                    <span className="text-emerald-400 font-medium">{String(resultData.prize)}</span>
                  </div>
                )}
                {resultData.code && (
                  <div>
                    <span className="text-gray-400">รหัส:</span>{' '}
                    <span className="text-emerald-400 font-mono">{String(resultData.code)}</span>
                  </div>
                )}
                {resultData.result && (
                  <div>
                    <span className="text-gray-400">ผลลัพธ์:</span>{' '}
                    <span className="text-emerald-400">{String(resultData.result)}</span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-500 text-xs">-</span>
            )}
          </TableCell>
          <TableCell className="text-gray-300">{new Date(order.created_at).toLocaleString('th-TH')}</TableCell>
          <TableCell>
            <span className={`text-xs px-2 py-1 rounded border ${getStateColorClass(order.state)}`}>
              {translateState(order.state)}
            </span>
          </TableCell>
          <TableCell className="text-right text-white font-semibold">{Number(order.price ?? 0).toLocaleString('th-TH')} ฿</TableCell>
        </TableRow>
      );
    }

    if (order.type === 'social') {
      return (
        <TableRow key={order.id}>
          <TableCell className="font-medium text-white">{order.transaction_id || `SO-${order.id}`}</TableCell>
          <TableCell>
            <div>
              <div className="font-medium text-white">{order.social_service?.display_name || order.social_service?.name || 'ไม่พบข้อมูล'}</div>
            </div>
          </TableCell>
          <TableCell className="text-gray-300">{order.user?.username || '-'}</TableCell>
          <TableCell className="text-gray-300">
            <div className="space-y-1">
              {order.link && (
                <div className="text-xs">
                  <span className="text-gray-400">ลิงค์:</span>{' '}
                  <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                    {order.link.length > 50 ? `${order.link.substring(0, 50)}...` : order.link}
                  </a>
                </div>
              )}
              {order.quantity && (
                <div className="text-xs">
                  <span className="text-gray-400">จำนวน:</span>{' '}
                  <span className="text-white font-medium">{order.quantity}</span>
                </div>
              )}
              {!order.link && !order.quantity && (
                <span className="text-gray-500 text-xs">ไม่มีข้อมูล</span>
              )}
            </div>
          </TableCell>
          <TableCell className="text-gray-300">
            <span className="text-gray-500 text-xs">-</span>
          </TableCell>
          <TableCell className="text-gray-300">{new Date(order.created_at).toLocaleString('th-TH')}</TableCell>
          <TableCell>
            <span className={`text-xs px-2 py-1 rounded border ${getStateColorClass(order.state)}`}>
              {translateState(order.state)}
            </span>
          </TableCell>
          <TableCell className="text-right text-white font-semibold">{Number(order.price ?? 0).toLocaleString('th-TH')} ฿</TableCell>
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
        <h2 className="text-xl font-semibold text-white">ประวัติคำสั่งซื้อ</h2>
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
          <TabsTrigger value="app_premium" active={activeTab === 'app_premium'}>
            แอพพรีเมี่ยม ({orders.app_premium.length})
          </TabsTrigger>
          <TabsTrigger value="social" active={activeTab === 'social'}>
            ปั้มโซเชียล ({orders.social.length})
          </TabsTrigger>
          <TabsTrigger value="gtopup" active={activeTab === 'gtopup'}>
            เติมเกม ({orders.gtopup.length})
          </TabsTrigger>
          <TabsTrigger value="mtopup" active={activeTab === 'mtopup'}>
            เติมเงินมือถือ ({orders.mtopup.length})
          </TabsTrigger>
          <TabsTrigger value="cashcard" active={activeTab === 'cashcard'}>
            บัตรเติมเงิน ({orders.cashcard.length})
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
                  <TableHead>ข้อมูลที่ใส่</TableHead>
                  <TableHead>ผลลัพธ์</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8">
                      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ShoppingCart className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">
                      {searchQuery ? 'ไม่พบคำสั่งซื้อที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ'}
                          </EmptyTitle>
                          <EmptyDescription className="text-gray-400">
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
        
        <TabsContent value="app_premium" active={activeTab === 'app_premium'} className="mt-4">
          <div className="card p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>ข้อมูลที่ใส่</TableHead>
                  <TableHead>ผลลัพธ์</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8">
                      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ShoppingCart className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">
                            {searchQuery ? 'ไม่พบคำสั่งซื้อที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ แอพพรีเมี่ยม'}
                          </EmptyTitle>
                          <EmptyDescription className="text-gray-400">
                            {searchQuery 
                              ? 'ลองค้นหาด้วยคำอื่น หรือล้างเงื่อนไขการค้นหา'
                              : 'คำสั่งซื้อแอพพรีเมี่ยมจะแสดงที่นี่'}
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
                  <TableHead>ข้อมูลที่ใส่</TableHead>
                  <TableHead>ผลลัพธ์</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8">
                      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ShoppingCart className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">
                            {searchQuery ? 'ไม่พบคำสั่งซื้อที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ ปั้มโซเชียล'}
                          </EmptyTitle>
                          <EmptyDescription className="text-gray-400">
                            {searchQuery 
                              ? 'ลองค้นหาด้วยคำอื่น หรือล้างเงื่อนไขการค้นหา'
                              : 'คำสั่งซื้อปั้มโซเชียลจะแสดงที่นี่'}
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

        <TabsContent value="gtopup" active={activeTab === 'gtopup'} className="mt-4">
          <div className="card p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>ข้อมูลที่ใส่</TableHead>
                  <TableHead>ผลลัพธ์</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8">
                      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ShoppingCart className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">
                            {searchQuery ? 'ไม่พบคำสั่งซื้อที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ เติมเกม'}
                          </EmptyTitle>
                          <EmptyDescription className="text-gray-400">
                            {searchQuery 
                              ? 'ลองค้นหาด้วยคำอื่น หรือล้างเงื่อนไขการค้นหา'
                              : 'คำสั่งซื้อเติมเกมจะแสดงที่นี่'}
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

        <TabsContent value="mtopup" active={activeTab === 'mtopup'} className="mt-4">
          <div className="card p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>ข้อมูลที่ใส่</TableHead>
                  <TableHead>ผลลัพธ์</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8">
                      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ShoppingCart className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">
                            {searchQuery ? 'ไม่พบคำสั่งซื้อที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ เติมเงินมือถือ'}
                          </EmptyTitle>
                          <EmptyDescription className="text-gray-400">
                            {searchQuery 
                              ? 'ลองค้นหาด้วยคำอื่น หรือล้างเงื่อนไขการค้นหา'
                              : 'คำสั่งซื้อเติมเงินมือถือจะแสดงที่นี่'}
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

        <TabsContent value="cashcard" active={activeTab === 'cashcard'} className="mt-4">
          <div className="card p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>ข้อมูลที่ใส่</TableHead>
                  <TableHead>ผลลัพธ์</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8">
                      <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ShoppingCart className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">
                            {searchQuery ? 'ไม่พบคำสั่งซื้อที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ บัตรเติมเงิน'}
                          </EmptyTitle>
                          <EmptyDescription className="text-gray-400">
                            {searchQuery 
                              ? 'ลองค้นหาด้วยคำอื่น หรือล้างเงื่อนไขการค้นหา'
                              : 'คำสั่งซื้อบัตรเติมเงินจะแสดงที่นี่'}
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

