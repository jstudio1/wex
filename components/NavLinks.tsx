'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, Share2, Package, Trophy, Smartphone, CreditCard } from 'lucide-react';

type NavbarMenus = {
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
    products: { href: '/products', label: 'เติมเกม', icon: Gamepad2, key: 'products' },
    social: { href: '/social', label: 'ปั้มโซเชียล', icon: Share2, key: 'social' },
    categories: { href: '/categories', label: 'สินค้าอื่นๆ', icon: Package, key: 'categories' },
    games: { href: '/games', label: 'สุ่มรางวัล', icon: Trophy, key: 'games', requireAuth: true },
    premiumApp: { href: '/premium-app', label: 'แอพพรีเมี่ยม', icon: Smartphone, key: 'premiumApp' },
    cashcard: { href: '/cashcard', label: 'บัตรเติมเงิน', icon: CreditCard, key: 'cashcard' }
  };

  // Default order if not specified
  const defaultOrder = ['products', 'social', 'categories', 'games', 'premiumApp', 'cashcard'];
  const order = navbarMenuOrder || defaultOrder;

  // Build items array based on order, then filter by visibility and auth requirement
  const items = order
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
    <div className="flex items-center gap-5 md:gap-6 text-sm md:text-base font-medium">
      {items.map((it) => {
        const active = pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href));
        const Icon = it.icon;
        
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`relative hover:opacity-80 transition-opacity no-underline flex items-center gap-1 ${active ? 'text-white' : 'text-white/80'}`}
            style={{ color: 'inherit' }}
          >
            <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            {it.label}
            <span
              className={`absolute -bottom-2 left-0 h-0.5 w-full origin-left scale-x-0 rounded bg-accent transition-transform duration-200 ${active ? 'scale-x-100' : ''}`}
            />
          </Link>
        );
      })}
    </div>
  );
}


