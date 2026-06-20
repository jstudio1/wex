'use client';

import Link from 'next/link';
import { ArrowUpRight, Crown, CreditCard, Gamepad2, Gift, MessageCircle, Phone, Flame, ThumbsUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  icon: typeof Gamepad2;
  href: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'topup-games',
    label: 'เติมเกมออนไลน์',
    labelEn: 'Top-up Online Games',
    description: 'เกมยอดนิยม ครบทุกค่าย',
    icon: Gamepad2,
    href: '/products',
  },
  {
    id: 'topup-cards',
    label: 'บัตรเติมเงิน',
    labelEn: 'Cash Cards',
    description: 'พร้อมส่งทันทีหลังชำระเงิน',
    icon: CreditCard,
    href: '/cashcard',
  },
  {
    id: 'game-codes',
    label: 'รหัสเกมออนไลน์',
    labelEn: 'Online Game Codes',
    description: 'เลือกหมวดเกมได้ง่าย',
    icon: User,
    href: '/categories',
  },
  {
    id: 'premium-apps',
    label: 'เช่าแอพพรีเมียม',
    labelEn: 'Rent Premium Apps',
    description: 'แพ็กเกจพร้อมใช้งาน',
    icon: Crown,
    href: '/premium-app',
  },
  {
    id: 'freefire-gifts',
    label: 'ของขวัญ FREE FIRE',
    labelEn: 'Send FREE FIRE Gifts',
    description: 'ส่งของขวัญได้สะดวก',
    icon: Gift,
    href: '/products/freefire',
  },
  {
    id: 'social-boost',
    label: 'ปั้มโซเชียล',
    labelEn: 'Social Boost',
    description: 'เพิ่มยอดด้วยบริการคุณภาพ',
    icon: ThumbsUp,
    href: '/social',
  },
  {
    id: 'mobile-topup',
    label: 'เติมเงินมือถือ',
    labelEn: 'Mobile Top-up',
    description: 'เติมง่าย ครบทุกเครือข่าย',
    icon: Phone,
    href: '/mtopup',
  },
  {
    id: 'contact',
    label: 'ติดต่อเรา',
    labelEn: 'Contact Us',
    description: 'ทีมงานช่วยเหลือตลอดเวลา',
    icon: MessageCircle,
    href: '/contact',
  },
];

export default function RecommendMenuSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/55 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_14%,rgba(16,185,129,0.16),transparent_42%),radial-gradient(circle_at_88%_82%,rgba(59,130,246,0.14),transparent_36%)]" />

      <div className="relative grid gap-3 sm:gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5">
        <aside className="rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-3.5 sm:p-5">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-500/15 text-emerald-200 sm:mb-3 sm:h-11 sm:w-11 sm:rounded-2xl">
            <Flame className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>

          <h2 className="text-base font-bold text-white sm:text-xl lg:text-2xl">เมนูแนะนำ</h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-emerald-200/90 sm:mt-1 sm:text-xs">Recommended Services</p>
          <p className="mt-1.5 hidden text-sm leading-relaxed text-white/70 sm:mt-3 sm:block">ทางลัดไปยังบริการหลักของเว็บ เลือกเมนูแล้วเริ่มใช้งานได้ทันที</p>

          <div className="mt-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white/85 sm:mt-4 sm:px-3 sm:py-1 sm:text-xs">
            {menuItems.length} Services Available
          </div>
        </aside>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'group relative flex min-h-[92px] flex-col items-center gap-2 overflow-hidden rounded-xl border border-white/15 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-2.5 text-center transition-all duration-300 sm:min-h-[124px] sm:gap-2.5 sm:rounded-2xl sm:p-3.5',
                  'hover:-translate-y-1 hover:border-emerald-300/55 hover:bg-emerald-500/[0.08] hover:shadow-[0_14px_30px_rgba(16,185,129,0.2)]'
                )}
              >
                <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/35 text-emerald-200 transition-colors duration-300 group-hover:border-emerald-300/40 group-hover:bg-emerald-500/20 group-hover:text-emerald-100 sm:h-10 sm:w-10 sm:rounded-xl">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-semibold text-white sm:text-sm">{item.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-white/65 sm:mt-1 sm:line-clamp-1 sm:text-xs">{item.description}</p>
                  <p className="mt-1 hidden line-clamp-1 text-[11px] uppercase tracking-wide text-white/45 sm:mt-2 sm:block">{item.labelEn}</p>
                </div>

                <ArrowUpRight className="hidden h-4 w-4 shrink-0 text-white/45 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-200 sm:absolute sm:right-3 sm:top-3 sm:block" />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
