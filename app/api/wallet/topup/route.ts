import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { logTopupToDiscord } from '@/lib/discord';

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const amount = Number(body?.amount || 0);
  if (!(amount > 0)) return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  const sb = createServiceClient();
  const { error } = await sb.rpc('wallet_credit', { u: user.id, amt: amount });
  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });

  // ส่ง Discord webhook log
  try {
    await logTopupToDiscord({
      username: user.username,
      userId: user.id,
      amount: amount,
      method: 'code',
    });
  } catch (err) {
    console.error('Discord webhook error:', err);
    // ไม่ throw error
  }

  return NextResponse.json({ ok: true });
}



