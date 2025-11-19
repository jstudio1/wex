import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

const providerSchema = z.object({
  provider_company_id: z.string().min(1, { message: 'provider_company_id_required' }),
  provider_name: z.string().optional().nullable(),
  discount_percent: z.number().min(0).max(100),
});

const payloadSchema = z.object({
  providers: z.array(providerSchema).min(1),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServiceClient();
    const [{ data: products }, { data: overrides }] = await Promise.all([
      sb
        .from('products')
        .select('provider_company_id, name')
        .not('provider_company_id', 'is', null)
        .neq('provider_company_id', ''),
      sb.from('product_agent_discounts').select('*'),
    ]);

    const overrideMap = new Map<string, { discount_percent: number; provider_name: string | null }>();
    for (const row of overrides || []) {
      const id = String(row.provider_company_id || '').trim();
      if (!id) continue;
      overrideMap.set(id, {
        discount_percent: Number(row.discount_percent ?? 0),
        provider_name: row.provider_name || null,
      });
    }

    const providerMap = new Map<
      string,
      { provider_company_id: string; provider_name: string; discount_percent: number; product_count: number }
    >();

    for (const product of products || []) {
      const id = String(product.provider_company_id || '').trim();
      if (!id) continue;
      const existing = providerMap.get(id);
      const override = overrideMap.get(id);
      if (existing) {
        existing.product_count += 1;
      } else {
        providerMap.set(id, {
          provider_company_id: id,
          provider_name: override?.provider_name || product.name || id,
          discount_percent: override?.discount_percent ?? 0,
          product_count: 1,
        });
      }
    }

    // Include overrides no longer tied to products (in caseต้องการแก้ไขภายหลัง)
    for (const [id, override] of overrideMap.entries()) {
      if (!providerMap.has(id)) {
        providerMap.set(id, {
          provider_company_id: id,
          provider_name: override.provider_name || id,
          discount_percent: override.discount_percent ?? 0,
          product_count: 0,
        });
      }
    }

    const list = Array.from(providerMap.values()).sort((a, b) =>
      a.provider_name.localeCompare(b.provider_name, 'th'),
    );

    return NextResponse.json({ ok: true, data: list });
  } catch (err) {
    console.error('[agent-discounts][GET] unexpected error', err);
    return NextResponse.json({ error: 'unexpected', detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = payloadSchema.parse(body);
    const sb = createServiceClient();
    const rows = parsed.providers.map((provider) => ({
      provider_company_id: provider.provider_company_id.trim(),
      provider_name: provider.provider_name?.trim() || null,
      discount_percent: Math.min(100, Math.max(0, provider.discount_percent)),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await sb.from('product_agent_discounts').upsert(rows, { onConflict: 'provider_company_id' });
    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('[agent-discounts][PUT] unexpected error', err);
    return NextResponse.json({ error: 'unexpected', detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}


