import Link from 'next/link';
import Image from 'next/image';
import { createServiceClient } from '@/lib/supabase';
import { Facebook, Instagram, MessageCircle } from 'lucide-react';

async function getFooterSettings() {
  try {
    const sb = createServiceClient();
    const { data } = await sb.from('settings').select('key, value').in('key', [
      'FOOTER_LOGO_URL',
      'FOOTER_DESCRIPTION',
      'FOOTER_OPENING_HOURS',
      'FOOTER_FACEBOOK_URL',
      'FOOTER_LINE_URL',
      'FOOTER_INSTAGRAM_URL',
      'FOOTER_PHONE',
      'FOOTER_EMAIL',
      'FOOTER_WORKING_HOURS',
      'FOOTER_COPYRIGHT',
      'SITE_BRAND_NAME',
    ]);
    
    const map: Record<string, string> = {};
    for (const row of data || []) {
      map[row.key as string] = row.value as string;
    }
    
    return {
      logoUrl: map.FOOTER_LOGO_URL || 'https://img2.pic.in.th/pic/Holographic-Chatbot-Icon-over-Laptop-_8_.webp',
      description: map.FOOTER_DESCRIPTION || 'เว็บเติมเกมอันดับ 1 ราคาถูกที่สุด เติมเร็ว ปลอดภัย บริการตลอด 24 ชั่วโมง',
      openingHours: map.FOOTER_OPENING_HOURS || 'เปิดบริการ 24 ชั่วโมง',
      facebookUrl: map.FOOTER_FACEBOOK_URL || '',
      lineUrl: map.FOOTER_LINE_URL || '',
      instagramUrl: map.FOOTER_INSTAGRAM_URL || '',
      phone: map.FOOTER_PHONE || '',
      email: map.FOOTER_EMAIL || 'contact@WeXPlus.com',
      workingHours: map.FOOTER_WORKING_HOURS || 'ติดต่อได้ 24 ชม.',
      copyright: map.FOOTER_COPYRIGHT || `© ${new Date().getFullYear()} สิทธิ์ทั้งหมด`,
      brandName: map.SITE_BRAND_NAME || 'WeXPlus',
    };
  } catch (error) {
    console.error('Error fetching footer settings:', error);
    return {
      logoUrl: 'https://img2.pic.in.th/pic/Holographic-Chatbot-Icon-over-Laptop-_8_.webp',
      description: 'เว็บเติมเกมอันดับ 1 ราคาถูกที่สุด เติมเร็ว ปลอดภัย บริการตลอด 24 ชั่วโมง',
      openingHours: 'เปิดบริการ 24 ชั่วโมง',
      facebookUrl: '',
      lineUrl: '',
      instagramUrl: '',
      phone: '',
      email: 'contact@WeXPlus.com',
      workingHours: 'ติดต่อได้ 24 ชม.',
      copyright: `© ${new Date().getFullYear()} สิทธิ์ทั้งหมด`,
      brandName: 'WeXPlus',
    };
  }
}

export default async function Footer() {
  const settings = await getFooterSettings();
  
  return (
    <footer className="relative mt-auto border-t border-emerald-800/50 bg-gradient-to-br from-emerald-950/50 via-emerald-900/30 to-emerald-950/50 backdrop-blur-xl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} 
        />
      </div>
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* 1) โลโก้ + คำบรรยายเว็บ */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <Image
                src={settings.logoUrl}
                alt={settings.brandName}
                width={48}
                height={48}
                className="h-12 w-12 object-contain transition-transform group-hover:scale-105"
              />
              <span className="text-xl font-bold text-white">{settings.brandName}</span>
            </Link>
            <p className="text-sm text-gray-300 leading-relaxed">
              {settings.description}
            </p>
            <div className="text-sm text-gray-400">
              {settings.openingHours}
            </div>
            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              {settings.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 transition-colors hover:bg-emerald-800/50 hover:text-emerald-300"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {settings.lineUrl && (
                <a
                  href={settings.lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 transition-colors hover:bg-emerald-800/50 hover:text-emerald-300"
                  aria-label="LINE"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 transition-colors hover:bg-emerald-800/50 hover:text-emerald-300"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* 2) เมนูหลัก */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">เมนูหลัก</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-gray-300 hover:text-emerald-400 transition-colors">
                  หน้าแรก
                </Link>
              </li>
              <li>
                <Link href="/game-accounts" className="text-sm text-gray-300 hover:text-emerald-400 transition-colors">
                  ไอดีเกม
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-sm text-gray-300 hover:text-emerald-400 transition-colors">
                  เติมเกมออนไลน์
                </Link>
              </li>
              <li>
                <Link href="/wallet/topup" className="text-sm text-gray-300 hover:text-emerald-400 transition-colors">
                  เติมเครดิต
                </Link>
              </li>
              <li>
                <Link href="/account" className="text-sm text-gray-300 hover:text-emerald-400 transition-colors">
                  โปรไฟล์
                </Link>
              </li>
            </ul>
          </div>

          {/* 3) บริการของเรา */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">บริการของเรา</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/game-accounts" className="text-sm text-gray-300 hover:text-emerald-400 transition-colors">
                  ขายไอดีเกมออนไลน์
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-sm text-gray-300 hover:text-emerald-400 transition-colors">
                  เติมเกมออนไลน์
                </Link>
              </li>
              <li>
                <Link href="/game-accounts" className="text-sm text-gray-300 hover:text-emerald-400 transition-colors">
                  รับซื้อไอดีเกมออนไลน์
                </Link>
              </li>
            </ul>
          </div>

          {/* 4) ติดต่อเรา */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">ติดต่อเรา</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li>
                <span className="text-gray-400">โทรศัพท์:</span>
                <br />
                {settings.phone ? (
                  <a href={`tel:${settings.phone}`} className="hover:text-emerald-400 transition-colors">
                    {settings.phone}
                  </a>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </li>
              <li>
                <span className="text-gray-400">อีเมล:</span>
                <br />
                <a href={`mailto:${settings.email}`} className="hover:text-emerald-400 transition-colors">
                  {settings.email}
                </a>
              </li>
              <li>
                <span className="text-gray-400">เวลาทำการ:</span>
                <br />
                {settings.workingHours}
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright + นโยบาย */}
        <div className="mt-12 pt-8 border-t border-emerald-800/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400 text-center sm:text-left">
              {settings.copyright}
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-emerald-400 transition-colors">
                นโยบายความเป็นส่วนตัว
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-emerald-400 transition-colors">
                ข้อกำหนดการใช้งาน
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

