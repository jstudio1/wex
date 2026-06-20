'use client';

import { Suspense, useState, useEffect } from 'react';
import { Package, Grid3x3, ShoppingCart, Users, Tag, Gift, Globe, Coins, Home, Share2, FolderTree, LayoutDashboard, ChevronRight, ChevronDown, Key, Gamepad2, TrendingUp, DollarSign, CreditCard, Trophy, Receipt, Share, MessageSquare, FileText, Phone, Bell, RefreshCw, Smartphone } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import ProductsContent from '@/components/backoffice/ProductsContent';
import NewTopupServicesManager from '@/components/backoffice/game-services/NewTopupServicesManager';
import CategoriesContent from '@/components/backoffice/CategoriesContent';
import CouponsContent from '@/components/backoffice/CouponsContent';
import RedeemCodesContent from '@/components/backoffice/RedeemCodesContent';
import OrdersContent from '@/components/backoffice/OrdersContent';
import UsersContent from '@/components/backoffice/UsersContent';
import SocialServicesContent from '@/components/backoffice/SocialServicesContent';
import SocialProvidersContent from '@/components/backoffice/SocialProvidersContent';
import AdminSiteForm from '@/components/AdminSiteForm';
import ApiKeysContent from '@/components/backoffice/ApiKeysContent';
import GameAccountsContent from '@/components/backoffice/GameAccountsContent';
import GameCategoriesContent from '@/components/backoffice/GameCategoriesContent';
import GamesContent from '@/components/backoffice/GamesContent';
import AppPremiumContent from '@/components/backoffice/AppPremiumContent';
import TopupHistoryContent from '@/components/backoffice/TopupHistoryContent';
import AdminLoginForm from '@/components/backoffice/AdminLoginForm';
import TicketsContent from '@/components/backoffice/TicketsContent';
import BlogPostsContent from '@/components/backoffice/BlogPostsContent';
import BlogCategoriesContent from '@/components/backoffice/BlogCategoriesContent';
import NewsContent from '@/components/backoffice/NewsContent';
import PolicyContent from '@/components/backoffice/PolicyContent';
import PrivacyContent from '@/components/backoffice/PrivacyContent';
import OTPAppsManager from './otp-apps/otp-apps-manager';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
  badge?: number;
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    label: 'ภาพรวม',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'คำสั่งซื้อ',
    items: [
      { id: 'orders', label: 'คำสั่งซื้อ', icon: ShoppingCart },
      { id: 'topup-history', label: 'ประวัติเติมเงิน', icon: Coins },
    ],
  },
  {
    label: 'ซัพพอร์ต',
    items: [{ id: 'tickets', label: 'จัดการ Ticket', icon: MessageSquare }],
  },
  {
    label: 'แอพพรีเมี่ยม',
    items: [{ id: 'app-premium', label: 'จัดการแอพพรีเมี่ยม', icon: Package }],
  },
  {
    label: 'ปั๊มโซเชียล',
    items: [
      { 
        id: 'social', 
        label: 'ปั๊มโซเชียล', 
        icon: Share,
        subItems: [
          { id: 'social-providers', label: 'จัดการ Providers' },
          { id: 'social-services', label: 'จัดการบริการ' },
        ],
      },
    ],
  },
  {
    label: 'เติมเงินเกม',
    items: [
      { id: 'products', label: 'จัดการบริการเติมเกม', icon: Package },
      { id: 'categories', label: 'จัดการหมวดหมู่เติมเกม', icon: Grid3x3 },
    ],
  },
  {
    label: 'เติมเงินมือถือ',
    items: [{ id: 'mtopup', label: 'จัดการเติมเงินมือถือ', icon: Phone }],
  },
  {
    label: 'บัตรเติมเงิน',
    items: [{ id: 'cashcard-wepay', label: 'บัตรเติมเงิน', icon: CreditCard }],
  },
  {
    label: 'สินค้าอื่นๆ',
    items: [
      { id: 'game-accounts', label: 'จัดการไอดีเกม', icon: Gamepad2 },
        { id: 'game-categories', label: 'จัดการหมวดหมู่สินค้าอื่นๆ', icon: Grid3x3 },
        { id: 'games', label: 'มินิเกมและรางวัล', icon: Trophy },
      ],
  },
  {
    label: 'บทความ',
    items: [
      { 
        id: 'blog', 
        label: 'บทความ', 
        icon: FileText,
        subItems: [
          { id: 'blog-posts', label: 'จัดการบทความ' },
          { id: 'blog-categories', label: 'จัดการหมวดหมู่' },
          { id: 'news', label: 'ตั้งค่าข่าวสาร' },
        ],
      },
    ],
  },
  {
    label: 'ผู้ใช้',
    items: [{ id: 'users', label: 'ผู้ใช้', icon: Users }],
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
        ],
      },
    ],
  },
  {
    label: 'ตั้งค่าเว็บไซต์',
    items: [
      { id: 'site', label: 'ตั้งค่าเว็บ', icon: Globe },
      { id: 'api-keys', label: 'ตั้งค่า API Key', icon: Key },
      { id: 'otp-apps', label: 'จัดการแอพ OTP', icon: Smartphone },
      { 
        id: 'legal', 
        label: 'ข้อกำหนดและนโยบาย', 
        icon: FileText,
        subItems: [
          { id: 'terms', label: 'ข้อกำหนดการใช้งาน' },
          { id: 'privacy', label: 'นโยบายความเป็นส่วนตัว' },
        ],
      },
    ],
  },
  {
    label: 'ตั้งค่าบัญชีการเงิน',
    items: [
      { id: 'payment-settings', label: 'ตั้งค่าชำระเงิน', icon: DollarSign },
    ],
  },
];

