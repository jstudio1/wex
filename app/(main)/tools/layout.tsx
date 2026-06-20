'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const is2FA = pathname === '/tools/2fa';
  const isOTPApp = pathname?.startsWith('/tools/otp-app') || false;
  const currentTab = is2FA ? '2fa' : isOTPApp ? 'otp-app' : '2fa';

  const handleTabChange = (value: string) => {
    if (value === '2fa') {
      router.push('/tools/2fa');
    } else if (value === 'otp-app') {
      router.push('/tools/otp-app');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">เครื่องมือ</h1>
        <p className="text-white/70">เครื่องมือช่วยเหลือสำหรับการใช้งาน</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="2fa" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>2FA</span>
          </TabsTrigger>
          <TabsTrigger value="otp-app" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>รับ OTP แอพ</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}

