'use client';

import { ReactNode, useState } from 'react';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import AppSidebar from '@/components/backoffice/AppSidebar';

export default function PricingLayoutClient({ children }: { children: ReactNode }) {
  const [selectedMenu] = useState('products');
  
  return (
    <div className="flex h-screen">
      <SidebarProvider>
        <AppSidebar selectedMenu={selectedMenu} setSelectedMenu={() => {}} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">จัดการราคา</h1>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 overflow-auto">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}







