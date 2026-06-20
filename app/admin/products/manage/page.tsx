import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import AdminSearchBox from '@/components/AdminSearchBox';
import AdminBackButton from '@/components/AdminBackButton';
import { Input } from '@/components/ui/input';
import { FormSubmit } from '@/components/ui/form-submit';
import dynamic from 'next/dynamic';
import { getGlobalMarkup } from '@/lib/pricing';
const SyncProductsDialog = dynamic(() => import('@/components/SyncProductsDialog'));
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
const AdminManageStatusSelect = dynamic(() => import('@/components/AdminManageStatusSelect'));

function ProductTypeFilter({ currentType }: { currentType: string }) {
  'use client';
  return (
    <select 
      className="input text-xs"
      defaultValue={currentType}
      onChange={(e) => {
        const url = new URL(window.location.href);
        if (e.target.value === 'all') {
          url.searchParams.delete('type');
        } else {
          url.searchParams.set('type', e.target.value);
        }
        window.location.href = url.toString();
      }}
    >
      <option value="all">ทุกประเภท</option>
      <option value="gtopup">Gtopup (เติมเกม)</option>
      <option value="mtopup">Mtopup (เติมเงินมือถือ)</option>
      <option value="cashcard">Cashcard (บัตรเติมเงิน)</option>
    </select>
  );
}

