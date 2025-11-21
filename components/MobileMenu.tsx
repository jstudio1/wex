'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOutIcon, MenuIcon, UserCircle, ShoppingBag, Wallet, Settings, Receipt, Share2, Package, Trophy, Gamepad2, Smartphone, CreditCard, Home, LogIn, UserPlus, Mail, FileText, MessageSquare, Shield, BookOpen, Phone, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useToast } from '@/components/ui/use-toast';
import ReCaptcha from '@/components/ReCaptcha';
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
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const { points, loading } = useWalletBalance({ enabled: isLoggedIn });
  const toast = useToast();
  const [recaptchaEnabled, setRecaptchaEnabled] = useState(false);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('');
  const [registerEnabled, setRegisterEnabled] = useState(true);
  
  // Get first letter of username for avatar
  const avatarLetter = username?.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/recaptcha/config', { cache: 'no-store' }).then((res) => res.json()),
      fetch('/api/site', { cache: 'no-store' }).then((res) => res.json())
    ])
      .then(([recaptchaData, siteData]) => {
        setRecaptchaEnabled(recaptchaData.enabled === true);
        setRecaptchaSiteKey(recaptchaData.siteKey || '');
        setRegisterEnabled(siteData.registerEnabled !== false);
      })
      .catch(() => {
        setRecaptchaEnabled(false);
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
                        href="/terms-policy"
                      >
                        <FileText className="h-4 w-4 text-emerald-500/70 transition-colors duration-200 group-hover:text-white" />
                        ข้อกำหนดการใช้งาน
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
                      setTimeout(() => setLoginDialogOpen(true), 100);
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
                      setTimeout(() => setRegisterDialogOpen(true), 100);
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
      {mounted && createPortal(
        <>
          <MobileLoginDialog 
            open={loginDialogOpen} 
            onOpenChange={setLoginDialogOpen}
            onSwitchToRegister={() => {
              if (!registerEnabled) {
                toast.show({
                  title: 'การสมัครสมาชิกถูกปิดใช้งาน',
                  description: 'ขณะนี้ไม่สามารถสมัครสมาชิกใหม่ได้',
                  variant: 'destructive'
                });
                return;
              }
              setLoginDialogOpen(false);
              setRegisterDialogOpen(true);
            }}
            recaptchaEnabled={recaptchaEnabled}
            recaptchaSiteKey={recaptchaSiteKey}
          />
          <MobileRegisterDialog 
            open={registerDialogOpen} 
            onOpenChange={setRegisterDialogOpen}
            onSwitchToLogin={() => {
              setRegisterDialogOpen(false);
              setLoginDialogOpen(true);
            }}
            recaptchaEnabled={recaptchaEnabled}
            recaptchaSiteKey={recaptchaSiteKey}
            registerEnabled={registerEnabled}
          />
        </>,
        document.body
      )}
    </>
  );
}

function MobileLoginDialog({ open, onOpenChange, onSwitchToRegister, recaptchaEnabled, recaptchaSiteKey }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSwitchToRegister: () => void;
  recaptchaEnabled: boolean;
  recaptchaSiteKey: string;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginRecaptchaToken, setLoginRecaptchaToken] = useState<string | null>(null);
  const [loginRecaptchaKey, setLoginRecaptchaKey] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (recaptchaEnabled && !loginRecaptchaToken) {
      setError('กรุณายืนยัน reCaptcha');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          usernameOrEmail: username, 
          password,
          ...(loginRecaptchaToken && { recaptchaToken: loginRecaptchaToken })
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || json?.error || 'เข้าสู่ระบบไม่สำเร็จ');
      window.dispatchEvent(new Event('wallet:changed'));
      window.location.reload();
    } catch (err: unknown) {
      setError((err as Error).message);
      if (recaptchaEnabled) {
        setLoginRecaptchaToken(null);
        setLoginRecaptchaKey((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  const resetState = () => { 
    setUsername(''); 
    setPassword(''); 
    setError(null); 
    setLoading(false); 
    setLoginRecaptchaToken(null);
    setLoginRecaptchaKey((prev) => prev + 1);
  };

  return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetState();
      }}>
        <DialogContent className="sm:max-w-[480px] bg-[#0a0a0a] border border-gray-800 shadow-2xl p-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 px-8 py-6 relative overflow-hidden rounded-t-2xl">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <LogIn className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">เข้าสู่ระบบ</h2>
              </div>
              <p className="text-white/95 text-sm">กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งาน</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="px-8 py-6 space-y-5 bg-[#0a0a0a]">
            <div className="space-y-2">
              <Label htmlFor="mobile-username" className="text-gray-300 font-medium text-sm">ชื่อผู้ใช้หรืออีเมล</Label>
              <Input 
                id="mobile-username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="กรอกชื่อผู้ใช้หรืออีเมลของคุณ" 
                required 
                className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-11 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile-password" className="text-gray-300 font-medium text-sm">รหัสผ่าน</Label>
              <Input 
                id="mobile-password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="กรอกรหัสผ่าน" 
                required 
                className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-11 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="mobile-remember" className="w-4 h-4 accent-emerald-600 rounded" />
                <span className="text-sm text-gray-300">จดจำการเข้าสู่ระบบ</span>
              </label>
            </div>
            {recaptchaEnabled && recaptchaSiteKey && open && (
              <div className="flex justify-center" key={`mobile-login-recaptcha-${loginRecaptchaKey}`}>
                <ReCaptcha
                  siteKey={recaptchaSiteKey}
                  onVerify={(token) => setLoginRecaptchaToken(token)}
                  onExpire={() => setLoginRecaptchaToken(null)}
                  onError={() => {
                    setLoginRecaptchaToken(null);
                    setError('เกิดข้อผิดพลาดกับ reCaptcha');
                  }}
                  disabled={loading}
                />
              </div>
            )}
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white h-12 rounded-lg font-semibold shadow-lg shadow-emerald-500/30"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  เข้าสู่ระบบ
                </>
              )}
            </Button>
            <div className="flex gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => {
                  resetState();
                  onSwitchToRegister();
                }}
                className="flex-1 inline-flex items-center justify-center border-2 border-emerald-600 bg-[#0a0a0a] text-emerald-500 hover:bg-emerald-900/30 hover:border-emerald-500 hover:text-emerald-400 h-11 rounded-lg font-semibold transition-colors"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                สมัครสมาชิก
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );
}