const VALID_MENU_IDS = (() => {
  const ids = new Set<string>();
  menuSections.forEach((section) => {
    section.items.forEach((item) => {
      ids.add(item.id);
      item.subItems?.forEach((sub) => ids.add(sub.id));
    });
  });
  return ids;
})();

function AppSidebar({ selectedMenu, setSelectedMenu }: { selectedMenu: string; setSelectedMenu: (id: string) => void }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['marketing', 'games', 'social', 'blog']));
  const [unreadTickets, setUnreadTickets] = useState<number>(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/admin/tickets/unread-count');
        if (res.ok) {
          const data = await res.json();
          setUnreadTickets(data.count || 0);
        }
      } catch {
        // silently ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, []);

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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-emerald-500/20 bg-gradient-to-r from-emerald-900/20 to-cyan-900/20">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg shadow-[0_4px_12px_rgba(16,185,129,0.35)]">
              <LayoutDashboard className="size-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white group-data-[collapsible=icon]:hidden">ระบบหลังบ้าน</h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-[#0a0a0a]">
        {menuSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isExpanded = expandedItems.has(item.id);
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const isActive = selectedMenu === item.id || (hasSubItems && item.subItems?.some(sub => selectedMenu === sub.id));
                  const badgeCount = item.id === 'tickets' ? unreadTickets : (item.badge ?? 0);

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => handleMenuClick(item)}
                        isActive={isActive}
                        className={cn(
                          "relative text-gray-300 hover:bg-emerald-900/25 hover:text-emerald-400 transition-colors",
                          isActive && "bg-emerald-900/35 text-emerald-400 font-semibold border-l-4 border-emerald-500"
                        )}
                      >
                        <Icon className={cn("size-4", isActive && "text-emerald-400")} />
                        <span className="flex-1">{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                        {hasSubItems ? (
                          isExpanded ? (
                            <ChevronDown className="ml-auto size-4" />
                          ) : (
                            <ChevronRight className="ml-auto size-4" />
                          )
                        ) : (
                          <ChevronRight className="ml-auto size-4 opacity-0" />
                        )}
                      </SidebarMenuButton>
                      {hasSubItems && isExpanded && (
                        <SidebarMenuSub className="border-l-2 border-emerald-700/50">
                          {item.subItems?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.id}>
                              <SidebarMenuSubButton
                                onClick={() => handleMenuClick(item, subItem.id)}
                                isActive={selectedMenu === subItem.id}
                                className={cn(
                                  "text-gray-400 hover:bg-emerald-900/25 hover:text-emerald-400",
                                  selectedMenu === subItem.id && "bg-emerald-900/25 text-emerald-400 font-medium"
                                )}
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
      <SidebarFooter className="border-t border-gray-800 bg-gray-900/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-emerald-900/25 hover:text-emerald-400 transition-colors text-gray-300">
              <Link href="/">
                <Home className="text-emerald-400" />
                <span className="font-medium">กลับหน้าเว็บ</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function BackofficePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMenu, setSelectedMenu] = useState<string>('dashboard');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    if (!searchParams) return;
    const menuParam = searchParams.get('menu');
    if (menuParam && VALID_MENU_IDS.has(menuParam)) {
      if (selectedMenu !== menuParam) {
        setSelectedMenu(menuParam);
      }
    } else if (!menuParam && selectedMenu !== 'dashboard') {
      setSelectedMenu('dashboard');
    }
  }, [searchParams, selectedMenu]);

  useEffect(() => {
    // ตรวจสอบว่าเป็น admin และล็อคอินอยู่แล้วหรือไม่
    fetch('/api/admin/check')
      .then(async (res) => {
        if (!res.ok) {
          // ถ้า response ไม่ ok ให้แสดง login form โดยไม่แสดง error
          setIsAdmin(false);
          setCheckingAuth(false);
          return;
        }
        const data = await res.json();
        if (!data.isAdmin) {
          // Not admin, show login form
          setIsAdmin(false);
        } else {
          // Is admin and logged in
          setIsAdmin(true);
        }
        setCheckingAuth(false);
      })
      .catch(() => {
        // Error checking, show login form (ไม่แสดง error message)
        setIsAdmin(false);
        setCheckingAuth(false);
      });
  }, [router]);

  // Reset loading when menu changes - ต้องอยู่ก่อน conditional returns
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [selectedMenu]);

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="space-y-4 w-full max-w-4xl p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLoginForm />;
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
          const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
          if (!id || id === 'dashboard') {
            params.delete('menu');
          } else {
            params.set('menu', id);
          }
          const query = params.toString();
          router.replace(query ? `/backoffice?${query}` : '/backoffice', { scroll: false });
        }} 
      />
      <SidebarInset className="flex flex-col h-screen max-h-screen overflow-hidden bg-black">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-800 bg-[#0a0a0a] px-6 shadow-sm sticky top-0 z-10">
          <SidebarTrigger className="-ml-1 hover:bg-emerald-900/25 rounded-md p-2 transition-colors text-gray-300" />
          <div className="flex items-center gap-3 flex-1">
            {currentItem ? (
              <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-900/25 to-cyan-900/20 px-4 py-2 rounded-lg border border-emerald-500/30 shadow-sm">
                <currentItem.icon className="size-5 text-emerald-400" />
                <h1 className="text-lg font-semibold text-white">{currentItem.label}</h1>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-900/25 to-cyan-900/20 px-4 py-2 rounded-lg border border-emerald-500/30 shadow-sm">
                <LayoutDashboard className="size-5 text-emerald-400" />
                <h1 className="text-lg font-semibold text-white">หลังบ้าน</h1>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-300 hidden md:flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-md">
            <span className="font-medium">
              {new Date().toLocaleDateString('th-TH', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-black">
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

export default function BackofficePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          กำลังโหลด...
        </div>
      }
    >
      <BackofficePageInner />
    </Suspense>
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
        <div className="grid grid-cols-4 gap-4 pb-2 border-b border-border">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 py-4 border-b border-border/50">
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
      return <NewTopupServicesManager />;
    case 'categories':
      return <CategoriesContent />;
    case 'orders':
      return <OrdersContentWrapper />;
    case 'topup-history':
      return <TopupHistoryContent />;
    case 'users':
      return <UsersContentWrapper />;
    case 'coupons':
      return <CouponsContentWrapper />;
    case 'redeem-codes':
      return <RedeemCodesContentWrapper />;
    case 'social-providers':
      return <SocialProvidersContentWrapper />;
    case 'social-services':
      return <SocialServicesContentWrapper />;
    case 'site':
      return <SiteContentWrapper />;
    case 'payment-settings':
      return <PaymentSettingsContentWrapper />;
    case 'api-keys':
      return <ApiKeysContent />;
    case 'slip-settings':
      // alias เก่า ชี้ไปหน้าเดียวกับการตั้งค่าชำระเงิน
      return <PaymentSettingsContentWrapper />;
    case 'game-categories':
      return <GameCategoriesContent />;
    case 'game-accounts':
      return <GameAccountsContent />;
    case 'games':
      return <GamesContent />;
    case 'game-prizes':
      // Legacy alias — รวมเข้ากับหน้าเกมแล้ว
      return <GamesContent />;
    case 'app-premium':
      return <AppPremiumContent />;
    case 'mtopup':
      return <ProductsContentWrapper productType="mtopup" />;
    case 'cashcard-wepay':
      return <ProductsContentWrapper productType="cashcard" />;
    case 'tickets':
      return <TicketsContent />;
    case 'blog-posts':
      return <BlogPostsContent />;
    case 'blog-categories':
      return <BlogCategoriesContent />;
    case 'news':
      return <NewsContent />;
    case 'terms':
      return <PolicyContent />;
    case 'privacy':
      return <PrivacyContent />;
    case 'otp-apps':
      return <OTPAppsContentWrapper />;
    default:
      return (
        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Menu className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-white">ไม่พบเมนู</EmptyTitle>
            <EmptyDescription className="text-gray-400">
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
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await fetch('/api/admin/stats', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await res.json();
        setStats(data);
    } catch (err) {
        console.error('Stats error:', err);
    } finally {
        setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
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

  return <EnhancedDashboard stats={stats} onRefresh={() => fetchStats(true)} refreshing={refreshing} />;
}

function EnhancedDashboard({ stats, onRefresh, refreshing }: { stats: any; onRefresh?: () => void; refreshing?: boolean }) {
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

  const productTypes = [
    { 
      key: 'gtopup', 
      label: 'เติมเกม', 
      icon: Gamepad2, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30'
    },
    { 
      key: 'mtopup', 
      label: 'เติมเงินมือถือ', 
      icon: Phone, 
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30'
    },
    { 
      key: 'cashcard', 
      label: 'บัตรเติมเงิน', 
      icon: CreditCard, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    },
    { 
      key: 'app_premium', 
      label: 'แอพพรีเมี่ยม', 
      icon: Package, 
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    },
    { 
      key: 'social', 
      label: 'ปั้มโซเชียล', 
      icon: Share2, 
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold mb-2 text-white">Dashboard</h2>
        <p className="text-gray-400">ภาพรวมระบบและสถิติการขาย</p>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        )}
      </div>

      {/* Main Revenue & Topup Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-950/50 to-emerald-900/30 border-emerald-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">ยอดขายรวมทั้งหมด</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(stats?.totalRevenue || 0)}</div>
            <p className="text-xs text-gray-400">รวมทุกประเภทออเดอร์</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-400">7 วัน:</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(stats?.revenueLast7Days || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-950/50 to-yellow-900/30 border-yellow-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">ยอดเติมเงินรวม</CardTitle>
            <Coins className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(stats?.totalTopupRevenue || 0)}</div>
            <p className="text-xs text-gray-400">โอนเงิน, TrueWallet, โค้ด</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-400">เดือนนี้:</span>
              <span className="text-yellow-400 font-semibold">{formatCurrency(stats?.topupRevenueThisMonth || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-950/50 to-blue-900/30 border-blue-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">ยอดขายเดือนนี้</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(stats?.revenueThisMonth || 0)}</div>
            <p className={`text-xs mt-1 ${parseFloat(revenueGrowth) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {parseFloat(revenueGrowth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(revenueGrowth))}% จากเดือนที่แล้ว
            </p>
            <div className="mt-2 text-xs text-gray-400">
              {stats?.ordersThisMonth || 0} ออเดอร์
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-950/50 to-purple-900/30 border-purple-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">คำสั่งซื้อทั้งหมด</CardTitle>
            <ShoppingCart className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{stats?.orders || 0}</div>
            <p className="text-xs text-gray-400">รวมทุกประเภท</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-400">30 วัน:</span>
              <span className="text-purple-400 font-semibold">{stats?.ordersLast30Days || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Product Type - Detailed Cards */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">ยอดขายแยกตามประเภทสินค้า</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {productTypes.map((type) => {
            const Icon = type.icon;
            const revenue = stats?.revenueByType?.[type.key] || {};
            const orders = stats?.ordersByType?.[type.key] || {};
            
            return (
              <Card key={type.key} className={`bg-gradient-to-br from-[#0a0a0a] to-[#050505] border ${type.borderColor} hover:border-opacity-80 hover:shadow-lg transition-all group`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2.5 rounded-xl ${type.bgColor} group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-5 w-5 ${type.color}`} />
                      </div>
                      <CardTitle className="text-sm font-semibold text-white">{type.label}</CardTitle>
                    </div>
                  </div>
          </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold text-white mb-0.5">{formatCurrency(revenue.total || 0)}</div>
                    <p className="text-xs text-gray-500">ยอดรวมทั้งหมด</p>
                  </div>
                  <div className="pt-3 border-t border-gray-800/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">เดือนนี้:</span>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{formatCurrency(revenue.thisMonth || 0)}</div>
                        <div className="text-xs text-gray-500">{orders.thisMonth || 0} ออเดอร์</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-800/30">
                      <span className="text-xs text-gray-400">7 วัน:</span>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-gray-300">{formatCurrency(revenue.last7Days || 0)}</div>
                        <div className="text-xs text-gray-500">{orders.last7Days || 0} ออเดอร์</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-800/30">
                      <span className="text-xs text-gray-400">30 วัน:</span>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-gray-300">{formatCurrency(revenue.last30Days || 0)}</div>
                        <div className="text-xs text-gray-500">{orders.last30Days || 0} ออเดอร์</div>
                      </div>
                    </div>
                  </div>
          </CardContent>
        </Card>
            );
          })}
        </div>
      </div>


      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        <Card className="bg-[#0a0a0a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">ยอดขายรายวัน (7 วันที่ผ่านมา)</CardTitle>
            <CardDescription className="text-gray-400">ยอดขายรวมทุกประเภทออเดอร์</CardDescription>
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
        <Card className="bg-[#0a0a0a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">ยอดขายรายเดือน (6 เดือนที่ผ่านมา)</CardTitle>
            <CardDescription className="text-gray-400">ยอดขายรวมทุกประเภทออเดอร์</CardDescription>
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



function SocialProvidersContentWrapper() {
  return <SocialProvidersContent />;
}

function SocialServicesContentWrapper() {
  return <SocialServicesContent />;
}

function SiteContentWrapper() {
  return <AdminSiteForm />;
}

function PaymentSettingsContentWrapper() {
  return <AdminSiteForm initialTab="payment" />;
}

function ProductsContentWrapper({ productType }: { productType?: string }) {
  return <ProductsContent productType={productType} />;
}

function OTPAppsContentWrapper() {
  return <OTPAppsContent />;
}

function OTPAppsContent() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    fetch('/api/admin/otp-apps')
      .then(res => res.json())
      .then(data => {
        setApps(data.data || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1 text-white sm:text-2xl sm:mb-2">Select OTP App</h2>
          <p className="text-white/70 text-xs sm:text-sm">Choose an app to receive OTP code</p>
        </div>
        <Button onClick={() => setShowManager(!showManager)} variant="outline" className="self-start sm:self-auto">
          {showManager ? 'Hide Manager' : 'Manage Apps'}
        </Button>
      </div>

      {showManager && (
        <div className="mb-6">
          <OTPAppsManager 
            initialApps={apps} 
            onAppsChange={(updatedApps) => setApps(updatedApps)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {apps.map((app) => {
          const defaultColor = 'from-emerald-600 to-emerald-800';
          const gradientColor = app.color || defaultColor;

          return (
            <div
              key={app.id}
              className="group relative block"
            >
              <div className={cn(
                "card p-3 sm:p-6 h-full flex flex-col items-center text-center space-y-2 sm:space-y-4 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border-white/10",
                !app.is_published && "opacity-50"
              )}>
                {/* Icon Section */}
                <div className="relative">
                  {app.image_url ? (
                    <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-2 border-white/10`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={app.image_url}
                        alt={app.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            target.style.display = 'none';
                            parent.innerHTML = '<div class="w-full h-full bg-gray-600/50 flex items-center justify-center"><span class="text-xs text-gray-400">No Image</span></div>';
                          }
                        }}
                      />
                    </div>
                  ) : app.icon_url ? (
                    <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-2 border-white/10`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={app.icon_url}
                        alt={app.name}
                        className="w-8 h-8 sm:w-12 sm:h-12 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            target.style.display = 'none';
                            parent.innerHTML = '<div class="w-full h-full bg-gray-600/50 flex items-center justify-center"><span class="text-xs text-gray-400">No Icon</span></div>';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-600/50 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-2 border-gray-500/30">
                      <span className="text-[10px] sm:text-xs text-gray-400">No Image</span>
                    </div>
                  )}
                  {/* Decorative ring */}
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                </div>

                {/* Content Section */}
                <div className="flex-1 space-y-1 sm:space-y-2">
                  <h3 className="text-sm sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors duration-300 truncate">
                    {app.name}
                  </h3>
                  {app.description && (
                    <p className="hidden sm:block text-xs text-white/60 group-hover:text-white/80 transition-colors">
                      {app.description}
                    </p>
                  )}
                  {!app.is_published && (
                    <div className="text-xs text-red-400 font-medium">
                      (Hidden)
                    </div>
                  )}
                </div>

                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
