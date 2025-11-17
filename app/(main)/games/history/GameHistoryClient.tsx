'use client';

import GameHistory from '@/components/GameHistory';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function GameHistoryClient() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <div className="space-y-3">
        <div>
          <Link href="/games">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="size-4" />
              กลับ
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[color:var(--text)]">ประวัติการเล่นเกม</h1>
          <p className="text-[color:var(--text)]/60 text-sm mt-1">ดูรางวัลที่คุณได้รับและรับรางวัลที่ยังไม่ได้รับ</p>
        </div>
      </div>
      <GameHistory />
    </main>
  );
}

