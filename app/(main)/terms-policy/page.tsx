import { createServiceClient } from '@/lib/supabase';
import { unstable_noStore as noStore } from 'next/cache';
import { Shield, Calendar, List } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PolicySettings {
  title: string;
  description: string | null;
}

interface PolicyItem {
  id: string;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

async function getPolicyData() {
  noStore();
  try {
    const sb = createServiceClient();
    
    const [settingsRes, itemsRes] = await Promise.all([
      sb.from('terms_policy_settings').select('*').maybeSingle(),
      sb.from('terms_policy_items').select('*').order('order_index', { ascending: true }),
    ]);

    const settings: PolicySettings = {
      title: settingsRes.data?.title || 'ข้อกำหนดการใช้งาน',
      description: settingsRes.data?.description || null,
    };

    const items: PolicyItem[] = itemsRes.data || [];

    // หาวันที่อัปเดตล่าสุด
    let updateDate = '';
    if (items.length > 0) {
      const latestItem = items.reduce((latest, item) => {
        const itemDate = new Date(item.updated_at || item.created_at);
        const latestDate = new Date(latest.updated_at || latest.created_at);
        return itemDate > latestDate ? item : latest;
      });
      const date = new Date(latestItem.updated_at || latestItem.created_at);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
      updateDate = `${day}/${month}/${year}`;
    }

    return { settings, items, updateDate };
  } catch (err) {
    console.error('[Terms Policy] Exception:', err);
    return {
      settings: { title: 'ข้อกำหนดการใช้งาน', description: null },
      items: [],
      updateDate: '',
    };
  }
}

export default async function TermsPolicyPage() {
  const { settings, items, updateDate } = await getPolicyData();
  const sections = items.map((item, index) => {
    // ลบเลขหน้าออกจาก title (เช่น "1. การยอมรับ" -> "การยอมรับ")
    const cleanTitle = item.title.replace(/^\d+\.\s*/, '').trim();
    return {
      id: `section-${index + 1}`,
      title: cleanTitle,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 scroll-smooth">
      {/* Main Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 border-b-4 border-emerald-600/50">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <Shield className="size-8 md:size-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1">
                {settings.title}
              </h1>
              <p className="text-white/80 text-sm md:text-base">Terms of Service - WeXPlus</p>
            </div>
          </div>
        </div>
      </div>

      {/* Update Date Bar */}
      {updateDate && (
        <div className="bg-yellow-500/20 border-y border-yellow-500/30">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex items-center gap-2 text-yellow-300">
              <Calendar className="size-4 md:size-5" />
              <span className="text-sm md:text-base font-medium">อัปเดตล่าสุด: {updateDate}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents Sidebar */}
          {sections.length > 0 && (
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <List className="size-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">สารบัญ</h2>
                </div>
                <nav className="space-y-2">
                  {sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block px-3 py-2 text-sm text-gray-300 hover:text-emerald-400 hover:bg-emerald-900/30 rounded-md transition-colors scroll-smooth"
                    >
                      {index + 1}. {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={sections.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 md:p-8 lg:p-10">
              {settings.description && (
                <div className="mb-8 p-4 rounded-lg bg-blue-900/20 border border-blue-800/50">
                  <p className="text-gray-200 leading-relaxed">{settings.description}</p>
                </div>
              )}

              {items.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="size-16 mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400 text-lg mb-2">ยังไม่มีเนื้อหา Terms Policy</p>
                  <p className="text-sm text-gray-500">กรุณาติดต่อผู้ดูแลระบบ</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      id={`section-${index + 1}`}
                      className="scroll-mt-24"
                    >
                      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                        {item.title}
                      </h2>
                      <div
                        className="prose prose-invert max-w-none text-gray-200 space-y-4 [&_p]:text-gray-300 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-2 [&_li]:text-gray-300 [&_strong]:text-white [&_strong]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-3"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
