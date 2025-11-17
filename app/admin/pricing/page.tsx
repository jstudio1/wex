import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import AdminBackButton from '@/components/AdminBackButton';

async function updateGlobalPricing(formData: FormData) {
  'use server';
  const admin = await requireAdmin();
  if (!admin) return;
  const pct = String(formData.get('pct') || '0');
  const fix = String(formData.get('fix') || '0');
  const sb = createServiceClient();
  await sb.from('settings').upsert({ key: 'PRICING_MARKUP_PERCENT', value: pct }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'PRICING_MARKUP_FIXED', value: fix }, { onConflict: 'key' });
  revalidatePath('/admin/pricing');
}

export default async function AdminPricingPage() {
  const admin = await requireAdmin();
  if (!admin) return <main className="mx-auto max-w-3xl px-4 py-6">Unauthorized</main>;
  const sb = createServiceClient();
  const { data } = await sb.from('settings').select('key, value').in('key', ['PRICING_MARKUP_PERCENT', 'PRICING_MARKUP_FIXED']);
  const map = new Map<string, string>();
  for (const row of data || []) map.set(row.key as string, row.value as string);
  const pct = map.get('PRICING_MARKUP_PERCENT') || '0';
  const fix = map.get('PRICING_MARKUP_FIXED') || '0';

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <AdminBackButton />
        <h1 className="text-xl font-semibold">ควบคุมราคา (ทั้งเว็บไซต์)</h1>
      </div>
      <form action={updateGlobalPricing} className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-sm w-40 text-[color:var(--text)]/70">เพิ่ม % ทั่วเว็บ</label>
          <input className="input" name="pct" defaultValue={pct} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm w-40 text-[color:var(--text)]/70">+ บาท ทั่วเว็บ</label>
          <input className="input" name="fix" defaultValue={fix} />
        </div>
        <button className="btn-primary">บันทึก</button>
      </form>
      <p className="text-xs text-[color:var(--text)]/60">หมายเหตุ: ระบบจะคำนวณราคา = (base + item.fixed + item.% ) แล้วจึงบวก global fixed และ global % อีกชั้น</p>
    </main>
  );
}


