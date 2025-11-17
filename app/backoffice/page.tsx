'use client';

import { useState, useEffect } from 'react';
import { Package, Grid3x3, ShoppingCart, Users, Tag, Gift, Globe, Coins, Home, Share2, FolderTree, LayoutDashboard, ChevronRight, ChevronDown, Key, Gamepad2, TrendingUp, DollarSign, CreditCard, Trophy } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductsContent from '@/components/backoffice/ProductsContent';
import CategoriesContent from '@/components/backoffice/CategoriesContent';
import PricingContent from '@/components/backoffice/PricingContent';
import CouponsContent from '@/components/backoffice/CouponsContent';
import RedeemCodesContent from '@/components/backoffice/RedeemCodesContent';
import PopupContent from '@/components/backoffice/PopupContent';
import OrdersContent from '@/components/backoffice/OrdersContent';
import UsersContent from '@/components/backoffice/UsersContent';
import SocialServicesContent from '@/components/backoffice/SocialServicesContent';
import SocialCategoriesContent from '@/components/backoffice/SocialCategoriesContent';
import AdminSiteForm from '@/components/AdminSiteForm';
import ApiKeysContent from '@/components/backoffice/ApiKeysContent';
import GameAccountsContent from '@/components/backoffice/GameAccountsContent';
import GameCategoriesContent from '@/components/backoffice/GameCategoriesContent';
import GamesContent from '@/components/backoffice/GamesContent';
import GamePrizesContent from '@/components/backoffice/GamePrizesContent';
import AppPremiumContent from '@/components/backoffice/AppPremiumContent';
import CashcardContent from '@/components/backoffice/CashcardContent';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Menu } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

type MenuItem = {
  id: string;
  label: string;
  icon: typeof Package;
  href?: string;
  subItems?: { id: string; label: string }[];
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    label: 'ภาพรวม',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'บริการเติมเกม',
    items: [
      { id: 'products', label: 'จัดการบริการเติมเกม', icon: Package },
      { id: 'pricing', label: 'ตั้งค่าราคาเติมเกม', icon: DollarSign },
      { id: 'categories', label: 'จัดการหมวดหมู่เติมเกม', icon: Grid3x3 },
    ]
  },
  {
    label: 'สินค้าอื่นๆ',
    items: [
      { id: 'game-accounts', label: 'จัดการไอดีเกม', icon: Gamepad2 },
      { id: 'game-categories', label: 'จัดการหมวดหมู่สินค้าอื่นๆ', icon: Grid3x3 },
      { id: 'app-premium', label: 'แอพพรีเมี่ยม', icon: Package },
      { id: 'cashcard', label: 'บัตรเติมเงิน', icon: Coins },
    ]
  },
  {
    label: 'บริการโซเชียล',
    items: [
      { 
        id: 'social', 
        label: 'บริการโซเชียล', 
        icon: Share2,
        subItems: [
          { id: 'social-services', label: 'จัดการบริการโซเชียล' },
          { id: 'social-categories', label: 'จัดการหมวดหมู่โซเชียล' },
        ]
      },
    ]
  },
  {
    label: 'เกม',
    items: [
      { 
        id: 'games', 
        label: 'เกม', 
        icon: Trophy,
        subItems: [
          { id: 'games', label: 'จัดการเกม' },
          { id: 'game-prizes', label: 'จัดการรางวัล' },
        ]
      },
    ]
  },
  {
    label: 'คำสั่งซื้อ',
    items: [
      { id: 'orders', label: 'คำสั่งซื้อ', icon: ShoppingCart },
    ]
  },
  {
    label: 'ผู้ใช้',
    items: [
      { id: 'users', label: 'ผู้ใช้', icon: Users },
    ]
  },
  {
    label: 'การตลาด',
    items: [
      { 
        id: 'marketing', 
        label: 'การตลาด', 
        icon: Tag,
        subItems: [
          { id: 'coupons', label: 'คูปองส่วนลด' },
          { id: 'redeem-codes', label: 'โค้ดเติมพอยต์' },
          { id: 'popup', label: 'Popup Notification' },
        ]
      },
    ]
  },
  {
    label: 'ตั้งค่า',
    items: [
      { id: 'site', label: 'ตั้งค่าเว็บ', icon: Globe },
      { id: 'api-keys', label: 'ตั้งค่า API Key', icon: Key },
    ]
  },
];

