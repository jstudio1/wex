import Link from 'next/link';
import Image from 'next/image';
import { getAuthUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const PointsBadge = dynamic(() => import('@/components/PointsBadge'), { ssr: false });
const NavLinks = dynamic(() => import('@/components/NavLinks'), { ssr: false });
const MobileMenu = dynamic(() => import('@/components/MobileMenu'), { ssr: false });
const UserProfileMenu = dynamic(() => import('@/components/UserProfileMenu'), { ssr: false });
const NavAuthButtons = dynamic(() => import('@/components/NavAuthButtons'), { ssr: false });

async function getNavbarMenus() {
  try {
    const sb = createServiceClient();
    const { data } = await sb.from('settings').select('key, value').in('key', [
      'NAVBAR_MENU_PRODUCTS', 'NAVBAR_MENU_SOCIAL', 'NAVBAR_MENU_CATEGORIES', 'NAVBAR_MENU_GAMES', 'NAVBAR_MENU_PREMIUM_APP', 'NAVBAR_MENU_CASHCARD', 'NAVBAR_MENU_ORDER'
    ]);
    const map: Record<string, string> = {};
    for (const row of data || []) map[row.key as string] = row.value as string;
    
    const getNavbarSetting = (key: string, defaultValue: boolean = true) => {
      const value = map[key];
      return value === 'false' ? false : (value === 'true' ? true : defaultValue);
    };

    // Get navbar menu order
    const defaultOrder = ['products', 'social', 'categories', 'games', 'premiumApp', 'cashcard'];
    let menuOrder: string[] = defaultOrder;
    try {
      const orderValue = map.NAVBAR_MENU_ORDER;
      if (orderValue) {
        menuOrder = JSON.parse(orderValue);
        if (!Array.isArray(menuOrder)) {
          menuOrder = defaultOrder;
        }
      }
    } catch {
      menuOrder = defaultOrder;
    }

    return {
      products: getNavbarSetting('NAVBAR_MENU_PRODUCTS', true),
      social: getNavbarSetting('NAVBAR_MENU_SOCIAL', true),
      categories: getNavbarSetting('NAVBAR_MENU_CATEGORIES', true),
      games: getNavbarSetting('NAVBAR_MENU_GAMES', true),
      premiumApp: getNavbarSetting('NAVBAR_MENU_PREMIUM_APP', true),
      cashcard: getNavbarSetting('NAVBAR_MENU_CASHCARD', true),
      menuOrder,
    };
  } catch {
    return {
      products: true,
      social: true,
      categories: true,
      games: true,
      premiumApp: true,
      cashcard: true,
      menuOrder: ['products', 'social', 'categories', 'games', 'premiumApp', 'cashcard'],
    };
  }
}

export default async function NavBar() {
  const user = await getAuthUser();
  const adminUser = await requireAdmin();
  const navbarMenus = await getNavbarMenus();
  
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[color:var(--bg)]/60 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4 md:gap-6 text-sm md:text-base">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity" prefetch>
            <Image 
              src="https://sv1.img.in.th/71ng7t.png" 
              alt="wexplus" 
              width={120} 
              height={48} 
              className="h-10 md:h-12 w-auto" 
              priority
            />
          </Link>
          <div className="hidden lg:block">
            <NavLinks isAdmin={!!adminUser} navbarMenus={navbarMenus} navbarMenuOrder={navbarMenus.menuOrder} isLoggedIn={!!user} />
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 text-sm md:text-base">
          {user && <PointsBadge />}
          {user ? (
            <>
            <div className="hidden lg:block">
              <UserProfileMenu username={user.username} isAdmin={!!adminUser} />
            </div>
              <div className="lg:hidden">
                <MobileMenu isLoggedIn={!!user} isAdmin={!!adminUser} username={user?.username || null} navbarMenus={navbarMenus} navbarMenuOrder={navbarMenus.menuOrder} />
              </div>
            </>
          ) : (
            <>
              <NavAuthButtons />
              <div className="lg:hidden">
                <MobileMenu isLoggedIn={false} isAdmin={!!adminUser} username={null} navbarMenus={navbarMenus} navbarMenuOrder={navbarMenus.menuOrder} />
            </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}


