'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, Gamepad2, Wallet, AppWindow, Ellipsis } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/orders', icon: History, label: 'ประวัติ' },
  { href: '/products', icon: Gamepad2, label: 'เติมเกม' },
  { href: '/wallet/topup', icon: Wallet, label: 'เติมเงิน', center: true },
  { href: '/premium-app', icon: AppWindow, label: 'แอพพรีเมียม' },
  { href: '/categories', icon: Ellipsis, label: 'อื่นๆ' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-500/20 bg-black/95 backdrop-blur-xl lg:hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_60%)]" />
      <div className="relative mx-auto max-w-[1600px]">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(({ href, icon: Icon, label, center }) => {
            const isActive = pathname === href || (pathname?.startsWith(href + '/') ?? false);

            if (center) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-all duration-200"
                >
                  <div className={`flex items-center justify-center rounded-xl p-3 transition-all duration-200 bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[0_6px_20px_rgba(16,185,129,0.45)] ring-2 ring-emerald-500/40 ${isActive ? 'scale-110' : ''}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className={`text-[11px] font-bold ${isActive ? 'text-emerald-400' : 'text-white/70'}`}>
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-all duration-200 ${isActive ? 'text-emerald-400' : 'text-white/60 hover:text-white/80'}`}
              >
                <div className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${isActive ? 'bg-emerald-500/15' : 'hover:bg-white/5'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
