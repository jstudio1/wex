'use client';

import { useState, useEffect } from 'react';
import dynamicImport from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const RegularOrdersList = dynamicImport(() => import('@/components/RegularOrdersList'), {
  loading: () => <div className="h-64 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
  ssr: false,
});

const AppPremiumOrdersList = dynamicImport(() => import('@/components/AppPremiumOrdersList'), {
  loading: () => <div className="h-64 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
  ssr: false,
});

const SocialOrdersList = dynamicImport(() => import('@/components/SocialOrdersList'), {
  loading: () => <div className="h-64 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
  ssr: false,
});

const CashcardOrdersList = dynamicImport(() => import('@/components/CashcardOrdersList'), {
  loading: () => <div className="h-64 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
  ssr: false,
});

const MtopupOrdersList = dynamicImport(() => import('@/components/MtopupOrdersList'), {
  loading: () => <div className="h-64 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
  ssr: false,
});
import { ShoppingBag, Smartphone, Users, Phone, CreditCard } from 'lucide-react';

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'products' | 'mtopup' | 'cashcard' | 'premium-app' | 'social'>('products');

  useEffect(() => {
    if (!searchParams) return;
    const tab = searchParams.get('tab');
    if (tab === 'premium-app' || tab === 'products' || tab === 'social' || tab === 'mtopup' || tab === 'cashcard') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen">
      <main className="relative mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg">
              <ShoppingBag className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">คำสั่งซื้อของฉัน</h1>
              <p className="text-sm text-gray-300">ติดตามรายการสั่งซื้อของคุณ</p>
            </div>
        </div>
      </div>

      {/* Tabs */}
        <div className="bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
          <div className="flex border-b border-gray-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-colors whitespace-nowrap min-w-[120px] ${
              activeTab === 'products'
                  ? 'bg-emerald-900/20 text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
              <ShoppingBag className="h-5 w-5" />
            เติมเกม
          </button>
          <button
            onClick={() => setActiveTab('mtopup')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-colors whitespace-nowrap min-w-[120px] ${
              activeTab === 'mtopup'
                  ? 'bg-blue-900/20 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
              <Phone className="h-5 w-5" />
            เติมเงินมือถือ
          </button>
          <button
            onClick={() => setActiveTab('cashcard')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-colors whitespace-nowrap min-w-[120px] ${
              activeTab === 'cashcard'
                  ? 'bg-purple-900/20 text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
              <CreditCard className="h-5 w-5" />
            บัตรเติมเงิน
          </button>
          <button
            onClick={() => setActiveTab('premium-app')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-colors whitespace-nowrap min-w-[120px] ${
              activeTab === 'premium-app'
                  ? 'bg-emerald-900/20 text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
              <Smartphone className="h-5 w-5" />
            แอพพรีเมี่ยม
          </button>
          <button
            onClick={() => setActiveTab('social')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-colors whitespace-nowrap min-w-[120px] ${
              activeTab === 'social'
                  ? 'bg-emerald-900/20 text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
              <Users className="h-5 w-5" />
            ปั้มโซเชียล
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'products' && (
            <div>
              <RegularOrdersList />
            </div>
          )}
          {activeTab === 'mtopup' && (
            <div>
              <MtopupOrdersList />
            </div>
          )}
          {activeTab === 'cashcard' && (
            <div>
              <CashcardOrdersList />
            </div>
          )}

          {activeTab === 'premium-app' && (
            <div>
              <AppPremiumOrdersList />
            </div>
          )}

          {activeTab === 'social' && (
            <div>
              <SocialOrdersList />
            </div>
          )}
            </div>
        </div>
      </main>
      </div>
  );
}
