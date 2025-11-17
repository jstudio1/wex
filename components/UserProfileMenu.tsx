'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { UserCircle, ShoppingBag, Wallet, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

type Props = {
  username: string;
  isAdmin?: boolean;
};

export default function UserProfileMenu({ username, isAdmin = false }: Props) {
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
        <Button size="icon" variant="outline" aria-label="Profile Menu" className="h-8 w-8 md:h-9 md:w-9">
          <UserCircle className="size-4 md:size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 overflow-hidden rounded-lg border border-white/15 bg-black/95 p-0 shadow-2xl backdrop-blur-md">
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 grid size-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
              <UserCircle className="size-5 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{username}</div>
              <div className="text-xs text-white/50">โปรไฟล์ของฉัน</div>
            </div>
          </div>
        </div>
        <div className="p-1.5">
          <DropdownMenuItem asChild>
            <Link href="/orders" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors">
              <ShoppingBag className="size-4 text-white/60" />
              <span>ประวัติ</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/wallet/topup" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors">
              <Wallet className="size-4 text-white/60" />
              <span>เติมพอยต์</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors">
              <Settings className="size-4 text-white/60" />
              <span>ตั้งค่า</span>
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/backoffice" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors">
                  <LayoutDashboard className="size-4 text-white/60" />
                  <span>หลังบ้าน</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <form action="/api/auth/logout" method="post" className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 transition-colors"
              onClick={() => {
                setTimeout(() => {
                  const event = new MouseEvent('mousedown', { bubbles: true });
                  document.dispatchEvent(event);
                }, 100);
              }}
            >
              <LogOut className="size-4" />
              <span>ออกจากระบบ</span>
            </button>
          </form>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

