import { NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validators';
import { hashPassword } from '@/lib/hash';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

    const { username, password } = parsed.data;
    const password_hash = await hashPassword(password);
    const sb = createServiceClient();

    const { data: existing, error: findErr } = await sb
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (findErr) return NextResponse.json({ error: 'db_error' }, { status: 500 });
    if (existing) return NextResponse.json({ error: 'username_taken' }, { status: 409 });

    const { data, error } = await sb
      .from('users')
      .insert({ username, password_hash })
      .select('id, username')
      .single();
    if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



