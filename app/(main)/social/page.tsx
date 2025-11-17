import SocialServicesBrowser from '@/components/SocialServicesBrowser';
import { getBaseUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';

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

export default async function SocialPage() {
  const data = await fetchSocialServices();
  
  // แสดงข้อความเตือนถ้ายังไม่ได้ sync
  if (data.services.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="card p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-[color:var(--text)]/90">ยังไม่มีบริการปั้มโซเชียล</h1>
          <p className="text-[color:var(--text)]/70">
            กรุณาไปที่ Backoffice → จัดการบริการโซเชียล → กดปุ่ม "ซิงก์จากผู้ให้บริการ" เพื่อดึงข้อมูลล่าสุด
          </p>
          <p className="text-sm text-[color:var(--text)]/50">
            (Sync จะดึงข้อมูลจาก External API ลง Database)
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <SocialServicesBrowser services={data.services} categories={data.categories} globalMarkup={data.globalMarkup} />
    </main>
  );
}

