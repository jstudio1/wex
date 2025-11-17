'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NavAuthButtons() {
  return (
    <div className="hidden md:flex items-center gap-2">
      <Button variant="outline" size="sm" asChild className="text-xs md:text-sm h-8 px-3">
        <Link href="/login">เข้าสู่ระบบ</Link>
      </Button>
      <Button size="sm" asChild className="text-xs md:text-sm h-8 px-3">
        <Link href="/register">สมัครสมาชิก</Link>
      </Button>
    </div>
  );
}