function AppSidebar({ selectedMenu, setSelectedMenu }: { selectedMenu: string; setSelectedMenu: (id: string) => void }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['marketing', 'games', 'social']));

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleMenuClick = (item: MenuItem, subItemId?: string) => {
    if (subItemId) {
      setSelectedMenu(subItemId);
    } else if (item.subItems && item.subItems.length > 0) {
      toggleExpanded(item.id);
    } else {
      setSelectedMenu(item.id);
    }
  };

  // หา item ที่เลือกจากทุก sections
  const getAllMenuItems = () => {
    return menuSections.flatMap(section => section.items);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-gray-700/50">
        <div className="flex items-center gap-2 px-2 py-4">
          <h2 className="text-lg font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">หลังบ้าน</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isExpanded = expandedItems.has(item.id);
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const isActive = selectedMenu === item.id || (hasSubItems && item.subItems?.some(sub => selectedMenu === sub.id));

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => handleMenuClick(item)}
                        isActive={isActive}
                        className="relative"
                      >
                        <Icon />
                        <span className="flex-1">{item.label}</span>
                        {hasSubItems ? (
                          isExpanded ? (
                            <ChevronDown className="ml-auto size-4" />
                          ) : (
                            <ChevronRight className="ml-auto size-4" />
                          )
                        ) : (
                          <ChevronRight className="ml-auto size-4 opacity-50" />
                        )}
                      </SidebarMenuButton>
                      {hasSubItems && isExpanded && (
                        <SidebarMenuSub>
                          {item.subItems?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.id}>
                              <SidebarMenuSubButton
                                onClick={() => handleMenuClick(item, subItem.id)}
                                isActive={selectedMenu === subItem.id}
                              >
                                <span>{subItem.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-gray-700/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <Home />
                <span>กลับหน้าเว็บ</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function BackofficePage() {
  const router = useRouter();
  const [selectedMenu, setSelectedMenu] = useState<string>('dashboard');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // ตรวจสอบว่าเป็น admin หรือไม่
    fetch('/api/admin/check')
      .then((res) => res.json())
      .then((data) => {
        if (!data.isAdmin) {
          router.push('/');
        } else {
          setIsAdmin(true);
        }
      })
      .catch(() => {
        router.push('/');
      });
  }, [router]);

  // Reset loading when menu changes - ต้องอยู่ก่อน conditional returns
  useEffect(() => {
    setIsLoading(true);
    // เพิ่ม delay ให้ skeleton แสดงนานขึ้นเพื่อรอให้ content component โหลดเสร็จ
    // ใช้เวลานานพอที่จะครอบคลุมการ fetch data ของ content components ส่วนใหญ่
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200); // เพิ่ม delay เพื่อให้ content component มีเวลาโหลดเสร็จ
    
    return () => clearTimeout(timer);
  }, [selectedMenu]);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-4xl p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // หา current item (อาจจะเป็น parent หรือ sub-item)
  const allMenuItems = menuSections.flatMap(section => section.items);
  let currentItem: { id: string; label: string; icon: typeof Package } | undefined;
  const parentItem = allMenuItems.find((item) => item.id === selectedMenu);
  if (parentItem) {
    currentItem = { id: parentItem.id, label: parentItem.label, icon: parentItem.icon };
  } else {
    // หา sub-item
    for (const item of allMenuItems) {
      const subItem = item.subItems?.find(sub => sub.id === selectedMenu);
      if (subItem) {
        currentItem = { id: subItem.id, label: subItem.label, icon: item.icon };
        break;
      }
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar 
        selectedMenu={selectedMenu} 
        setSelectedMenu={(id) => {
          setIsLoading(true);
          setSelectedMenu(id);
        }} 
      />
      <SidebarInset className="flex flex-col h-screen max-h-screen overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-700/50 px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">
              {currentItem ? (
                <>
                  <currentItem.icon className="mr-2 inline size-5 text-accent" />
                  {currentItem.label}
                </>
              ) : (
                'หลังบ้าน'
              )}
            </h1>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {isLoading ? (
            <BackofficeContentSkeleton />
          ) : (
            <BackofficeContent menuId={selectedMenu} />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function BackofficeContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Table/List skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Table header */}
        <div className="grid grid-cols-4 gap-4 pb-2 border-b border-gray-700/50">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 py-4 border-b border-gray-700/30">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BackofficeContent({ menuId }: { menuId: string }) {
  switch (menuId) {
    case 'dashboard':
      return <DashboardContent />;
    case 'products':
      return <ProductsContent />;
    case 'categories':
      return <CategoriesContent />;
    case 'pricing':
      return <PricingContent />;
    case 'orders':
      return <OrdersContentWrapper />;
    case 'users':
      return <UsersContentWrapper />;
    case 'coupons':
      return <CouponsContentWrapper />;
    case 'redeem-codes':
      return <RedeemCodesContentWrapper />;
    case 'popup':
      return <PopupContentWrapper />;
    case 'social-categories':
      return <SocialCategoriesContentWrapper />;
    case 'social-services':
      return <SocialServicesContentWrapper />;
    case 'site':
      return <SiteContentWrapper />;
    case 'api-keys':
      return <ApiKeysContent />;
    case 'game-categories':
      return <GameCategoriesContent />;
    case 'game-accounts':
      return <GameAccountsContent />;
    case 'games':
      return <GamesContent />;
    case 'game-prizes':
      return <GamePrizesContent />;
    case 'app-premium':
      return <AppPremiumContent />;
    case 'cashcard':
      return <CashcardContent />;
    default:
      return (
        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Menu className="size-6" />
            </EmptyMedia>
            <EmptyTitle>ไม่พบเมนู</EmptyTitle>
            <EmptyDescription>
              กรุณาเลือกเมนูจากแถบข้างหรือกลับไปหน้าหลัก
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
  }
}

function DashboardContent() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        console.error('Stats error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return <EnhancedDashboard stats={stats} />;
}

function EnhancedDashboard({ stats }: { stats: any }) {
  const revenueGrowth = stats?.revenueLastMonth 
    ? ((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth * 100).toFixed(1)
    : '0';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value);
  };

  const formatDailyDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
        <p className="text-[color:var(--text)]/60">ภาพรวมระบบและสถิติการขาย</p>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--text)]/70">ยอดขายรวมทั้งหมด</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text)]">{formatCurrency(stats?.totalRevenue || 0)}</div>
            <p className="text-xs text-[color:var(--text)]/60 mt-1">พอยต์</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--text)]/70">ยอดขาย 7 วันที่ผ่านมา</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text)]">{formatCurrency(stats?.revenueLast7Days || 0)}</div>
            <p className="text-xs text-[color:var(--text)]/60 mt-1">{stats?.ordersLast7Days || 0} ออเดอร์</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--text)]/70">ยอดขายเดือนนี้</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text)]">{formatCurrency(stats?.revenueThisMonth || 0)}</div>
            <p className={`text-xs mt-1 ${parseFloat(revenueGrowth) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {parseFloat(revenueGrowth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(revenueGrowth))}% จากเดือนที่แล้ว
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--text)]/70">ยอดขาย 30 วันที่ผ่านมา</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text)]">{formatCurrency(stats?.revenueLast30Days || 0)}</div>
            <p className="text-xs text-[color:var(--text)]/60 mt-1">{stats?.ordersLast30Days || 0} ออเดอร์</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--text)]/70">บริการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text)]">{stats?.products || 0}</div>
            <p className="text-xs text-[color:var(--text)]/60 mt-1">เผยแพร่: {stats?.publishedProducts || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--text)]/70">คำสั่งซื้อ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text)]">{stats?.orders || 0}</div>
            <p className="text-xs text-[color:var(--text)]/60 mt-1">เดือนนี้: {stats?.ordersThisMonth || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--text)]/70">ผู้ใช้</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text)]">{stats?.users || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--text)]/70">สินค้าอื่นๆ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text)]">{stats?.gameAccounts || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--text)]/70">คูปอง</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text)]">{stats?.coupons || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--text)]/70">โค้ดเติม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text)]">{stats?.redeemCodes || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-[color:var(--text)]">ยอดขายรายวัน (7 วันที่ผ่านมา)</CardTitle>
            <CardDescription className="text-[color:var(--text)]/60">ยอดขายรวมทุกประเภทออเดอร์</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.dailyRevenue || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff60"
                  tickFormatter={formatDailyDate}
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#ffffff60"
                  tickFormatter={(value) => formatCurrency(value)}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelFormatter={(label) => `วันที่: ${formatDailyDate(label)}`}
                  formatter={(value: any) => [formatCurrency(value), 'ยอดขาย']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#a855f7" 
                  fillOpacity={1}
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Revenue Chart */}
        <Card className="bg-black/40 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-[color:var(--text)]">ยอดขายรายเดือน (6 เดือนที่ผ่านมา)</CardTitle>
            <CardDescription className="text-[color:var(--text)]/60">ยอดขายรวมทุกประเภทออเดอร์</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis 
                  dataKey="month" 
                  stroke="#ffffff60"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#ffffff60"
                  tickFormatter={(value) => formatCurrency(value)}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => [formatCurrency(value), 'ยอดขาย']}
                />
                <Bar dataKey="revenue" fill="#a855f7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrdersContentWrapper() {
  return <OrdersContent />;
}

function UsersContentWrapper() {
  return <UsersContent />;
}

function CouponsContentWrapper() {
  return <CouponsContent />;
}

function RedeemCodesContentWrapper() {
  return <RedeemCodesContent />;
}

function PopupContentWrapper() {
  return <PopupContent />;
}

function SocialCategoriesContentWrapper() {
  return <SocialCategoriesContent />;
}

function SocialServicesContentWrapper() {
  return <SocialServicesContent />;
}

function SiteContentWrapper() {
  return <AdminSiteForm />;
}
