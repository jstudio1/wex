'use client';

import { useState } from 'react';
import { Package, Grid3x3, ShoppingCart, Users, Tag, Gift, Globe, Coins, Home, Share2, FolderTree, LayoutDashboard, ChevronRight, ChevronDown, Key, Gamepad2, DollarSign, Trophy } from 'lucide-react';
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
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Products',
    items: [
      { id: 'products', label: 'จัดการบริการเติมเกม', icon: Package },
      { id: 'categories', label: 'จัดการหมวดหมู่เติมเกม', icon: Grid3x3 },
      { id: 'pricing', label: 'ตั้งค่าราคาเติมเกม', icon: DollarSign },
    ]
  },
  {
    label: 'สินค้าอื่นๆ',
    items: [
      { id: 'game-categories', label: 'จัดการหมวดหมู่สินค้าอื่นๆ', icon: Grid3x3 },
      { id: 'game-accounts', label: 'จัดการไอดีเกม', icon: Gamepad2 },
      { id: 'app-premium', label: 'แอพพรีเมี่ยม', icon: Package },
      { id: 'cashcard', label: 'บัตรเติมเงิน', icon: Coins },
    ]
  },
  {
    label: 'Orders',
    items: [
      { id: 'orders', label: 'คำสั่งซื้อ', icon: ShoppingCart },
    ]
  },
  {
    label: 'Users',
    items: [
      { id: 'users', label: 'ผู้ใช้', icon: Users },
    ]
  },
  {
    label: 'Marketing',
    items: [
      { 
        id: 'marketing', 
        label: 'การตลาด', 
        icon: Tag,
        subItems: [
          { id: 'coupons', label: 'คูปองส่วนลด' },
          { id: 'redeem-codes', label: 'โค้ดเติมพอยต์' },
          { id: 'popup', label: 'Popup' },
        ]
      },
    ]
  },
  {
    label: 'Social Services',
    items: [
      { 
        id: 'social', 
        label: 'บริการโซเชียล', 
        icon: Share2,
        subItems: [
          { id: 'social-categories', label: 'จัดการหมวดหมู่โซเชียล' },
          { id: 'social-services', label: 'จัดการบริการโซเชียล' },
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
    label: 'Settings',
    items: [
      { id: 'site', label: 'ตั้งค่าเว็บ', icon: Globe },
      { id: 'api-keys', label: 'ตั้งค่า API Key', icon: Key },
    ]
  },
];

export default function AppSidebar({ selectedMenu, setSelectedMenu }: { selectedMenu: string; setSelectedMenu: (id: string) => void }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['marketing', 'games']));

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
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
      <SidebarFooter className="border-t border-sidebar-border">
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

