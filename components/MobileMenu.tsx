'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOutIcon, MenuIcon, UserCircle, ShoppingBag, Wallet, Settings, Receipt, Share2, Package, Trophy, Gamepad2, Smartphone, CreditCard, Home, Mail, FileText, MessageSquare, Shield, BookOpen, Phone, Grid3x3 } from 'lucide-react';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useToast } from '@/components/ui/use-toast';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
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

type Props = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  username?: string | null;
  avatarUrl?: string | null;
  navbarMenus: NavbarMenus;
  navbarMenuOrder?: string[];
  navbarMenuLabels?: {
    products?: string;
    premiumApp?: string;
    social?: string;
    contact?: string;
  };
};

export default function MobileMenu({ isLoggedIn, isAdmin, username, avatarUrl, navbarMenus, navbarMenuOrder, navbarMenuLabels }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const { openLoginDialog, openRegisterDialog } = useAuthDialog();
  const { points, loading } = useWalletBalance({ enabled: isLoggedIn });
  const toast = useToast();
  const [registerEnabled, setRegisterEnabled] = useState(true);

  // Get first letter of username for avatar
  const avatarLetter = username?.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch('/api/site', { cache: 'no-store' })
      .then((res) => res.json())
      .then((siteData) => {
        setRegisterEnabled(siteData.registerEnabled !== false);
      })
      .catch(() => {
        setRegisterEnabled(true);
      });
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
      <aside className={`absolute right-0 top-0 h-full w-80 border-l border-gray-800 bg-[#0a0a0a] text-white shadow-xl overflow-y-auto transition-transform duration-300 ease-out ${
        isOpening ? 'translate-x-0' : 'translate-x-full'
      }`}>
            <div className="flex h-20 items-center justify-between border-b border-gray-800 bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-950 px-4 text-white">
              <span className="text-xl font-bold text-white">เมนู</span>
            </div>

            {isLoggedIn && username && (
              <div className="border-b border-gray-800 bg-[#1a1a1a] px-4 py-5">
                <div className="flex items-center gap-3">
                  {/* Avatar Circle with Gradient */}
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 shadow-lg overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={username || 'User'} className="w-full h-full object-cover" />
                    ) : (
                    <span className="text-xl font-bold text-white">{avatarLetter}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-white">{username}</div>
                    <div className="text-sm text-gray-400">
                      เครดิต: {loading && points === null ? '—' : (points ?? 0).toFixed(2)} บาท
                    </div>
                  </div>
                </div>
              </div>
            )}

            <nav className="space-y-1.5 px-4 py-5">
              {isLoggedIn && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">บัญชี</div>
                  <Link
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-emerald-700 hover:text-white focus:outline-none focus-visible:outline-none"
                    href="/account"
                  >
                    <UserCircle className="h-5 w-5 text-emerald-500 transition-colors duration-200 group-hover:text-white" />
                    ตั้งค่าโปรไฟล์
                  </Link>
                  <Link
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-emerald-700 hover:text-white focus:outline-none focus-visible:outline-none"
                    href="/wallet/topup"
                  >
                    <Wallet className="h-5 w-5 text-emerald-500 transition-colors duration-200 group-hover:text-white" />
                    เติมเงิน
                  </Link>
                  <Link
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-emerald-700 hover:text-white focus:outline-none focus-visible:outline-none"
                    href="/orders"
                  >
                    <Receipt className="h-5 w-5 text-emerald-500 transition-colors duration-200 group-hover:text-white" />
                    ประวัติ
                  </Link>
                  <Link
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-emerald-700 hover:text-white focus:outline-none focus-visible:outline-none"
                    href="/tools/2fa"
                  >
                    <Shield className="h-5 w-5 text-emerald-500 transition-colors duration-200 group-hover:text-white" />
                    เครื่องมือ
                  </Link>
                  <div className="my-4 h-px bg-gray-800" />
                </>
              )}

              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">เมนูหลัก</div>
              {(() => {
                const allItemsMap: Record<string, { href: string; label: string; icon: typeof Gamepad2; key: keyof NavbarMenus; requireAuth?: boolean }> = {
                  home: { href: '/', label: 'หน้าหลัก', icon: Home, key: 'home' },
                  products: { href: '/products', label: navbarMenuLabels?.products || 'เติมเกม', icon: Gamepad2, key: 'products' },
                  mtopup: { href: '/mtopup', label: 'เติมเงินมือถือ', icon: Phone, key: 'mtopup' },
                  cashcard: { href: '/cashcard', label: 'บัตรเติมเงิน', icon: CreditCard, key: 'cashcard' },
                  premiumApp: { href: '/premium-app', label: navbarMenuLabels?.premiumApp || 'แอพ', icon: Smartphone, key: 'premiumApp' },
                  social: { href: '/social/order/add', label: navbarMenuLabels?.social || 'ปั้ม', icon: Share2, key: 'social' },
                  categories: { href: '/categories', label: 'สินค้าอื่นๆ', icon: Grid3x3, key: 'categories' },
                  blog: { href: '/blog', label: 'How To', icon: BookOpen, key: 'blog' },
                };

                const orderedKeys = normalizeNavbarOrder(navbarMenuOrder);

                const items = orderedKeys
                  .filter(key => key !== 'contact')
                  .map(key => allItemsMap[key])
                  .filter(item => {
                    if (!item) return false;
                    // Filter by navbar menu setting
                    if (navbarMenus[item.key] === false) return false;
                    return true;
                  });

                const menuItems = items.map((item) => {
                  const Icon = item.icon;
                  return (
              <Link
                      key={item.href}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-emerald-700 hover:text-white focus:outline-none focus-visible:outline-none"
                      href={item.href}
              >
                      <Icon className="h-5 w-5 text-emerald-500 transition-colors duration-200 group-hover:text-white" />
                      {item.label}
              </Link>
                  );
                });

                // Add contact menu if enabled and in order
                if (isLoggedIn && orderedKeys.includes('contact') && navbarMenus.contact !== false) {
                  menuItems.push(
                    <div key="contact-menu" className="space-y-1">
                      <Link
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-emerald-700 hover:text-white focus:outline-none focus-visible:outline-none"
                        href="/contact"
                      >
                        <Mail className="h-5 w-5 text-emerald-500 transition-colors duration-200 group-hover:text-white" />
                        {navbarMenuLabels?.contact || 'ติดต่อเรา'}
                      </Link>
                      {isLoggedIn && (
                        <Link
                          onClick={() => setOpen(false)}
                          className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-emerald-700 hover:text-white pl-11 focus:outline-none focus-visible:outline-none"
                          href="/account/tickets"
                        >
                          <MessageSquare className="h-4 w-4 text-emerald-500/70 transition-colors duration-200 group-hover:text-white" />
                          Ticket Support
                        </Link>
                      )}
                      <Link
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-emerald-700 hover:text-white pl-11 focus:outline-none focus-visible:outline-none"
                        href="/terms"
                      >
                        <FileText className="h-4 w-4 text-emerald-500/70 transition-colors duration-200 group-hover:text-white" />
                        ข้อกำหนดการใช้งาน
                      </Link>
                      <Link
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-emerald-700 hover:text-white pl-11 focus:outline-none focus-visible:outline-none"
                        href="/privacy"
                      >
                        <FileText className="h-4 w-4 text-emerald-500/70 transition-colors duration-200 group-hover:text-white" />
                        นโยบายความเป็นส่วนตัว
                      </Link>
                    </div>
                  );
                }

                return menuItems;
              })()}

              {isLoggedIn && (
                <>
                  {isAdmin && (
                    <>
                      <div className="my-4 h-px bg-gray-800" />
                      <Link
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-emerald-700 hover:text-white focus:outline-none focus-visible:outline-none"
                        href="/backoffice"
                      >
                        <Settings className="h-5 w-5 text-emerald-500 transition-colors duration-200 group-hover:text-white" />
                        หลังบ้าน
                      </Link>
                    </>
                  )}
                  <div className="my-4 h-px bg-gray-800" />
                  <form action="/api/auth/logout" method="post" className="w-full">
                    <button
                      type="submit"
                      onClick={() => {
                        setTimeout(() => setOpen(false), 100);
                      }}
                      className="w-full inline-flex items-center justify-start rounded-lg border-2 border-emerald-600 bg-[#0a0a0a] text-emerald-500 px-4 py-3 font-semibold transition-all duration-200 hover:bg-emerald-900/30 hover:border-emerald-500 hover:text-emerald-400"
                    >
                      <LogOutIcon className="mr-3 h-5 w-5" />
                      ออกจากระบบ
                    </button>
                </form>
                </>
              )}

              {!isLoggedIn && (
                <>
                  <div className="my-4 h-px bg-gray-800" />
                  <button
                    onClick={() => {
                      setOpen(false);
                      setTimeout(() => openLoginDialog(), 100);
                    }}
                    className="w-full inline-flex items-center justify-center rounded-lg border-2 border-emerald-600 bg-[#0a0a0a] text-emerald-500 transition-all duration-200 hover:bg-emerald-900/30 hover:border-emerald-500 hover:text-emerald-400 font-semibold h-11"
                  >
                    เข้าสู่ระบบ
                  </button>
                  <button
                    onClick={() => {
                      if (!registerEnabled) {
                        toast.show({
                          title: 'การสมัครสมาชิกถูกปิดใช้งาน',
                          description: 'ขณะนี้ไม่สามารถสมัครสมาชิกใหม่ได้',
                          variant: 'destructive'
                        });
                        return;
                      }
                      setOpen(false);
                      setTimeout(() => openRegisterDialog(), 100);
                    }}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg transition-all duration-200 font-semibold h-11"
                  >
                    สมัครสมาชิก
                  </button>
                </>
              )}
            </nav>
          </aside>
        </div>
      ) : null;

  return (
    <>
      <button
        className="lg:hidden inline-flex items-center justify-center rounded-md bg-white/10 p-2 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
        aria-label="Open Menu"
        onClick={() => setOpen(true)}
      >
        <MenuIcon className="h-6 w-6" />
      </button>
      {mounted && createPortal(menuContent, document.body)}
    </>
  );
}
