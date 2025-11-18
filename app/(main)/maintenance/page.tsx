import { createServiceClient } from '@/lib/supabase';

export default async function MaintenancePage() {
  const sb = createServiceClient();
  const { data } = await sb
    .from('settings')
    .select('value')
    .eq('key', 'SITE_BRAND_NAME')
    .maybeSingle();
  
  const siteName = data?.value || 'เว็บไซต์';

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-800/50">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white">
            {siteName} กำลังปรับปรุงระบบ
          </h1>
          <p className="mb-2 text-lg text-gray-400">
            ขออภัยในความไม่สะดวก
          </p>
          <p className="text-sm text-gray-500">
            เรากำลังดำเนินการปรับปรุงระบบเพื่อให้บริการที่ดีขึ้นแก่คุณ
            <br />
            กรุณาลองใหม่อีกครั้งในภายหลัง
          </p>
        </div>
      </div>
    </main>
  );
}

