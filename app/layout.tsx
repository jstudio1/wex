import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { Toaster } from '@/components/ui/toaster';
import dynamic from 'next/dynamic';
import { createServiceClient } from '@/lib/supabase';
const BackgroundParticles = dynamic(() => import('@/components/BackgroundParticles'), { ssr: false });
const ContactAdminButton = dynamic(() => import('@/components/ContactAdminButton'), { ssr: false });
const PopupNotification = dynamic(() => import('@/components/PopupNotification'), { ssr: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function getSiteMetadata() {
  try {
    const sb = createServiceClient();
    const { data } = await sb.from('settings').select('key, value').in('key', [
      'SITE_BRAND_NAME',
      'SITE_TITLE',
      'SITE_META_DESCRIPTION'
    ]);
    
    const map: Record<string, string> = {};
    for (const row of data || []) {
      map[row.key as string] = row.value as string;
    }
    
    return {
      brandName: map.SITE_BRAND_NAME || 'WeXPlus',
      title: map.SITE_TITLE || 'WeXPlus - เติมเกม ราคาถูก เว็บตรง รวดเร็ว ปลอดภัย 24 ชั่วโมง',
      description: map.SITE_META_DESCRIPTION || 'เว็บเติมเกมอันดับ 1 ราคาถูกที่สุด เติมเร็ว ปลอดภัย บริการตลอด 24 ชั่วโมง รองรับทุกเกมดัง พร้อมโปรโมชั่นสุดคุ้ม'
    };
  } catch (error) {
    console.error('Error fetching site metadata:', error);
    return {
      brandName: 'WeXPlus',
      title: 'WeXPlus - เติมเกม ราคาถูก เว็บตรง รวดเร็ว ปลอดภัย 24 ชั่วโมง',
      description: 'เว็บเติมเกมอันดับ 1 ราคาถูกที่สุด เติมเร็ว ปลอดภัย บริการตลอด 24 ชั่วโมง รองรับทุกเกมดัง พร้อมโปรโมชั่นสุดคุ้ม'
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await getSiteMetadata();
  
  return {
  metadataBase: new URL(SITE_URL),
    applicationName: metadata.brandName,
  title: {
      default: metadata.title,
      template: `%s — ${metadata.brandName}`,
  },
    description: metadata.description,
  keywords: [
    'เติมเกม', 'บัตรเกม', 'ไอเท็มเกม', 'โค้ดเกม', 'ราคาถูก', 'โปร', 'ส่วนลด',
      'ซื้อไอเท็ม', 'เพชร', 'คูปอง', 'เกมมือถือ', 'Game Topup', 'WeXPlus', 'ร้านเติมเกม'
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
      siteName: metadata.brandName,
      title: metadata.title,
      description: metadata.description,
    locale: 'th_TH',
  },
  twitter: {
    card: 'summary_large_image',
      site: '@WeXPlus',
      creator: '@WeXPlus',
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
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="antialiased">
        {/* background particles */}
        <BackgroundParticles />
        {children}
        <PopupNotification />
        <Toaster />
        <ContactAdminButton />
      </body>
    </html>
  );
}


