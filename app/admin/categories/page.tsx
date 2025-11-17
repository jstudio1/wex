import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSubmit } from '@/components/ui/form-submit';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AdminBackButton from '@/components/AdminBackButton';

async function createCategoryAction(formData: FormData) {
  'use server';
  const admin = await requireAdmin();
  if (!admin) return;
  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim();
  const sb = createServiceClient();
  await sb.from('categories').insert({ name, slug }).select('id');
  revalidatePath('/admin/categories');
}

async function togglePublishAction(formData: FormData) {
  'use server';
  const admin = await requireAdmin();
  if (!admin) return;
  const id = Number(formData.get('id'));
  const value = formData.get('value') === 'true';
  const sb = createServiceClient();
  await sb.from('categories').update({ is_published: value }).eq('id', id);
  revalidatePath('/admin/categories');
}

export default async function AdminCategoriesPage() {
  const admin = await requireAdmin();
  if (!admin) return <main className="mx-auto max-w-4xl px-4 py-6">Unauthorized</main>;
  const sb = createServiceClient();
  const { data: rows } = await sb.from('categories').select('id, name, slug, is_published').order('name');

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <AdminBackButton />
        <h1 className="text-xl font-semibold">จัดการหมวดหมู่</h1>
      </div>
      <form action={createCategoryAction} className="card p-4 flex items-center gap-2">
        <Input name="name" placeholder="ชื่อหมวดหมู่" />
        <Input name="slug" placeholder="slug" />
        <FormSubmit>เพิ่ม</FormSubmit>
      </form>
      <div className="space-y-2">
        {(rows || []).map((c) => (
          <div key={c.id} className="card p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-xs text-[color:var(--text)]/60">slug: {c.slug}</div>
            </div>
            <form action={togglePublishAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={String(c.id)} />
              <input type="hidden" name="value" value={String(!c.is_published)} />
              <span className={`text-xs px-2 py-1 rounded ${c.is_published ? 'bg-emerald-600/30 text-emerald-300' : 'bg-white/10 text-[color:var(--text)]/60'}`}>{c.is_published ? 'เผยแพร่' : 'ซ่อน'}</span>
              <Button size="sm" variant="outline" type="submit">สลับ</Button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}


