import Link from 'next/link';
import Image from 'next/image';
import { getAuthUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const NavLinks = dynamic(() => import('@/components/NavLinks'), { ssr: false });
const MobileMenu = dynamic(() => import('@/components/MobileMenu'), { ssr: false });
const UserProfileMenu = dynamic(() => import('@/components/UserProfileMenu'), { ssr: false });
const NavAuthButtons = dynamic(() => import('@/components/NavAuthButtons'), { ssr: false });

const NAVBAR_MENU_KEYS = [
  'NAVBAR_MENU_HOME',
  'NAVBAR_MENU_PRODUCTS',
  'NAVBAR_MENU_SOCIAL',
  'NAVBAR_MENU_CATEGORIES',
  'NAVBAR_MENU_GAMES',
  'NAVBAR_MENU_PREMIUM_APP',
  'NAVBAR_MENU_CASHCARD',
  'NAVBAR_MENU_CONTACT',
  'NAVBAR_MENU_ORDER',
];

const DEFAULT_MENU_ORDER = ['home', 'products', 'premiumApp', 'social', 'contact'] as const;

async function getNavbarMenus() {
  try {
    const sb = createServiceClient();
    const { data } = await sb.from('settings').select('key, value').in('key', [
      ...NAVBAR_MENU_KEYS,
      'NAVBAR_MENU_LABEL_PRODUCTS',
      'NAVBAR_MENU_LABEL_PREMIUM_APP',
      'NAVBAR_MENU_LABEL_SOCIAL',
      'NAVBAR_MENU_LABEL_CONTACT',
    ]);
    const map: Record<string, string> = {};
    for (const row of data || []) map[row.key as string] = row.value as string;
    
    const getNavbarSetting = (key: string, defaultValue: boolean = true) => {
      const value = map[key];
      return value === 'false' ? false : (value === 'true' ? true : defaultValue);
    };

    // Get navbar menu order
    let menuOrder: string[] = [...DEFAULT_MENU_ORDER];
    try {
      const orderValue = map.NAVBAR_MENU_ORDER;
      if (orderValue) {
        const parsed = JSON.parse(orderValue);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((item): item is string => typeof item === 'string' && (DEFAULT_MENU_ORDER as readonly string[]).includes(item));
          const unique = Array.from(new Set(filtered));
          for (const key of DEFAULT_MENU_ORDER) {
            if (!unique.includes(key)) unique.push(key);
          }
          menuOrder = unique;
        } else {
          menuOrder = [...DEFAULT_MENU_ORDER];
        }
      } else {
        menuOrder = [...DEFAULT_MENU_ORDER];
      }
    } catch {
      menuOrder = [...DEFAULT_MENU_ORDER];
    }

    return {
      home: getNavbarSetting('NAVBAR_MENU_HOME', true),
      products: getNavbarSetting('NAVBAR_MENU_PRODUCTS', true),
      social: getNavbarSetting('NAVBAR_MENU_SOCIAL', true),
      categories: getNavbarSetting('NAVBAR_MENU_CATEGORIES', true),
      games: getNavbarSetting('NAVBAR_MENU_GAMES', true),
      premiumApp: getNavbarSetting('NAVBAR_MENU_PREMIUM_APP', true),
      cashcard: getNavbarSetting('NAVBAR_MENU_CASHCARD', true),
      contact: getNavbarSetting('NAVBAR_MENU_CONTACT', true),
      menuOrder,
      menuLabels: {
        products: map.NAVBAR_MENU_LABEL_PRODUCTS || 'เติมเกม',
        premiumApp: map.NAVBAR_MENU_LABEL_PREMIUM_APP || 'แอพ',
        social: map.NAVBAR_MENU_LABEL_SOCIAL || 'ปั้ม',
        contact: map.NAVBAR_MENU_LABEL_CONTACT || 'ติดต่อเรา',
      },
    };
  } catch {
    return {
      home: true,
      products: true,
      social: true,
      categories: true,
      games: true,
      premiumApp: true,
      cashcard: true,
      contact: true,
      menuOrder: [...DEFAULT_MENU_ORDER],
      menuLabels: {
        products: 'เติมเกม',
        premiumApp: 'แอพ',
        social: 'ปั้ม',
        contact: 'ติดต่อเรา',
      },
    };
  }
}

export default async function NavBar() {
  const user = await getAuthUser();
  const adminUser = await requireAdmin();
  const navbarMenus = await getNavbarMenus();
  const sb = createServiceClient();
  
  // ดึง avatar_url สำหรับ user
  let userAvatarUrl: string | null = null;
  if (user) {
    try {
      const { data } = await sb
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      userAvatarUrl = data?.avatar_url || null;
    } catch {
      // ignore error
    }
  }
  
  // Check maintenance mode
  const { data: maintenanceData } = await sb
    .from('settings')
    .select('value')
    .eq('key', 'MAINTENANCE_MODE')
    .maybeSingle();
  
  const isMaintenanceMode = maintenanceData?.value === 'true';
  
  // Hide navbar if maintenance mode is on (unless user is admin)
  if (isMaintenanceMode && !adminUser) {
    return null;
  }
  
  const isLoggedIn = !!user;

  return (
    <header className="sticky top-0 z-50 relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 shadow-2xl border-b border-emerald-800/50 backdrop-blur-xl">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/50 via-emerald-800/30 to-emerald-900/50 animate-gradient-x"></div>
      
      {/* Decorative Background Patterns */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-10 h-32 w-32 rounded-full bg-emerald-400 blur-3xl animate-pulse" />
        <div className="absolute top-0 right-20 h-24 w-24 rounded-full bg-emerald-300 blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/4 h-20 w-20 rounded-full bg-emerald-500 blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 right-1/3 h-16 w-16 rounded-full bg-emerald-400 blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Geometric Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-full" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shine"></div>
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-6">
          <div className="flex flex-1 items-center gap-6">
            {/* Logo */}
            <div className="flex flex-shrink-0 items-center">
              <Link
                href="/"
                className="group flex items-center transition-all duration-300 hover:scale-105"
                prefetch
                aria-label="หน้าแรก"
              >
                <Image
                  src="https://img2.pic.in.th/pic/Holographic-Chatbot-Icon-over-Laptop-_8_.webp"
                  alt="WeXPlus"
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain drop-shadow-lg"
                  priority
                />
                <span className="sr-only">WeXPlus</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden flex-1 items-center lg:flex">
              <NavLinks
                isAdmin={!!adminUser}
                navbarMenus={navbarMenus}
                navbarMenuOrder={navbarMenus.menuOrder}
                navbarMenuLabels={navbarMenus.menuLabels}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex flex-shrink-0 items-center gap-3">
            {isLoggedIn ? (
              <div className="hidden lg:flex">
                <UserProfileMenu username={user.username} isAdmin={!!adminUser} avatarUrl={userAvatarUrl} />
              </div>
            ) : (
              <NavAuthButtons />
            )}

            <div className="lg:hidden">
              <MobileMenu
                isLoggedIn={isLoggedIn}
                isAdmin={!!adminUser}
                username={user?.username || null}
                avatarUrl={userAvatarUrl}
                navbarMenus={navbarMenus}
                navbarMenuOrder={navbarMenus.menuOrder}
                navbarMenuLabels={navbarMenus.menuLabels}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


