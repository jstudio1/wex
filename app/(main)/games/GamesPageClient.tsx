'use client';

import { useState } from 'react';
import GamesList from '@/components/GamesList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { History, ArrowLeft } from 'lucide-react';

export default function GamesPageClient() {
  const [showBackButton, setShowBackButton] = useState(false);

  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            {showBackButton && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  setShowBackButton(false);
                  window.dispatchEvent(new CustomEvent('game:back'));
                }}
              >
                <ArrowLeft className="size-4" />
                กลับ
              </Button>
            )}
          </div>
          <div>
            <Link href="/games/history">
              <Button variant="outline" size="sm" className="gap-2">
                <History className="size-4" />
                ดูประวัติ
              </Button>
            </Link>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[color:var(--text)]">เกมสุ่มรางวัล</h1>
          <p className="text-[color:var(--text)]/60 text-sm mt-1">ใช้พอยต์เล่นเกมเพื่อรับรางวัลมากมาย</p>
        </div>
      </div>

      {/* Games List */}
      <GamesList onGameSelected={(selected) => setShowBackButton(!!selected)} />
    </main>
  );
}

