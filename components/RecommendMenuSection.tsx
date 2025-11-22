'use client';

import Link from 'next/link';
import { Gamepad2, CreditCard, User, Crown, Gift, ThumbsUp, Phone, MessageCircle } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  labelEn: string;
  icon: typeof Gamepad2;
  href: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'topup-games',
    label: 'เติมเกมออนไลน์',
    labelEn: 'Top-up Online Games',
    icon: Gamepad2,
    href: '/products',
  },
  {
    id: 'topup-cards',
    label: 'บัตรเติมเงิน',
    labelEn: 'Top-up Cards',
    icon: CreditCard,
    href: '/cashcard',
  },
  {
    id: 'game-codes',
    label: 'รหัสเกมออนไลน์',
    labelEn: 'Online Game Codes',
    icon: User,
    href: '/games',
  },
  {
    id: 'premium-apps',
    label: 'เช่าแอพพรีเมียม',
    labelEn: 'Rent Premium Apps',
    icon: Crown,
    href: '/premium',
  },
  {
    id: 'freefire-gifts',
    label: 'ส่งของขวัญ FREE FIRE',
    labelEn: 'Send FREE FIRE Gifts',
    icon: Gift,
    href: '/products/freefire',
  },
  {
    id: 'social-boost',
    label: 'เพิ่มยอดโซเชียล์',
    labelEn: 'Increase Social Reach',
    icon: ThumbsUp,
    href: '/social',
  },
  {
    id: 'mobile-topup',
    label: 'เติมเงินมือถือ',
    labelEn: 'Top-up Mobile Phone',
    icon: Phone,
    href: '/mtopup',
  },
  {
    id: 'contact',
    label: 'ติดต่อเรา',
    labelEn: 'Contact Us',
    icon: MessageCircle,
    href: '/contact',
  },
];

export default function RecommendMenuSection() {
  return (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#facc15] mb-1">เมนูแนะนำ</h2>
        <p className="text-sm text-[#facc15]">RECOMMEND MENU</p>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="group relative flex flex-col items-center justify-center p-6 rounded-xl bg-[#1a1a1a] border border-gray-800 hover:border-[#facc15]/50 hover:bg-[#1f1f1f] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#facc15]/20"
            >
              <div className="mb-3">
                <Icon className="h-12 w-12 text-[#facc15] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <p className="text-white text-sm font-medium text-center leading-tight group-hover:text-[#facc15] transition-colors duration-300">
                {item.label}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

