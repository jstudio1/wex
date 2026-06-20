'use client';

import { useEffect, useState, useMemo } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SearchIcon, ShoppingCart, RefreshCcw, Eye, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedOrder(order);
                setIsModalOpen(true);
              }}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              ดูรายละเอียด
            </Button>
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
      // Parse product_data from string to object
      let productData: Record<string, any> = {};
      try {
        if (typeof appOrder.product_data === 'string') {
          productData = JSON.parse(appOrder.product_data);
        } else if (appOrder.product_data) {
          productData = appOrder.product_data;
        }
      } catch (e) {
        // If parsing fails, treat as empty object
        productData = {};
      }
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedOrder(order);
                setIsModalOpen(true);
              }}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              ดูรายละเอียด
            </Button>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedOrder(order);
                setIsModalOpen(true);
              }}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              ดูรายละเอียด
            </Button>
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
        <div className="card p-4 overflow-x-auto">
          <div className="min-w-[600px] space-y-2">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, j) => (
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
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex w-max min-w-full gap-1 h-auto p-1">
            <TabsTrigger value="all" active={activeTab === 'all'} className="whitespace-nowrap shrink-0 text-xs py-2 px-3">
              ทั้งหมด ({orders.all.length})
            </TabsTrigger>
            <TabsTrigger value="app_premium" active={activeTab === 'app_premium'} className="whitespace-nowrap shrink-0 text-xs py-2 px-3">
              แอพพรีเมี่ยม ({orders.app_premium.length})
            </TabsTrigger>
            <TabsTrigger value="social" active={activeTab === 'social'} className="whitespace-nowrap shrink-0 text-xs py-2 px-3">
              ปั้มโซเชียล ({orders.social.length})
            </TabsTrigger>
            <TabsTrigger value="gtopup" active={activeTab === 'gtopup'} className="whitespace-nowrap shrink-0 text-xs py-2 px-3">
              เติมเกม ({orders.gtopup.length})
            </TabsTrigger>
            <TabsTrigger value="mtopup" active={activeTab === 'mtopup'} className="whitespace-nowrap shrink-0 text-xs py-2 px-3">
              เติมเงินมือถือ ({orders.mtopup.length})
            </TabsTrigger>
            <TabsTrigger value="cashcard" active={activeTab === 'cashcard'} className="whitespace-nowrap shrink-0 text-xs py-2 px-3">
              บัตรเติมเงิน ({orders.cashcard.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" active={activeTab === 'all'} className="mt-4">
          <div className="card p-4 overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8">
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
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8">
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
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8">
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
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8">
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
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8">
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
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสคำสั่งซื้อ</TableHead>
                  <TableHead>สินค้า/บริการ</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>วันที่สั่งซื้อ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8">
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

      {/* Order Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center justify-between">
              <span>รายละเอียดคำสั่งซื้อ</span>
              <DialogClose asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6 mt-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">รหัสคำสั่งซื้อ</div>
                  <div className="text-white font-medium">{selectedOrder.transaction_id || '-'}</div>
    </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">สถานะ</div>
                  <div>
                    <span className={`text-xs px-2 py-1 rounded border ${getStateColorClass(selectedOrder.state)}`}>
                      {translateState(selectedOrder.state)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">ผู้ซื้อ</div>
                  <div className="text-white">{selectedOrder.user?.username || '-'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">ราคา</div>
                  <div className="text-white font-semibold text-lg">{Number(selectedOrder.price ?? 0).toLocaleString('th-TH')} ฿</div>
                </div>
                <div className="space-y-2 col-span-2">
                  <div className="text-sm text-gray-400">วันที่สั่งซื้อ</div>
                  <div className="text-white">{new Date(selectedOrder.created_at).toLocaleString('th-TH')}</div>
                </div>
              </div>

              {/* Product Info */}
              {(selectedOrder.type === 'gtopup' || selectedOrder.type === 'mtopup' || selectedOrder.type === 'cashcard') && (
                <>
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">ข้อมูลสินค้า</h3>
                    <div className="flex items-center gap-3 mb-4">
                      {(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).product?.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).product!.image_url!}
                          alt={(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).product!.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="text-white font-medium text-lg">
                          {(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).product?.name || 'ไม่พบข้อมูล'}
                        </div>
                        {(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).product?.key && (
                          <div className="text-gray-400 text-sm">
                            Key: {(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).product!.key}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Input Data */}
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">ข้อมูลที่ใส่</h3>
                    <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-3">
                      {Object.entries((selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).input_json || {}).filter(([_, v]) => v != null && v !== '').length > 0 ? (
                        Object.entries((selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).input_json || {}).filter(([_, v]) => v != null && v !== '').map(([key, value]) => (
                          <div key={key} className="flex justify-between items-start">
                            <span className="text-gray-400 text-sm">{key}:</span>
                            <span className="text-white font-medium text-sm text-right max-w-[70%] break-words">{String(value)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 text-sm">ไม่มีข้อมูล</div>
                      )}
                    </div>
                  </div>

                  {/* Result */}
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">ผลลัพธ์</h3>
                    <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-3">
                      {(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).result_code && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-400 text-sm">รหัส:</span>
                          <span className="text-emerald-400 font-mono text-sm">{(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).result_code}</span>
                        </div>
                      )}
                      {(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).result_message && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-400 text-sm">ข้อความ:</span>
                          <span className="text-emerald-400 text-sm text-right max-w-[70%] break-words">{(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).result_message}</span>
                        </div>
                      )}
                      {!(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).result_code && !(selectedOrder as GtopupOrder | MtopupOrder | CashcardOrder).result_message && (
                        <div className="text-gray-500 text-sm">ไม่มีข้อมูล</div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* App Premium Order */}
              {selectedOrder.type === 'app_premium' && (
                <>
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">ข้อมูลสินค้า</h3>
                    <div className="flex items-center gap-3 mb-4">
                      {((selectedOrder as AppPremiumOrder).product?.image_url || (selectedOrder as AppPremiumOrder).product?.icon_url) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(selectedOrder as AppPremiumOrder).product!.image_url || (selectedOrder as AppPremiumOrder).product!.icon_url || ''}
                          alt={(selectedOrder as AppPremiumOrder).product?.display_name || (selectedOrder as AppPremiumOrder).product?.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="text-white font-medium text-lg">
                          {(selectedOrder as AppPremiumOrder).product?.display_name || (selectedOrder as AppPremiumOrder).product?.name || 'ไม่พบข้อมูล'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input Data */}
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">ข้อมูลที่ใส่</h3>
                    <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-3">
                      {(() => {
                        let productData: Record<string, any> = {};
                        try {
                          if (typeof (selectedOrder as AppPremiumOrder).product_data === 'string') {
                            productData = JSON.parse((selectedOrder as AppPremiumOrder).product_data);
                          } else if ((selectedOrder as AppPremiumOrder).product_data) {
                            productData = (selectedOrder as AppPremiumOrder).product_data;
                          }
                        } catch (e) {
                          productData = {};
                        }
                        const entries = Object.entries(productData).filter(([_, v]) => v != null && v !== '');
                        return entries.length > 0 ? (
                          entries.map(([key, value]) => (
                            <div key={key} className="flex justify-between items-start">
                              <span className="text-gray-400 text-sm">{key}:</span>
                              <span className="text-white font-medium text-sm text-right max-w-[70%] break-words" dangerouslySetInnerHTML={{ __html: String(value) }} />
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 text-sm">ไม่มีข้อมูล</div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Result */}
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">ผลลัพธ์</h3>
                    <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-3">
                      {(() => {
                        const resultData = (selectedOrder as AppPremiumOrder).raw_response || {};
                        if (resultData.prize || resultData.code || resultData.result) {
                          return (
                            <>
                              {resultData.prize && (
                                <div className="flex justify-between items-start">
                                  <span className="text-gray-400 text-sm">รางวัล:</span>
                                  <span className="text-emerald-400 font-medium text-sm">{String(resultData.prize)}</span>
                                </div>
                              )}
                              {resultData.code && (
                                <div className="flex justify-between items-start">
                                  <span className="text-gray-400 text-sm">รหัส:</span>
                                  <span className="text-emerald-400 font-mono text-sm">{String(resultData.code)}</span>
                                </div>
                              )}
                              {resultData.result && (
                                <div className="flex justify-between items-start">
                                  <span className="text-gray-400 text-sm">ผลลัพธ์:</span>
                                  <span className="text-emerald-400 text-sm text-right max-w-[70%] break-words">{String(resultData.result)}</span>
                                </div>
                              )}
                            </>
                          );
                        }
                        return <div className="text-gray-500 text-sm">ไม่มีข้อมูล</div>;
                      })()}
                    </div>
                  </div>
                </>
              )}

              {/* Social Order */}
              {selectedOrder.type === 'social' && (
                <>
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">ข้อมูลบริการ</h3>
                    <div className="text-white font-medium text-lg mb-4">
                      {(selectedOrder as SocialOrder).social_service?.display_name || (selectedOrder as SocialOrder).social_service?.name || 'ไม่พบข้อมูล'}
                    </div>
                  </div>

                  {/* Input Data */}
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">ข้อมูลที่ใส่</h3>
                    <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-3">
                      {(selectedOrder as SocialOrder).link && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-400 text-sm">ลิงค์:</span>
                          <a href={(selectedOrder as SocialOrder).link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm text-right max-w-[70%] break-all">
                            {(selectedOrder as SocialOrder).link}
                          </a>
                        </div>
                      )}
                      {(selectedOrder as SocialOrder).quantity && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-400 text-sm">จำนวน:</span>
                          <span className="text-white font-medium text-sm">{(selectedOrder as SocialOrder).quantity}</span>
                        </div>
                      )}
                      {!(selectedOrder as SocialOrder).link && !(selectedOrder as SocialOrder).quantity && (
                        <div className="text-gray-500 text-sm">ไม่มีข้อมูล</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

