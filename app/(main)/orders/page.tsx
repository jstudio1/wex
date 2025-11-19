'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import RegularOrdersList from '@/components/RegularOrdersList';
import AppPremiumOrdersList from '@/components/AppPremiumOrdersList';
import SocialOrdersList from '@/components/SocialOrdersList';
import { ShoppingBag, Smartphone, Users } from 'lucide-react';

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'products' | 'premium-app' | 'social'>('products');

  useEffect(() => {
    if (!searchParams) return;
    const tab = searchParams.get('tab');
    if (tab === 'premium-app' || tab === 'products' || tab === 'social') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(16, 185, 129) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>
      
      {/* Decorative Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-emerald-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

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
          <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('products')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'products'
                  ? 'bg-emerald-900/20 text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
              <ShoppingBag className="h-5 w-5" />
            เติมเกม
          </button>
          <button
            onClick={() => setActiveTab('premium-app')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
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
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
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
