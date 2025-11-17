import SocialOrderForm from '@/components/SocialOrderForm';
import { getBaseUrl } from '@/lib/url';

async function fetchSocialServices() {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/social/services`, { next: { revalidate: 120, tags: ['social-services', 'social-categories'] } });
    if (!res.ok) return { services: [], categories: [], globalMarkup: { percent: 0, fixed: 0 } };
    const json = await res.json();
    return json.data || { services: [], categories: [], globalMarkup: { percent: 0, fixed: 0 } };
  } catch (error) {
    console.error('fetchSocialServices error:', error);
    return { services: [], categories: [], globalMarkup: { percent: 0, fixed: 0 } };
  }
}

export default async function SocialOrderAddPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const data = await fetchSocialServices();
  const serviceId = typeof searchParams?.service === 'string' ? Number(searchParams.service) : undefined;
  return (
    <main className="mx-auto max-w-[1600px] px-4 lg:px-8 py-6 lg:py-8">
      <SocialOrderForm services={data.services} categories={data.categories} globalMarkup={data.globalMarkup} initialServiceId={serviceId} />
    </main>
  );
}

