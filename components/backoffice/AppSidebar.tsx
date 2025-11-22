'use client';

import { useState } from 'react';
import {
  Package,
  Grid3x3,
  ShoppingCart,
  Users,
  Tag,
  Globe,
  Coins,
  Home,
  Share,
  LayoutDashboard,
  ChevronRight,
  ChevronDown,
  Key,
  Gamepad2,
  DollarSign,
  Trophy,
  CreditCard,
  BookOpen,
  Phone,
  MessageSquare,
  Bell,
  Receipt,
  Newspaper,
} from 'lucide-react';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

type MenuItem = {
  id: string;
  label: string;
  icon: typeof Package;
  subItems?: { id: string; label: string }[];
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
      { 
        id: 'games', 
        label: 'มินิเกมและรางวัล',
        icon: Trophy,
        subItems: [
          { id: 'games', label: 'จัดการเกม' },
          { id: 'game-prizes', label: 'จัดการรางวัล' },
        ],
      },
    ],
  },
  {
    label: 'บทความ',
    items: [
      {
        id: 'blog',
        label: 'บทความ',
        icon: BookOpen,
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
    ],
  },
  {
    label: 'ตั้งค่าบัญชีการเงิน',
    items: [
      { id: 'payment-settings', label: 'การชำระเงิน', icon: DollarSign },
      { id: 'slip-settings', label: 'ตั้งค่าสลิปโอนเงิน', icon: Receipt },
    ],
  },
];

export default function AppSidebar({
  selectedMenu,
  setSelectedMenu,
}: {
  selectedMenu: string;
  setSelectedMenu: (id: string) => void;
}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['marketing', 'games', 'social', 'blog']));

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleMenuClick = (item: MenuItem, subItemId?: string) => {
    if (subItemId) {
      setSelectedMenu(subItemId);
      return;
    }
    if (item.subItems && item.subItems.length > 0) {
      toggleExpanded(item.id);
      return;
    }
    setSelectedMenu(item.id);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-gray-800 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-600 rounded-lg">
              <LayoutDashboard className="size-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white group-data-[collapsible=icon]:hidden">ระบบหลังบ้าน</h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-[#0a0a0a]">
        {menuSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const isExpanded = expandedItems.has(item.id);
                  const isActive =
                    selectedMenu === item.id ||
                    (hasSubItems && item.subItems?.some((sub) => selectedMenu === sub.id));

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => handleMenuClick(item)}
                        isActive={isActive}
                        className={cn(
                          'relative text-gray-300 hover:bg-purple-900/30 hover:text-purple-400 transition-colors',
                          isActive && 'bg-purple-900/40 text-purple-400 font-semibold border-l-4 border-purple-600'
                        )}
                      >
                        <Icon className={cn('size-4', isActive && 'text-purple-400')} />
                        <span className="flex-1">{item.label}</span>
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
                        <SidebarMenuSub className="border-l-2 border-purple-800">
                          {item.subItems?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.id}>
                              <SidebarMenuSubButton
                                onClick={() => handleMenuClick(item, subItem.id)}
                                isActive={selectedMenu === subItem.id}
                                className={cn(
                                  'text-gray-400 hover:bg-purple-900/30 hover:text-purple-400',
                                  selectedMenu === subItem.id && 'bg-purple-900/30 text-purple-400 font-medium'
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
            <SidebarMenuButton
              asChild
              className="hover:bg-purple-900/30 hover:text-purple-400 transition-colors text-gray-300"
            >
              <Link href="/">
                <Home className="text-purple-400" />
                <span className="font-medium">กลับหน้าเว็บ</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