function MobileRegisterDialog({ open, onOpenChange, onSwitchToLogin, recaptchaEnabled, recaptchaSiteKey, registerEnabled }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin: () => void;
  recaptchaEnabled: boolean;
  recaptchaSiteKey: string;
  registerEnabled: boolean;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerRecaptchaToken, setRegisterRecaptchaToken] = useState<string | null>(null);
  const [registerRecaptchaKey, setRegisterRecaptchaKey] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!registerEnabled) {
      setError('การสมัครสมาชิกถูกปิดใช้งาน');
      return;
    }
    if (password !== repassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    if (recaptchaEnabled && !registerRecaptchaToken) {
      setError('กรุณายืนยัน reCaptcha');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password,
          ...(registerRecaptchaToken && { recaptchaToken: registerRecaptchaToken })
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || json?.error || 'สมัครสมาชิกไม่สำเร็จ');
      // Close register and open login
      resetState();
      onSwitchToLogin();
    } catch (err: unknown) {
      setError((err as Error).message);
      if (recaptchaEnabled) {
        setRegisterRecaptchaToken(null);
        setRegisterRecaptchaKey((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  const resetState = () => { 
    setUsername(''); 
    setPassword(''); 
    setRepassword('');
    setError(null); 
    setLoading(false); 
    setRegisterRecaptchaToken(null);
    setRegisterRecaptchaKey((prev) => prev + 1);
  };

  return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetState();
      }}>
        <DialogContent className="sm:max-w-[480px] bg-[#0a0a0a] border border-gray-800 shadow-2xl p-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 px-8 py-6 relative overflow-hidden rounded-t-2xl">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">สมัครสมาชิก</h2>
              </div>
              <p className="text-white/95 text-sm">สร้างบัญชีใหม่เพื่อเริ่มต้นใช้งาน</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="px-8 py-6 space-y-5 bg-[#0a0a0a]">
            <div className="space-y-2">
              <Label htmlFor="mobile-reg-username" className="text-gray-300 font-medium text-sm">ชื่อผู้ใช้</Label>
              <Input 
                id="mobile-reg-username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="กรอกชื่อผู้ใช้" 
                required 
                className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-11 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile-reg-password" className="text-gray-300 font-medium text-sm">รหัสผ่าน</Label>
              <Input 
                id="mobile-reg-password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="กรอกรหัสผ่าน" 
                required 
                className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-11 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile-reg-repassword" className="text-gray-300 font-medium text-sm">ยืนยันรหัสผ่าน</Label>
              <Input 
                id="mobile-reg-repassword" 
                type="password" 
                value={repassword} 
                onChange={(e) => setRepassword(e.target.value)} 
                placeholder="กรอกรหัสผ่านอีกครั้ง" 
                required 
                className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-11 rounded-lg"
              />
            </div>
            {recaptchaEnabled && recaptchaSiteKey && open && (
              <div className="flex justify-center" key={`mobile-register-recaptcha-${registerRecaptchaKey}`}>
                <ReCaptcha
                  siteKey={recaptchaSiteKey}
                  onVerify={(token) => setRegisterRecaptchaToken(token)}
                  onExpire={() => setRegisterRecaptchaToken(null)}
                  onError={() => {
                    setRegisterRecaptchaToken(null);
                    setError('เกิดข้อผิดพลาดกับ reCaptcha');
                  }}
                  disabled={loading}
                />
              </div>
            )}
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white h-12 rounded-lg font-semibold shadow-lg shadow-emerald-500/30"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  กำลังสมัคร...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  สมัครสมาชิก
                </>
              )}
            </Button>
            <div className="flex gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => {
                  resetState();
                  onSwitchToLogin();
                }}
                className="flex-1 inline-flex items-center justify-center border-2 border-emerald-600 bg-[#0a0a0a] text-emerald-500 hover:bg-emerald-900/30 hover:border-emerald-500 hover:text-emerald-400 h-11 rounded-lg font-semibold transition-colors"
              >
                <LogIn className="mr-2 h-5 w-5" />
                เข้าสู่ระบบ
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );
}



