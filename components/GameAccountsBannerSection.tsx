'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ShieldCheck, User } from 'lucide-react';

interface GameAccountsBannerSectionProps {
  bannerUrl?: string | null;
}

export default function GameAccountsBannerSection({ bannerUrl }: GameAccountsBannerSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/55 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_16%,rgba(245,158,11,0.2),transparent_40%),radial-gradient(circle_at_90%_82%,rgba(16,185,129,0.14),transparent_38%)]" />

      <div className="relative mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/45 bg-amber-500/20 text-amber-200 sm:h-11 sm:w-11 sm:rounded-2xl">
            <User className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white sm:text-xl lg:text-2xl">ไอดีเกมพร้อมขาย</h2>
            <p className="text-[10px] uppercase tracking-[0.12em] text-amber-200/85 sm:text-xs">Game Account Marketplace</p>
          </div>
        </div>

        <Link
          href="/accounts"
          className="inline-flex shrink-0 items-center gap-1 self-start whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/35 hover:bg-white/20 sm:self-auto sm:text-sm"
        >
          ดูทั้งหมด
          <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Link>
      </div>

      <Link href="/accounts" className="relative block">
        <article className="group relative overflow-hidden rounded-2xl border border-white/15 bg-black/45 transition-all duration-300 hover:border-amber-300/55 hover:shadow-[0_16px_36px_rgba(245,158,11,0.22)]">
          <div className="relative h-52 w-full bg-gradient-to-r from-amber-950/45 via-black to-emerald-950/45 md:h-60 lg:h-64">
            {bannerUrl ? (
              <Image
                src={bannerUrl}
                alt="Game accounts banner"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 100vw"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-4 text-center">
                <div>
                  <User className="mx-auto h-12 w-12 text-white/35" />
                  <p className="mt-2 text-sm font-medium text-white/70">Banner Placeholder</p>
                  <p className="text-xs text-white/45">Recommended 1920 x 400</p>
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/45 to-black/30" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-amber-300/45 bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                  พร้อมโอนทันที
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  ตรวจสอบก่อนขาย
                </span>
              </div>

              <h3 className="text-lg font-semibold text-white sm:text-xl">เลือกไอดีเกมตามงบและสเปกที่ต้องการ</h3>
              <p className="mt-1.5 max-w-3xl text-sm text-white/75">อัปเดตรายการใหม่ตลอดเวลา พร้อมรายละเอียดครบถ้วนและการส่งมอบที่รวดเร็ว</p>
            </div>
          </div>
        </article>
      </Link>
    </section>
  );
}
