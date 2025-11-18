import { createServiceClient } from '@/lib/supabase';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

async function getTermsPolicy() {
  noStore();
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('settings')
      .select('value')
      .eq('key', 'TERMS_POLICY')
      .maybeSingle();
    
    if (error) {
      console.error('[Terms Policy] Error fetching:', error);
      return '';
    }
    
    const content = data?.value || '';
    console.log('[Terms Policy] Content length:', content.length);
    return typeof content === 'string' ? content : String(content || '');
  } catch (err) {
    console.error('[Terms Policy] Exception:', err);
    return '';
  }
}

export default async function TermsPolicyPage() {
  const content = await getTermsPolicy();
  const hasContent = content && typeof content === 'string' && content.trim().length > 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="shadow-input w-full rounded-none border border-white/15 bg-black/80 p-4 backdrop-blur-md md:rounded-2xl md:p-8">
        <h1 className="text-3xl font-bold text-[color:var(--text)] mb-6">ข้อกำหนดการใช้งาน</h1>
        {hasContent ? (
          <div 
            className="prose prose-invert max-w-none text-[color:var(--text)]/90"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-[color:var(--text)]/60">ยังไม่มีเนื้อหา Terms Policy</p>
            <p className="text-sm text-[color:var(--text)]/40 mt-2">กรุณาติดต่อผู้ดูแลระบบ</p>
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-red-400 mt-2">Debug: Content length = {content?.length || 0}</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

