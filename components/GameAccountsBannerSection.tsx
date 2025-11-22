'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';

interface GameAccountsBannerSectionProps {
  bannerUrl?: string | null;
}

export default function GameAccountsBannerSection({ bannerUrl }: GameAccountsBannerSectionProps) {
  // Recommended banner size: 1920x400 (width x height)
  const recommendedSize = '1920x400';

  return (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 shadow-md">
            <User className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">ไอดีเกมส์</h2>
            <p className="text-sm text-gray-400">Game Accounts</p>
          </div>
        </div>
      </div>

      {/* Banner - Clickable to go to games page */}
      <Link 
        href="/games" 
        className="group block w-full"
      >
        <div className="relative rounded-xl overflow-hidden shadow-lg shadow-black/20 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-emerald-900/20 cursor-pointer">
          <div className="relative w-full h-48 md:h-56 lg:h-64 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center">
            {bannerUrl ? (
              <Image 
                src={bannerUrl} 
                alt="ไอดีเกมออนไลน์ - Game Account" 
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105" 
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 100vw"
                priority
              />
            ) : (
              <div className="text-center p-8">
                <div className="text-gray-400 text-sm mb-2">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Banner Image</p>
                <p className="text-gray-600 text-xs">ขนาดที่แนะนำ: {recommendedSize} px</p>
                <p className="text-gray-600 text-xs mt-1">(กว้าง x สูง)</p>
              </div>
            )}
          </div>
        </div>
      </Link>
    </section>
  );
}

