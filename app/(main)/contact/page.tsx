import { createServiceClient } from '@/lib/supabase';
import { Mail, Phone, MessageCircle, Facebook } from 'lucide-react';

async function getContactInfo() {
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('settings')
      .select('key, value')
      .in('key', ['CONTACT_LINE_ID', 'CONTACT_PHONE', 'CONTACT_FACEBOOK', 'CONTACT_EMAIL'])
      .then((result) => {
        const map: Record<string, string> = {};
        for (const row of result.data || []) {
          map[row.key as string] = row.value as string;
        }
        return { data: map };
      });
    
    return {
      lineId: data.CONTACT_LINE_ID || '',
      phone: data.CONTACT_PHONE || '',
      facebook: data.CONTACT_FACEBOOK || '',
      email: data.CONTACT_EMAIL || ''
    };
  } catch {
    return {
      lineId: '',
      phone: '',
      facebook: '',
      email: ''
    };
  }
}

export default async function ContactPage() {
  const contact = await getContactInfo();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="shadow-input w-full rounded-none border border-white/15 bg-black/80 p-4 backdrop-blur-md md:rounded-2xl md:p-8">
        <h1 className="text-3xl font-bold text-[color:var(--text)] mb-6">ติดต่อเรา</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          {contact.email && (
            <div className="flex items-start gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Mail className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[color:var(--text)] mb-1">อีเมล</h3>
                <a 
                  href={`mailto:${contact.email}`}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {contact.email}
                </a>
              </div>
            </div>
          )}

          {contact.phone && (
            <div className="flex items-start gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Phone className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[color:var(--text)] mb-1">เบอร์โทรศัพท์</h3>
                <a 
                  href={`tel:${contact.phone}`}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {contact.phone}
                </a>
              </div>
            </div>
          )}

          {contact.lineId && (
            <div className="flex items-start gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <MessageCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[color:var(--text)] mb-1">LINE ID</h3>
                <p className="text-[color:var(--text)]/80">{contact.lineId}</p>
              </div>
            </div>
          )}

          {contact.facebook && (
            <div className="flex items-start gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Facebook className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[color:var(--text)] mb-1">Facebook</h3>
                <a 
                  href={contact.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  เปิดลิงก์
                </a>
              </div>
            </div>
          )}
        </div>

        {!contact.email && !contact.phone && !contact.lineId && !contact.facebook && (
          <div className="text-center py-12">
            <p className="text-[color:var(--text)]/60">ยังไม่มีข้อมูลติดต่อ</p>
            <p className="text-sm text-[color:var(--text)]/40 mt-2">กรุณาติดต่อผู้ดูแลระบบ</p>
          </div>
        )}
      </div>
    </main>
  );
}

