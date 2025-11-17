'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOutIcon, MenuIcon, UserCircle, ShoppingBag, Wallet, Settings, Receipt, Share2, Package, Trophy, Gamepad2, Smartphone, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
const PointsBadge = dynamic(() => import('@/components/PointsBadge'), { ssr: false });

type NavbarMenus = {
  products: boolean;
  social: boolean;
  categories: boolean;
  games: boolean;
  premiumApp: boolean;
  cashcard: boolean;
};

type Props = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  username?: string | null;
  navbarMenus: NavbarMenus;
  navbarMenuOrder?: string[];
};

export default function MobileMenu({ isLoggedIn, isAdmin, username, navbarMenus, navbarMenuOrder }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Handle open/close animation
  useEffect(() => {
    if (open) {
      // Show menu first (off-screen)
      setShowMenu(true);
      setIsOpening(false);
      // Small delay to ensure menu is rendered off-screen before animating
      const timer = setTimeout(() => {
        setIsOpening(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      // Start closing animation
      setIsOpening(false);
      // Delay hiding until animation completes
      const timer = setTimeout(() => setShowMenu(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [open]);

  const menuContent = showMenu && mounted ? (
    <div className="fixed inset-0 z-[99999] lg:hidden" style={{ isolation: 'isolate' }}>
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setOpen(false)}
      />
      <aside className={`absolute right-0 top-0 h-full w-80 bg-[color:var(--bg)] shadow-xl border-l border-white/10 overflow-y-auto transition-transform duration-300 ease-out ${
        isOpening ? 'translate-x-0' : 'translate-x-full'
      }`}>
            <div className="flex items-center justify-between px-4 h-16 border-b border-white/10 bg-gradient-to-br from-white/5 to-transparent">
              <span className="text-base font-semibold text-white">เมนู</span>
            </div>
            
            {isLoggedIn && username && (
              <div className="px-4 py-4 border-b border-white/10 bg-gradient-to-br from-white/5 to-transparent">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid size-12 place-items-center rounded-full bg-white/15 ring-1 ring-white/20">
                    <UserCircle className="size-7 text-white/90" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-white">{username}</div>
                    <div className="text-xs text-white/60">โปรไฟล์ของฉัน</div>
                  </div>
                </div>
                <Link 
                  href="/wallet/topup" 
                  onClick={() => setOpen(false)}
                  className="block w-full"
                >
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <PointsBadge />
                  </div>
                </Link>
              </div>
            )}

            <nav className="p-4 space-y-1">
              <div className="text-xs font-semibold text-white/60 uppercase tracking-wider px-2 mb-2">เมนูหลัก</div>
              {(() => {
                const allItemsMap: Record<string, { href: string; label: string; icon: typeof Gamepad2; key: keyof NavbarMenus; requireAuth?: boolean }> = {
                  products: { href: '/products', label: 'เติมเกม', icon: Gamepad2, key: 'products' },
                  social: { href: '/social', label: 'ปั้มโซเชียล', icon: Share2, key: 'social' },
                  categories: { href: '/categories', label: 'สินค้าอื่นๆ', icon: Package, key: 'categories' },
                  games: { href: '/games', label: 'สุ่มรางวัล', icon: Trophy, key: 'games', requireAuth: true },
                  premiumApp: { href: '/premium-app', label: 'แอพพรีเมี่ยม', icon: Smartphone, key: 'premiumApp' },
                  cashcard: { href: '/cashcard', label: 'บัตรเติมเงิน', icon: CreditCard, key: 'cashcard' }
                };

                const defaultOrder = ['products', 'social', 'categories', 'games', 'premiumApp', 'cashcard'];
                const order = navbarMenuOrder || defaultOrder;

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

                return items.map((item) => {
                  const Icon = item.icon;
                  return (
              <Link 
                      key={item.href}
                onClick={() => setOpen(false)} 
                className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors font-medium text-base" 
                      href={item.href}
              >
                      <Icon className="size-5 text-white/80" />
                      {item.label}
              </Link>
                  );
                });
              })()}

              {isLoggedIn && (
                <>
                  <div className="h-px bg-white/10 my-3" />
                  <div className="text-xs font-semibold text-white/60 uppercase tracking-wider px-2 mb-2">บัญชี</div>
                  <Link 
                    onClick={() => setOpen(false)} 
                    className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors font-medium text-base" 
                    href="/orders"
                  >
                    <Receipt className="size-5 text-white/80" />
                    ประวัติ
                  </Link>
                  <Link 
                    onClick={() => setOpen(false)} 
                    className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors font-medium text-base" 
                    href="/wallet/topup"
                  >
                    <Wallet className="size-5 text-white/80" />
                    เติมพอยต์
                  </Link>
                  <Link 
                    onClick={() => setOpen(false)} 
                    className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors font-medium text-base" 
                    href="/account"
                  >
                    <UserCircle className="size-5 text-white/80" />
                    ตั้งค่าโปรไฟล์
                  </Link>
                  {isAdmin && (
                    <Link 
                      onClick={() => setOpen(false)} 
                      className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors font-medium text-base" 
                      href="/backoffice"
                    >
                      <Settings className="size-5 text-white/80" />
                      หลังบ้าน
                    </Link>
                  )}
                  <div className="h-px bg-white/10 my-3" />
                  <form action="/api/auth/logout" method="post" className="w-full">
                    <Button 
                      className="w-full justify-start" 
                      type="submit" 
                      variant="outline"
                      onClick={() => {
                        setTimeout(() => setOpen(false), 100);
                      }}
                    >
                      <LogOutIcon className="size-5 mr-3" />
                      ออกจากระบบ
                    </Button>
                </form>
                </>
              )}

              {!isLoggedIn && (
                <>
                  <div className="h-px bg-white/10 my-3" />
                  <Button 
                    variant="outline"
                    asChild
                    className="w-full"
                  >
                    <Link 
                      href="/login" 
                      onClick={() => setOpen(false)}
                    >
                      เข้าสู่ระบบ
                    </Link>
                  </Button>
                  <Button 
                    asChild
                    className="w-full"
                  >
                    <Link 
                      href="/register" 
                      onClick={() => setOpen(false)}
                    >
                      สมัครสมาชิก
                    </Link>
                  </Button>
                </>
              )}
            </nav>
          </aside>
        </div>
      ) : null;

  return (
    <>
      <button className="lg:hidden inline-flex items-center justify-center rounded-md border border-white/20 p-2.5 text-white hover:bg-white/10 transition-colors" aria-label="Open Menu" onClick={() => setOpen(true)}>
        <MenuIcon className="size-6" />
      </button>
      {mounted && createPortal(menuContent, document.body)}
    </>
  );
}



