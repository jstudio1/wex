import SocialServicesBrowser from '@/components/SocialServicesBrowser';
import { getBaseUrl } from '@/lib/url';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Share2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function fetchSocialServices() {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/social/services`, {
      cache: 'no-store',
      next: { revalidate: 0, tags: ['social-services', 'social-categories'] },
    });
    if (!res.ok) return { services: [], categories: [], globalMarkup: { percent: 0, fixed: 0 } };
    const json = await res.json();
    return json.data || { services: [], categories: [], globalMarkup: { percent: 0, fixed: 0 } };
  } catch (error) {
    console.error('fetchSocialServices error:', error);
    return { services: [], categories: [], globalMarkup: { percent: 0, fixed: 0 } };
  }
}

export default async function SocialPage() {
  const data = await fetchSocialServices();
  
  // แสดง empty state ถ้ายังไม่มีบริการ
  if (data.services.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Share2 className="size-8 text-gray-400" />
            </EmptyMedia>
            <EmptyTitle className="text-white">ยังไม่มีบริการ</EmptyTitle>
            <EmptyDescription className="text-gray-400">
              บริการจะแสดงที่นี่เมื่อมีการเพิ่มบริการใหม่
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <SocialServicesBrowser services={data.services} categories={data.categories} globalMarkup={data.globalMarkup} />
    </main>
  );
}