async function syncAction(productType: string | undefined, options: { 
  resetProductName: boolean; 
  resetItemName: boolean;
  resetPrice: boolean;
  resetInputs: boolean;
  deleteRemoved: boolean;
}) {
  'use server';
  const admin = await requireAdmin();
  if (!admin) { return; }
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) { return; }
  const url = new URL(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/products/sync`);
  if (productType) {
    url.searchParams.set('product_type', productType);
  }
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(options)
  });
  await res.json();
  revalidatePath('/admin/products/manage');
  redirect(`/admin/products/manage?status=ok${productType ? `&type=${productType}` : ''}`);
}

async function batchUpdateAction(formData: FormData) {
  'use server';
  const admin = await requireAdmin();
  if (!admin) { return; }
  const sb = createServiceClient();
  const productIds = (formData.getAll('product_ids') || []).map((v) => Number(String(v)));
  for (const pid of productIds) {
    const name = String(formData.get(`name_${pid}`) || '').trim();
    const image = String(formData.get(`image_${pid}`) || '').trim();
    const banner = String(formData.get(`banner_${pid}`) || '').trim();
    const tutorialVideoUrl = String(formData.get(`tutorial_video_url_${pid}`) || '').trim();
    const tutorialVideoThumbnailUrl = String(formData.get(`tutorial_video_thumbnail_url_${pid}`) || '').trim();
    const publish = formData.get(`publish_${pid}`) != null;
    const badgeEnabled = formData.get(`badge_enabled_${pid}`) != null;
    const badgePercentRaw = formData.get(`badge_percent_${pid}`);
    let badgePercent: number | null = null;
    if (badgePercentRaw !== null && String(badgePercentRaw).trim().length) {
      const parsed = Number(String(badgePercentRaw));
      if (!Number.isNaN(parsed)) {
        badgePercent = Math.max(0, Math.round(parsed));
      }
    }
    const badgeTextRaw = formData.get(`badge_text_${pid}`);
    const badgeText = typeof badgeTextRaw === 'string' ? badgeTextRaw.trim() : '';
    const badgeApply = formData.get(`badge_apply_price_${pid}`) != null;
    await sb
      .from('products')
      .update({
        name,
        image_url: image || null,
        banner_url: banner || null,
        tutorial_video_url: tutorialVideoUrl || null,
        tutorial_video_thumbnail_url: tutorialVideoThumbnailUrl || null,
        is_published: publish,
        badge_enabled: badgeEnabled,
        badge_percent: badgePercent,
        badge_text: badgeText ? badgeText : null,
        badge_apply_price: badgeApply
      })
      .eq('id', pid);
    const selected = (formData.getAll(`cat_${pid}`) || []).map((v) => Number(String(v)));
    await sb.from('product_categories').delete().eq('product_id', pid);
    if (selected.length) {
      const rows = selected.map((cid) => ({ product_id: pid, category_id: cid }));
      await sb.from('product_categories').insert(rows);
    }
  }
  revalidatePath('/admin/products/manage');
  redirect('/admin/products/manage?status=ok');
}

export default async function AdminProductsManagePage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const admin = await requireAdmin();
  if (!admin) return <main className="mx-auto max-w-6xl px-4 py-6">Unauthorized</main>;

  const globalMarkup = await getGlobalMarkup();
  const sb = createServiceClient();
  const filter = typeof searchParams?.filter === 'string' ? searchParams.filter : 'all';
  const productType = typeof searchParams?.type === 'string' ? searchParams.type : 'all';
  let q = sb.from('products').select('id, name, key, is_published, image_url, banner_url, tutorial_video_url, tutorial_video_thumbnail_url, badge_enabled, badge_percent, badge_text, badge_apply_price, product_type');
  if (filter === 'published') q = q.eq('is_published', true);
  if (filter === 'unpublished') q = q.eq('is_published', false);
  if (productType === 'gtopup') q = q.eq('product_type', 'gtopup');
  if (productType === 'mtopup') q = q.eq('product_type', 'mtopup');
  if (productType === 'cashcard') q = q.eq('product_type', 'cashcard');
  const { data: products } = await q.order('is_published', { ascending: false }).order('name');
  const { data: categories } = await sb.from('categories').select('id, name, slug').eq('is_published', true).order('name');
  const { data: pc } = await sb.from('product_categories').select('product_id, category_id');
  const catsByProduct = new Map<number, number[]>();
  for (const row of pc || []) {
    const pid = (row as any).product_id as number;
    const cid = (row as any).category_id as number;
    const arr = catsByProduct.get(pid) || [];
    arr.push(cid);
    catsByProduct.set(pid, arr);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AdminBackButton />
          <h1 className="text-xl font-semibold">จัดการบริการ</h1>
        </div>
        <div className="flex items-center gap-3">
          <SyncProductsDialog 
            productType={productType !== 'all' ? productType : undefined} 
            action={syncAction} 
            label={productType !== 'all' ? `Sync ${productType === 'gtopup' ? 'เติมเกม' : productType === 'mtopup' ? 'เติมเงินมือถือ' : 'บัตรเติมเงิน'}` : 'Sync ทั้งหมด'} 
          />
        </div>
      </div>
      <div className="flex justify-between items-center -mt-2 gap-2">
        <ProductTypeFilter currentType={productType} />
        <AdminManageStatusSelect />
      </div>
      {searchParams?.status === 'ok' && (
        <Alert>
          <AlertTitle>บันทึกสำเร็จ</AlertTitle>
          <AlertDescription>อัปเดตการตั้งค่าเรียบร้อย</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end -mt-2 gap-2">
        <a href="/admin/pricing" className="px-3 py-2 text-xs rounded border border-white/10 hover:bg-white/5">ควบคุมราคา (ทั้งเว็บ)</a>
      </div>
      <AdminSearchBox />
      <form action={batchUpdateAction} className="space-y-2">
        {(products || []).map((p) => (
          <div key={p.id} className="card p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" data-admin-product data-search-text={`${p.name} ${p.key}`}>
            <div className="flex items-center gap-3 min-w-0">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-white/10" />
              )}
              <div className="min-w-0">
                <input type="hidden" name="product_ids" value={String(p.id)} />
                <div className="flex items-center gap-2">
                  <Input name={`name_${p.id}`} defaultValue={p.name} className="w-[240px]" />
                </div>
                <div className="text-xs text-[color:var(--text)]/60 truncate mt-1">key: {p.key}</div>
              </div>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 md:w-auto md:grid-cols-[1fr_auto_auto] md:items-center">
              <div className="flex flex-col gap-2">
                <input className="input w-full md:w-72" name={`image_${p.id}`} placeholder="วางลิงก์รูป (Product Icon)..." defaultValue={p.image_url || ''} />
                <input className="input w-full md:w-72" name={`banner_${p.id}`} placeholder="วางลิงก์รูป Banner..." defaultValue={(p as any).banner_url || ''} />
                <input className="input w-full md:w-72" name={`tutorial_video_url_${p.id}`} placeholder="วางลิงก์วิดีโอ (YouTube embed URL หรือ iframe code)..." defaultValue={(p as any).tutorial_video_url || ''} />
                <input className="input w-full md:w-72" name={`tutorial_video_thumbnail_url_${p.id}`} placeholder="วางลิงก์รูป Thumbnail วิดีโอ (ถ้าไม่มีจะใช้ banner/image)..." defaultValue={(p as any).tutorial_video_thumbnail_url || ''} />
              </div>
              <a href={`/admin/products/${p.id}/pricing`} className="inline-flex items-center justify-center rounded-md border border-white/20 px-3 py-2 text-xs hover:bg-white/10 shrink-0">กำหนดราคา</a>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${p.is_published ? 'bg-emerald-600/30 text-emerald-300' : 'bg-white/10 text-[color:var(--text)]/60'}`}>
                  {p.is_published ? 'เผยแพร่' : 'ยังไม่เผยแพร่'}
                </span>
                <Switch id={`pub_${p.id}`} name={`publish_${p.id}`} value="1" defaultChecked={p.is_published} />
              </div>
              {categories && categories.length > 0 && (
                <div className="col-span-full card p-3 flex flex-wrap items-center gap-3">
                  <div className="text-xs text-[color:var(--text)]/70 mr-2">หมวดหมู่:</div>
                  {categories.map((c) => {
                    const checked = (catsByProduct.get(p.id) || []).includes(c.id);
                    return (
                      <div key={c.id} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-2 py-1">
                        <Switch id={`p${p.id}-c${c.id}`} name={`cat_${p.id}`} value={String(c.id)} defaultChecked={checked} />
                        <Label htmlFor={`p${p.id}-c${c.id}`} className="text-xs">{c.name}</Label>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="col-span-full card p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Switch id={`badge_${p.id}`} name={`badge_enabled_${p.id}`} value="1" defaultChecked={Boolean((p as any).badge_enabled)} />
                  <Label htmlFor={`badge_${p.id}`} className="text-xs">แสดง Badge โปรโมชั่น</Label>
                  {Boolean((p as any).badge_enabled) && (((p as any).badge_text && String((p as any).badge_text).trim().length) || (p as any).badge_percent != null) && (
                    <span className="text-xs text-[color:var(--text)]/60">ตัวอย่าง: {String((p as any).badge_text || `${(p as any).badge_percent}% OFF`)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch id={`badge_apply_${p.id}`} name={`badge_apply_price_${p.id}`} value="1" defaultChecked={Boolean((p as any).badge_apply_price)} />
                  <Label htmlFor={`badge_apply_${p.id}`} className="text-xs">ลดราคาจริง (ปรับราคาขาย)</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input type="number" min="0" max="100" step="1" name={`badge_percent_${p.id}`} defaultValue={(p as any).badge_percent != null ? String((p as any).badge_percent) : ''} placeholder="% ลด" className="w-24" />
                  <Input name={`badge_text_${p.id}`} defaultValue={(p as any).badge_text || ''} placeholder="ข้อความ badge เช่น Flash Sale" className="flex-1 min-w-[200px]" />
                </div>
                <p className="text-xs text-[color:var(--text)]/50">ถ้าปล่อยว่างข้อความ ระบบจะแสดงตามเปอร์เซ็นต์ เช่น 10% OFF</p>
              </div>
            </div>
          </div>
        ))}
        <div className="flex justify-end pt-2"><FormSubmit>บันทึกทั้งหมด</FormSubmit></div>
      </form>
    </main>
  );
}
