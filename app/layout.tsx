import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { Kanit } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import dynamic from 'next/dynamic';
const BackgroundParticles = dynamic(() => import('@/components/BackgroundParticles'), { ssr: false });

const kanit = Kanit({ subsets: ['latin', 'thai'], weight: ['300', '400', '500', '600', '700'] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'wexplus',
  title: {
    default: 'wexplus - เติมเกม ราคาถูก เว็บตรง รวดเร็ว ปลอดภัย 24 ชั่วโมง',
    template: '%s — wexplus',
  },
  description: 'เว็บเติมเกมอันดับ 1 ราคาถูกที่สุด เติมเร็ว ปลอดภัย บริการตลอด 24 ชั่วโมง รองรับทุกเกมดัง พร้อมโปรโมชั่นสุดคุ้ม',
  keywords: [
    'เติมเกม', 'บัตรเกม', 'ไอเท็มเกม', 'โค้ดเกม', 'ราคาถูก', 'โปร', 'ส่วนลด',
    'ซื้อไอเท็ม', 'เพชร', 'คูปอง', 'เกมมือถือ', 'Game Topup', 'wexplus', 'ร้านเติมเกม'
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'wexplus',
    title: 'wexplus - เติมเกม ราคาถูก เว็บตรง รวดเร็ว ปลอดภัย 24 ชั่วโมง',
    description: 'เว็บเติมเกมอันดับ 1 ราคาถูกที่สุด เติมเร็ว ปลอดภัย บริการตลอด 24 ชั่วโมง รองรับทุกเกมดัง พร้อมโปรโมชั่นสุดคุ้ม',
    locale: 'th_TH',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@wexplus',
    creator: '@wexplus',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${kanit.className} antialiased`}>
        {/* background particles */}
        <BackgroundParticles />
        <Toaster>
          {children}
        </Toaster>
        <SonnerToaster position="top-right" richColors className="top-20 md:top-24" />
      </body>
    </html>
  );
}


