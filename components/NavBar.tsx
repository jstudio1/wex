import Link from 'next/link';
import Image from 'next/image';
import { getAuthUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { NAVBAR_STORAGE_KEYS, extractStorageNavbarOrder } from '@/lib/navbar';
import dynamic from 'next/dynamic';

const NavLinks = dynamic(() => import('@/components/NavLinks'));
const MobileMenu = dynamic(() => import('@/components/MobileMenu'));
const UserProfileMenu = dynamic(() => import('@/components/UserProfileMenu'));
const NavAuthButtons = dynamic(() => import('@/components/NavAuthButtons'));

const NAVBAR_MENU_KEYS = [
  'NAVBAR_MENU_HOME',
  'NAVBAR_MENU_PRODUCTS',
  'NAVBAR_MENU_MTOPUP',
  'NAVBAR_MENU_CASHCARD',
  'NAVBAR_MENU_SOCIAL',
  'NAVBAR_MENU_CATEGORIES',
  'NAVBAR_MENU_GAMES',
  'NAVBAR_MENU_PREMIUM_APP',
  'NAVBAR_MENU_CONTACT',
  'NAVBAR_MENU_ORDER',
];

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

    let menuOrder: string[] = [...NAVBAR_STORAGE_KEYS];
    try {
      const orderValue = map.NAVBAR_MENU_ORDER;
      if (orderValue) {
        const parsed = JSON.parse(orderValue);
        menuOrder = extractStorageNavbarOrder(Array.isArray(parsed) ? parsed : undefined);
      }
    } catch {
      menuOrder = [...NAVBAR_STORAGE_KEYS];
    }

    return {
      home: getNavbarSetting('NAVBAR_MENU_HOME', true),
      products: getNavbarSetting('NAVBAR_MENU_PRODUCTS', true),
      mtopup: getNavbarSetting('NAVBAR_MENU_MTOPUP', true),
      cashcard: getNavbarSetting('NAVBAR_MENU_CASHCARD', true),
      social: getNavbarSetting('NAVBAR_MENU_SOCIAL', true),
      categories: getNavbarSetting('NAVBAR_MENU_CATEGORIES', true),
      games: getNavbarSetting('NAVBAR_MENU_GAMES', true),
      premiumApp: getNavbarSetting('NAVBAR_MENU_PREMIUM_APP', true),
      contact: getNavbarSetting('NAVBAR_MENU_CONTACT', true),
      blog: true,
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
      mtopup: true,
      cashcard: true,
      social: true,
      categories: true,
      games: true,
      premiumApp: true,
      contact: true,
      blog: true,
      menuOrder: [...NAVBAR_STORAGE_KEYS],
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

  const { data: maintenanceData } = await sb
    .from('settings')
    .select('value')
    .eq('key', 'MAINTENANCE_MODE')
    .maybeSingle();

  const isMaintenanceMode = maintenanceData?.value === 'true';

  if (isMaintenanceMode && !adminUser) {
    return null;
  }

  const isLoggedIn = !!user;

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-400/25 bg-black/70 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3"
            prefetch
            aria-label="Home"
          >
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-emerald-300/40 bg-gradient-to-br from-emerald-500/25 via-black to-cyan-500/20 shadow-lg shadow-emerald-900/45 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="https://img2.pic.in.th/pic/Holographic-Chatbot-Icon-over-Laptop-_8_.webp"
                alt="WeXPlus"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold tracking-[0.08em] text-white">WEXPLUS</p>
              <p className="text-[11px] text-white/65">Top-up | Apps | Digital Services</p>
            </div>
          </Link>

          <div className="hidden flex-1 px-5 lg:block">
            <div className="mx-auto max-w-5xl rounded-full border border-white/15 bg-black/35 p-1.5 shadow-[0_16px_35px_rgba(0,0,0,0.35)]">
              <NavLinks
                isAdmin={!!adminUser}
                navbarMenus={navbarMenus}
                navbarMenuOrder={navbarMenus.menuOrder}
                navbarMenuLabels={navbarMenus.menuLabels}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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

        <div className="hidden h-10 items-center justify-between border-t border-white/10 text-xs lg:flex">
          <div className="flex items-center gap-2 text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Fast auto delivery
            </span>
            <span className="text-white/50">Trusted digital marketplace</span>
          </div>
          <Link href="/contact" className="font-medium text-white/70 transition-colors hover:text-white">
            Need support? Contact team
          </Link>
        </div>
      </div>
    </header>
  );
}
