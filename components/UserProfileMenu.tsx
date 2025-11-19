'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { UserCircle, ShoppingBag, Wallet, LogOut, Settings, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useWalletBalance } from '@/hooks/useWalletBalance';

type Props = {
  username: string;
  isAdmin?: boolean;
  avatarUrl?: string | null;
};

type Permission = {
  id: number;
  name: string;
  discount_percent: number;
  discount_amount: number;
  discount_cap_amount: number;
} | null;

export default function UserProfileMenu({ username, isAdmin = false, avatarUrl }: Props) {
  const { points, permission, loading } = useWalletBalance();

  // Get first letter of username for avatar
  const avatarLetter = username.charAt(0).toUpperCase();
  // Prevent body scroll lock when dropdown menu is open - maintain scrollbar visibility
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    // Calculate and store scrollbar width BEFORE any changes
    let savedScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Recalculate scrollbar width periodically (in case page content changes)
    const recalculateScrollbarWidth = () => {
      const originalOverflow = body.style.overflow;
      body.style.overflow = 'auto';
      savedScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = originalOverflow;
    };
    
    // Initial calculation
    recalculateScrollbarWidth();
    
    let rafId: number | null = null;
    let isActive = true;
    
    // Function to maintain scrollbar visibility
    const maintainScrollbar = () => {
      if (!isActive) return;
      
      const bodyOverflow = body.style.overflow;
      const htmlOverflow = html.style.overflow;
      const hasScrollLock = body.hasAttribute('data-scroll-locked');
      
      // If overflow is hidden or scroll is locked, restore it
      if (bodyOverflow === 'hidden' || htmlOverflow === 'hidden' || hasScrollLock) {
        body.style.overflow = 'auto';
        html.style.overflow = 'auto';
        body.removeAttribute('data-scroll-locked');
        
        // Add padding to maintain layout (prevent horizontal shift)
        if (savedScrollbarWidth > 0) {
          const currentPaddingRight = parseInt(body.style.paddingRight) || 0;
          if (currentPaddingRight < savedScrollbarWidth) {
            body.style.paddingRight = `${savedScrollbarWidth}px`;
          }
        }
      } else {
        // If scrollbar is visible, update saved width
        if (bodyOverflow === '' || bodyOverflow === 'auto') {
          const currentScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
          if (currentScrollbarWidth > 0) {
            savedScrollbarWidth = currentScrollbarWidth;
          }
        }
      }
      
      if (isActive) {
        rafId = requestAnimationFrame(maintainScrollbar);
      }
    };
    
    rafId = requestAnimationFrame(maintainScrollbar);
    
    // MutationObserver for immediate detection
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (target === body || target === html) {
            shouldCheck = true;
          }
        }
      });
      if (shouldCheck) {
        maintainScrollbar();
      }
    });

    observer.observe(body, {
      attributes: true,
      attributeFilter: ['style', 'data-scroll-locked'],
    });
    
    observer.observe(html, {
      attributes: true,
      attributeFilter: ['style'],
    });
    
    const recalcInterval = setInterval(() => {
      recalculateScrollbarWidth();
    }, 1000);

    return () => {
      isActive = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      clearInterval(recalcInterval);
      observer.disconnect();
      if (body.style.paddingRight) {
        body.style.paddingRight = '';
      }
    };
  }, []);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Profile Menu"
          className="flex items-center gap-3 text-white transition-opacity duration-200 hover:opacity-90 cursor-pointer"
        >
          {/* Avatar Circle with Gradient */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 shadow-lg overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
            ) : (
            <span className="text-base font-bold text-white">{avatarLetter}</span>
            )}
          </div>
          
          {/* User Info */}
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-semibold leading-tight">{username}</span>
            <span className="text-xs text-white/80 leading-tight">
              เครดิต: {loading && points === null ? '—' : (points ?? 0).toFixed(2)} บาท
            </span>
            {permission && (
              <span className="text-xs text-white/70 leading-tight">
                สิทธิ์: {permission.name}
              </span>
            )}
          </div>
          
          {/* Dropdown Arrow */}
          <ChevronDown className="h-4 w-4 text-white/70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 overflow-hidden rounded-lg border border-gray-800 bg-[#0a0a0a] p-0 text-white shadow-lg"
      >
        <div className="border-b border-gray-800 bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-950 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 shadow-lg overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
              ) : (
              <span className="text-base font-bold text-white">{avatarLetter}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{username}</div>
              <div className="text-xs text-white/80">เครดิต: {(points ?? 0).toFixed(2)} บาท</div>
              {permission && (
                <div className="mt-1 text-xs text-white/90">
                  <span className="font-medium">สิทธิ์:</span> {permission.name}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-2">
          <DropdownMenuItem
            asChild
            className="rounded-md text-white transition-colors hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
          >
            <Link href="/orders" className="flex w-full items-center gap-3 px-3 py-2 text-sm cursor-pointer">
              <ShoppingBag className="h-4 w-4 text-emerald-500" />
              <span>ประวัติ</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="rounded-md text-white transition-colors hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
          >
            <Link href="/wallet/topup" className="flex w-full items-center gap-3 px-3 py-2 text-sm cursor-pointer">
              <Wallet className="h-4 w-4 text-emerald-500" />
              <span>เติมพอยต์</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="rounded-md text-white transition-colors hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
          >
            <Link href="/account" className="flex w-full items-center gap-3 px-3 py-2 text-sm cursor-pointer">
              <Settings className="h-4 w-4 text-emerald-500" />
              <span>ตั้งค่า</span>
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator className="my-2 h-px bg-gray-800" />
              <DropdownMenuItem
                asChild
                className="rounded-md text-white transition-colors hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
              >
                <Link href="/backoffice" className="flex w-full items-center gap-3 px-3 py-2 text-sm cursor-pointer">
                  <LayoutDashboard className="h-4 w-4 text-emerald-500" />
                  <span>หลังบ้าน</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator className="my-2 h-px bg-gray-800" />
          <form action="/api/auth/logout" method="post" className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-emerald-500 transition-colors hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
              onClick={() => {
                setTimeout(() => {
                  const event = new MouseEvent('mousedown', { bubbles: true });
                  document.dispatchEvent(event);
                }, 100);
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>ออกจากระบบ</span>
            </button>
          </form>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

