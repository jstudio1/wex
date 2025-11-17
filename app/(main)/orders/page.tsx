'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SocialOrdersList from '@/components/SocialOrdersList';
import RegularOrdersList from '@/components/RegularOrdersList';
import GameAccountsOrdersList from '@/components/GameAccountsOrdersList';
import AppPremiumOrdersList from '@/components/AppPremiumOrdersList';
import CashcardOrdersList from '@/components/CashcardOrdersList';

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'social' | 'products' | 'game-accounts' | 'app-premium' | 'cashcard'>('social');

  useEffect(() => {
    if (!searchParams) return;
    const tab = searchParams.get('tab');
    if (tab === 'game-accounts' || tab === 'products' || tab === 'social' || tab === 'app-premium' || tab === 'cashcard') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">คำสั่งซื้อของฉัน</h1>
        <div className="flex gap-2">
          <Link href="/social" className="rounded-md border border-white/20 px-3 py-2 text-xs hover:bg-white/10">ปั้มโซเชียล</Link>
          <Link href="/products" className="rounded-md border border-white/20 px-3 py-2 text-xs hover:bg-white/10">เติมเกม</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="card p-0">
        <div className="flex gap-2 border-b border-white/10 px-6">
          <button
            onClick={() => setActiveTab('social')}
            className={`px-4 py-3 border-b-2 transition ${
              activeTab === 'social'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[color:var(--text)]/60 hover:text-[color:var(--text)]'
            }`}
          >
            ปั้มโซเชียล
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-3 border-b-2 transition ${
              activeTab === 'products'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[color:var(--text)]/60 hover:text-[color:var(--text)]'
            }`}
          >
            เติมเกม
          </button>
          <button
            onClick={() => setActiveTab('game-accounts')}
            className={`px-4 py-3 border-b-2 transition ${
              activeTab === 'game-accounts'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[color:var(--text)]/60 hover:text-[color:var(--text)]'
            }`}
          >
            ไอดีเกม
          </button>
          <button
            onClick={() => setActiveTab('app-premium')}
            className={`px-4 py-3 border-b-2 transition ${
              activeTab === 'app-premium'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[color:var(--text)]/60 hover:text-[color:var(--text)]'
            }`}
          >
            แอพพรีเมี่ยม
          </button>
          <button
            onClick={() => setActiveTab('cashcard')}
            className={`px-4 py-3 border-b-2 transition ${
              activeTab === 'cashcard'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[color:var(--text)]/60 hover:text-[color:var(--text)]'
            }`}
          >
            บัตรเติมเงิน
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'social' && (
            <div>
              <SocialOrdersList />
            </div>
          )}

          {activeTab === 'products' && (
            <div>
              <RegularOrdersList />
            </div>
          )}

          {activeTab === 'game-accounts' && (
            <div>
              <GameAccountsOrdersList />
            </div>
          )}

          {activeTab === 'app-premium' && (
            <div>
              <AppPremiumOrdersList />
            </div>
          )}

          {activeTab === 'cashcard' && (
            <div>
              <CashcardOrdersList />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
