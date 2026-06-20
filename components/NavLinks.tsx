'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Gamepad2, Share2, Smartphone, Home, Mail, FileText, ChevronDown, MessageSquare, BookOpen, Phone, CreditCard, Grid3x3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { normalizeNavbarOrder } from '@/lib/navbar';

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
  isAdmin: _isAdmin,
  navbarMenus,
  navbarMenuOrder,
  navbarMenuLabels,
  isLoggedIn,
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
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Clear pending state when pathname changes (navigation completed)
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleClick = useCallback((href: string) => {
    setPendingHref(href);
  }, []);

  // Use pending href for optimistic active state
  const activePathname = pendingHref || pathname;

  const allItemsMap: Record<string, { href: string; label: string; icon: typeof Home; key: keyof NavbarMenus; requireAuth?: boolean }> = {
    home: { href: '/', label: 'หน้าแรก', icon: Home, key: 'home' },
    products: { href: '/products', label: navbarMenuLabels?.products || 'เติมเกม', icon: Gamepad2, key: 'products' },
    mtopup: { href: '/mtopup', label: 'เติมเงินมือถือ', icon: Phone, key: 'mtopup' },
    cashcard: { href: '/cashcard', label: 'บัตรเติมเงิน', icon: CreditCard, key: 'cashcard' },
    premiumApp: { href: '/premium-app', label: navbarMenuLabels?.premiumApp || 'แอพ', icon: Smartphone, key: 'premiumApp' },
    social: { href: '/social/order/add', label: navbarMenuLabels?.social || 'ปั้ม', icon: Share2, key: 'social' },
    categories: { href: '/categories', label: 'สินค้าอื่นๆ', icon: Grid3x3, key: 'categories' },
    blog: { href: '/blog', label: 'How To', icon: BookOpen, key: 'blog' },
  };

  const orderedKeys = normalizeNavbarOrder(navbarMenuOrder);
  const isContactActive = activePathname === '/contact' || activePathname === '/terms' || activePathname === '/privacy' || activePathname === '/account/tickets';

  const menuItems: Array<{ type: 'link' | 'contact'; data?: (typeof allItemsMap)[string] }> = [];

  orderedKeys.forEach((key) => {
    if (key === 'contact') {
      if (isLoggedIn && navbarMenus.contact !== false) {
        menuItems.push({ type: 'contact' });
      }
      return;
    }

    const item = allItemsMap[key];
    if (!item) return;
    if (navbarMenus[item.key] === false) return;
    if (item.requireAuth && !isLoggedIn) return;

    menuItems.push({ type: 'link', data: item });
  });

  const baseClasses = 'group relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold tracking-wide text-white/75 transition-all duration-250 hover:text-white focus-visible:outline-none focus-visible:ring-0';

  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                      ? 'border border-emerald-300/65 bg-gradient-to-r from-emerald-500/30 to-cyan-500/20 text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)]'
                      : 'border border-transparent bg-white/5 hover:border-white/25 hover:bg-white/10'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  <span>{navbarMenuLabels?.contact || 'ติดต่อเรา'}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-[220px] rounded-xl border border-white/15 bg-[#080b12]/95 p-1.5 text-white shadow-2xl backdrop-blur"
              >
                <DropdownMenuItem asChild>
                  <Link
                    href="/contact"
                    onClick={() => handleClick('/contact')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${activePathname === '/contact' ? 'bg-emerald-500/20 text-emerald-300' : 'hover:bg-white/10'}`}
                  >
                    <Mail className="h-4 w-4" />
                    <span>ติดต่อเรา</span>
                  </Link>
                </DropdownMenuItem>

                {isLoggedIn && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/account/tickets"
                      onClick={() => handleClick('/account/tickets')}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${activePathname === '/account/tickets' ? 'bg-emerald-500/20 text-emerald-300' : 'hover:bg-white/10'}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Ticket Support</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem asChild>
                  <Link
                    href="/terms"
                    onClick={() => handleClick('/terms')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${activePathname === '/terms' ? 'bg-emerald-500/20 text-emerald-300' : 'hover:bg-white/10'}`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>เงื่อนไขการใช้งาน</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/privacy"
                    onClick={() => handleClick('/privacy')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${activePathname === '/privacy' ? 'bg-emerald-500/20 text-emerald-300' : 'hover:bg-white/10'}`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>นโยบายความเป็นส่วนตัว</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        const it = menuItem.data;
        if (!it) return null;

        const active =
          it.href === '/social/order/add'
            ? activePathname === '/social' || activePathname === '/social/order/add' || activePathname.startsWith('/social/')
            : activePathname === it.href || (it.href !== '/' && activePathname.startsWith(it.href));

        const Icon = it.icon;

        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => handleClick(it.href)}
            className={`${baseClasses} ${
              active
                ? 'border border-emerald-300/65 bg-gradient-to-r from-emerald-500/30 to-cyan-500/20 text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)]'
                : 'border border-transparent bg-white/5 hover:border-white/25 hover:bg-white/10'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
