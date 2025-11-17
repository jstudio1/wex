import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';
import { createSocialOrderSchema } from '@/lib/validators';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';
import { logOrderToDiscord } from '@/lib/discord';

const API_URL = 'https://socialtools24hr.com/api/v1';

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    const { data: orders, error } = await sb
      .from('social_orders')
      .select(`
        id,
        external_order_id,
        link,
        quantity,
        price,
        status,
        charge,
        start_count,
        remains,
        created_at,
        updated_at,
        social_services (
          id,
          display_name,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: orders || [] });
  } catch (error) {
    console.error('social orders fetch error', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

function buildAddOrderPayload(apiKey: string, params: { service: string; link: string; quantity: number; runs?: number; interval?: number }) {
  const data = new URLSearchParams({
    key: apiKey,
    action: 'add',
    service: String(params.service),
    link: params.link,
    quantity: String(params.quantity)
  });
  if (params.runs) data.set('runs', String(params.runs));
  if (params.interval) data.set('interval', String(params.interval));
  return data;
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const apiKey = await getApiKey('SOCIAL_API_KEY');
  if (!apiKey) return NextResponse.json({ error: 'missing_social_api_key' }, { status: 500 });

  try {
    const body = await req.json();
    const parsed = createSocialOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', detail: parsed.error.flatten() }, { status: 400 });
    }

    const { service_id, link, quantity, runs, interval } = parsed.data;

    const sb = createServiceClient();
    const { data: service, error: serviceError } = await sb
      .from('social_services')
      .select('*')
      .eq('id', service_id)
      .eq('is_published', true)
      .maybeSingle();

    if (serviceError) return NextResponse.json({ error: 'db_error', detail: serviceError.message }, { status: 500 });
    if (!service) return NextResponse.json({ error: 'service_not_found' }, { status: 404 });

    if (quantity < service.min_quantity || quantity > service.max_quantity) {
      return NextResponse.json({ error: 'quantity_out_of_range', detail: { min: service.min_quantity, max: service.max_quantity } }, { status: 400 });
    }

    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();

    const basePerThousand = Number(service.base_rate_thb || 0);
    const basePrice = (basePerThousand / 1000) * quantity;
    const finalPrice = computePrice(
      basePrice,
      Number(service.markup_percent || 0),
      Number(service.markup_fixed || 0),
      globalPct,
      globalFix
    );

    // ตรวจสอบว่า user มี points เพียงพอหรือไม่
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('points')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'db_error', detail: 'ไม่สามารถตรวจสอบยอดเงินได้' }, { status: 500 });
    }

    const userPoints = Number(userData.points || 0);
    if (userPoints < finalPrice) {
      return NextResponse.json({ 
        error: 'insufficient_funds', 
        detail: `ยอดเงินไม่เพียงพอ (ต้องการ ${finalPrice.toFixed(2)} พอยต์, มี ${userPoints.toFixed(2)} พอยต์)` 
      }, { status: 400 });
    }

    // หัก points จาก wallet
    const debitRes = await sb.rpc('wallet_debit', { u: user.id, amt: finalPrice });
    if (debitRes.error || debitRes.data === false || debitRes.data === null) {
      console.error('wallet_debit error:', debitRes.error);
      return NextResponse.json({ error: 'deduct_failed', detail: 'ไม่สามารถหักเงินได้' }, { status: 500 });
    }

    const payload = buildAddOrderPayload(apiKey, {
      service: String(service.provider_service_id),
      link,
      quantity,
      runs,
      interval
    });

    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload
    });

    const responseJson = await upstream.json();

    // New API returns { status: "success", order: 32 }
    if (!upstream.ok || responseJson.status !== 'success' || !responseJson.order) {
      await sb.rpc('wallet_credit', { u: user.id, amt: finalPrice });
      return NextResponse.json({ error: 'provider_error', detail: responseJson?.error || responseJson }, { status: 502 });
    }

    const externalId = responseJson.order ? String(responseJson.order) : null;

    await sb.from('social_orders').insert({
      external_order_id: externalId ? String(externalId) : null,
      user_id: user.id,
      social_service_id: service.id,
      link,
      quantity,
      runs: runs ?? null,
      interval_minutes: interval ?? null,
      price: finalPrice,
      raw_response: responseJson,
      status: 'processing'
    });

    // ส่ง Discord webhook log
    try {
      await logOrderToDiscord({
        type: 'social',
        username: user.username,
        userId: user.id,
        productName: service.display_name || service.name,
        amount: finalPrice,
        reference: externalId ? String(externalId) : undefined,
        status: 'processing',
        additionalInfo: {
          '🔗 ลิงก์': link,
          '📊 จำนวน': `${quantity}`,
          ...(runs ? { '🔄 รอบ': `${runs}` } : {}),
          ...(interval ? { '⏱️ ระยะเวลา': `${interval} นาที` } : {}),
        }
      });
    } catch (err) {
      console.error('Discord webhook error:', err);
      // ไม่ throw error
    }

    return NextResponse.json({ ok: true, order: { id: externalId, price: finalPrice } });
  } catch (error) {
    console.error('social order error', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

