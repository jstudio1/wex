'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, Share2, Package, Trophy, Smartphone, CreditCard, Home } from 'lucide-react';

type NavbarMenus = {
  home: boolean;
  products: boolean;
  social: boolean;
  categories: boolean;
  games: boolean;
  premiumApp: boolean;
  cashcard: boolean;
};

export default function NavLinks({ 
  isAdmin,
  navbarMenus,
  navbarMenuOrder,
  isLoggedIn
}: { 
  isAdmin: boolean;
  navbarMenus: NavbarMenus;
  navbarMenuOrder?: string[];
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname() || '/';
  const allItemsMap: Record<string, { href: string; label: string; icon: typeof Gamepad2; key: keyof NavbarMenus; requireAuth?: boolean }> = {
    home: { href: '/', label: 'หน้าแรก', icon: Home, key: 'home' },
    products: { href: '/products', label: 'เติมเกม', icon: Gamepad2, key: 'products' },
    social: { href: '/social', label: 'ปั้มโซเชียล', icon: Share2, key: 'social' },
    categories: { href: '/categories', label: 'สินค้าอื่นๆ', icon: Package, key: 'categories' },
    games: { href: '/games', label: 'สุ่มรางวัล', icon: Trophy, key: 'games', requireAuth: true },
    premiumApp: { href: '/premium-app', label: 'แอพพรีเมี่ยม', icon: Smartphone, key: 'premiumApp' },
    cashcard: { href: '/cashcard', label: 'บัตรเติมเงิน', icon: CreditCard, key: 'cashcard' }
  };

  // Default order with home always first
  const defaultOrder = ['home', 'products', 'social', 'categories', 'games', 'premiumApp', 'cashcard'];
  const order = navbarMenuOrder || defaultOrder;
  
  // Ensure 'home' is always first if it exists in the order
  const orderedKeys = order.includes('home') 
    ? ['home', ...order.filter(key => key !== 'home')]
    : ['home', ...order];

  // Build items array based on order, then filter by visibility and auth requirement
  const items = orderedKeys
    .map(key => allItemsMap[key])
    .filter(item => {
      if (!item) return false;
      // Filter by navbar menu setting
      if (navbarMenus[item.key] === false) return false;
      // Filter by auth requirement - games menu requires login
      if (item.requireAuth && !isLoggedIn) return false;
      return true;
    });

  return (
    <nav
      className="flex items-center gap-1"
      aria-label="เมนูหลัก"
    >
      {items.map((it) => {
        const active = pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href));
        const Icon = it.icon;
        const baseClasses =
          'group relative inline-flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300 !text-white overflow-hidden';
        const stateClasses = active
          ? 'bg-gradient-to-r from-emerald-500/30 to-emerald-600/30 shadow-lg shadow-emerald-500/20 border border-emerald-400/30'
          : 'hover:bg-white/10 hover:border-white/20 border border-transparent';
        
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`${baseClasses} ${stateClasses}`}
          >
            {/* Active indicator */}
            {active && (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-emerald-500/20 animate-pulse"></div>
            )}
            
            {/* Hover shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            
            <Icon
              className={`relative z-10 h-5 w-5 text-white transition-all duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}
            />
            <span className="relative z-10 leading-none text-white drop-shadow-sm">{it.label}</span>
            
            {/* Active bottom border */}
            {active && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}


