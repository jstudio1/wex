'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, Share2, Smartphone, Home, Mail, FileText, ChevronDown, MessageSquare, BookOpen, Wrench, Shield, Phone, CreditCard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type NavbarMenus = {
  home: boolean;
  products: boolean;
  mtopup: boolean;
  cashcard: boolean;
  social: boolean;
  categories: boolean;
  games: boolean;
  premiumApp: boolean;
  contact: boolean;
  blog: boolean;
};

export default function NavLinks({ 
  isAdmin,
  navbarMenus,
  navbarMenuOrder,
  navbarMenuLabels,
  isLoggedIn
}: { 
  isAdmin: boolean;
  navbarMenus: NavbarMenus;
  navbarMenuOrder?: string[];
  navbarMenuLabels?: {
    products?: string;
    premiumApp?: string;
    social?: string;
    contact?: string;
  };
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname() || '/';
  const allItemsMap: Record<string, { href: string; label: string; icon: typeof Home; key: keyof NavbarMenus; requireAuth?: boolean }> = {
    home: { href: '/', label: 'หน้าหลัก', icon: Home, key: 'home' },
    products: { href: '/products', label: navbarMenuLabels?.products || 'เติมเกม', icon: Gamepad2, key: 'products' },
    mtopup: { href: '/mtopup', label: 'เติมเงินมือถือ', icon: Phone, key: 'mtopup' },
    cashcard: { href: '/cashcard', label: 'บัตรเติมเงิน', icon: CreditCard, key: 'cashcard' },
    premiumApp: { href: '/premium-app', label: navbarMenuLabels?.premiumApp || 'แอพ', icon: Smartphone, key: 'premiumApp' },
    social: { href: '/social', label: navbarMenuLabels?.social || 'ปั้ม', icon: Share2, key: 'social' },
    blog: { href: '/blog', label: 'How To', icon: BookOpen, key: 'blog' },
  };

  // Default order: หน้าหลัก > เติมเกม > เติมเงินมือถือ > บัตรเติมเงิน > แอพ > ปั้ม > Blog > เครื่องมือ > ติดต่อเรา
  const defaultOrder = ['home', 'products', 'mtopup', 'cashcard', 'premiumApp', 'social', 'blog', 'tools', 'contact'];
  const order = navbarMenuOrder || defaultOrder;
  
  // Ensure 'home' is always first if it exists in the order
  const validKeys = ['home', 'products', 'mtopup', 'cashcard', 'premiumApp', 'social', 'blog', 'tools', 'contact'];
  const orderedKeys = order.includes('home') 
    ? ['home', ...order.filter(key => key !== 'home' && validKeys.includes(key))]
    : ['home', ...validKeys.filter(key => key !== 'home')];

  const isContactActive = pathname === '/contact' || pathname === '/terms-policy' || pathname === '/account/tickets';
  const isToolsActive = pathname.startsWith('/tools');

  // Build menu items in order
  const menuItems: Array<{ type: 'link' | 'contact' | 'tools'; data?: any; index: number }> = [];
  
  orderedKeys.forEach((key, idx) => {
    if (key === 'contact') {
      if (navbarMenus.contact !== false) {
        menuItems.push({ type: 'contact', index: idx });
      }
    } else if (key === 'tools') {
      menuItems.push({ type: 'tools', index: idx });
    } else {
      const item = allItemsMap[key];
      if (item && navbarMenus[item.key] !== false) {
        if (!item.requireAuth || isLoggedIn) {
          menuItems.push({ type: 'link', data: item, index: idx });
        }
      }
    }
  });

  const baseClasses = 'group relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-300 !text-white overflow-hidden focus:outline-none focus-visible:outline-none';

  return (
    <nav
      className="flex items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      aria-label="เมนูหลัก"
    >
      {menuItems.map((menuItem) => {
        if (menuItem.type === 'contact') {
          return (
            <DropdownMenu key="contact" modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`${baseClasses} ${
                    isContactActive
                      ? 'bg-gradient-to-r from-emerald-500/30 to-emerald-600/30 shadow-lg shadow-emerald-500/20 border border-emerald-400/30'
                      : 'hover:bg-white/10 hover:border-white/20 border border-transparent'
                  } focus:outline-none focus-visible:outline-none`}
                >
                  {isContactActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-emerald-500/20 animate-pulse"></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      <Mail className={`relative z-10 h-4 w-4 text-white transition-all duration-300 ${isContactActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                      <span className="relative z-10 leading-none text-white drop-shadow-sm hidden sm:inline">{navbarMenuLabels?.contact || 'ติดต่อเรา'}</span>
                  <ChevronDown className={`relative z-10 h-3 w-3 text-white transition-transform duration-300 ${isContactActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {isContactActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-[#0a0a0a] border-gray-800 text-white min-w-[200px]">
                <DropdownMenuItem asChild>
                  <Link 
                    href="/contact" 
                    className={`flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:outline-none ${
                      pathname === '/contact' ? 'text-emerald-400' : 'text-white hover:text-emerald-400'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    <span>ติดต่อเรา</span>
                  </Link>
                </DropdownMenuItem>
                {isLoggedIn && (
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/account/tickets" 
                      className={`flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:outline-none ${
                        pathname === '/account/tickets' ? 'text-emerald-400' : 'text-white hover:text-emerald-400'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Ticket Support</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link 
                    href="/terms-policy" 
                    className={`flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:outline-none ${
                      pathname === '/terms-policy' ? 'text-emerald-400' : 'text-white hover:text-emerald-400'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>ข้อกำหนดการใช้งาน</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        if (menuItem.type === 'tools') {
          return (
            <DropdownMenu key="tools" modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`${baseClasses} ${
                    isToolsActive
                      ? 'bg-gradient-to-r from-emerald-500/30 to-emerald-600/30 shadow-lg shadow-emerald-500/20 border border-emerald-400/30'
                      : 'hover:bg-white/10 hover:border-white/20 border border-transparent'
                  } focus:outline-none focus-visible:outline-none`}
                >
                  {isToolsActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-emerald-500/20 animate-pulse"></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <Wrench className={`relative z-10 h-4 w-4 text-white transition-all duration-300 ${isToolsActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="relative z-10 leading-none text-white drop-shadow-sm hidden sm:inline">เครื่องมือ</span>
                  <ChevronDown className={`relative z-10 h-3 w-3 text-white transition-transform duration-300 ${isToolsActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {isToolsActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-[#0a0a0a] border-gray-800 text-white min-w-[200px]">
                <DropdownMenuItem asChild>
                  <Link 
                    href="/tools/2fa" 
                    className={`flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:outline-none ${
                      pathname === '/tools/2fa' ? 'text-emerald-400' : 'text-white hover:text-emerald-400'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    <span>2FA</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        const it = menuItem.data;
        const active = pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href));
        const Icon = it.icon;
        const stateClasses = active
          ? 'bg-gradient-to-r from-emerald-500/30 to-emerald-600/30 shadow-lg shadow-emerald-500/20 border border-emerald-400/30'
          : 'hover:bg-white/10 hover:border-white/20 border border-transparent';
        
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`${baseClasses} ${stateClasses}`}
          >
            {active && (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-emerald-500/20 animate-pulse"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <Icon
              className={`relative z-10 h-4 w-4 text-white transition-all duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}
            />
            <span className="relative z-10 leading-none text-white drop-shadow-sm hidden sm:inline">{it.label}</span>
            {active && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
