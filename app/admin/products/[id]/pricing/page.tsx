import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { FormSubmit } from '@/components/ui/form-submit';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AdminBackButton from '@/components/AdminBackButton';
import { redirect } from 'next/navigation';

type Params = { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } };

async function updateAllPricingAction(formData: FormData) {
  'use server';
  const admin = await requireAdmin();
  if (!admin) redirect('/admin/products');
  const productId = Number(formData.get('product_id'));
  const sb = createServiceClient();
  const updates: { id: number; pct: number; fix: number }[] = [];
  for (const [key, val] of formData.entries()) {
    if (typeof key === 'string' && key.startsWith('pct_')) {
      const id = Number(key.replace('pct_', ''));
      const pct = Number(String(val || '0'));
      const fix = Number(String(formData.get(`fix_${id}`) || '0'));
      updates.push({ id, pct, fix });
    }
  }
  for (const u of updates) {
    await sb.from('product_items').update({ markup_percent: u.pct, markup_fixed: u.fix }).eq('id', u.id);
  }
  revalidatePath(`/admin/products/${productId}/pricing`);
  redirect(`/admin/products/${productId}/pricing?status=ok`);
}

export default async function ProductPricingPage({ params, searchParams }: Params) {
  const admin = await requireAdmin();
  if (!admin) return <main className="mx-auto max-w-5xl px-4 py-6">Unauthorized</main>;
  const productId = Number(params.id);
  const sb = createServiceClient();
  const { data: product } = await sb.from('products').select('id, name, key').eq('id', productId).maybeSingle();
  const { data: items } = await sb
    .from('product_items')
    .select('id, name, sku, price, markup_percent, markup_fixed')
    .eq('product_id', productId)
    .order('name');

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AdminBackButton href="/admin/products/manage" />
          <h1 className="text-xl font-semibold">กำหนดราคา • {product?.name}</h1>
        </div>
      </div>
      {searchParams?.status === 'ok' && (
        <Alert>
          <AlertTitle>บันทึกสำเร็จ</AlertTitle>
          <AlertDescription>อัปเดตราคาทุกตัวเลือกแล้ว</AlertDescription>
        </Alert>
      )}
      <form action={updateAllPricingAction} className="space-y-2">
        <input type="hidden" name="product_id" value={String(productId)} />
        {(items || []).map((it) => (
          <div key={it.id} className="card p-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{it.name}</div>
              <div className="text-xs text-white/60">SKU: {it.sku} • Base: {Number(it.price).toFixed(2)}฿</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/60">เพิ่ม %</label>
              <input className="input w-24" name={`pct_${it.id}`} defaultValue={String(it.markup_percent ?? 0)} />
              <label className="text-xs text-white/60">+ บาท</label>
              <input className="input w-24" name={`fix_${it.id}`} defaultValue={String(it.markup_fixed ?? 0)} />
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <FormSubmit>บันทึกทั้งหมด</FormSubmit>
        </div>
      </form>
    </main>
  );
}


