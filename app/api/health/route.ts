import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL || '';
    const anon = process.env.SUPABASE_ANON_KEY || '';
    const service = process.env.SUPABASE_SERVICE_ROLE || '';

    const missing: string[] = [];
    if (!url) missing.push('SUPABASE_URL');
    if (!anon) missing.push('SUPABASE_ANON_KEY');
    if (!service) missing.push('SUPABASE_SERVICE_ROLE');

    return NextResponse.json({
      ok: missing.length === 0,
      missing,
      lengths: {
        SUPABASE_URL: url.length,
        SUPABASE_ANON_KEY: anon.length,
        SUPABASE_SERVICE_ROLE: service.length
      }
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'unexpected' }, { status: 500 });
  }
}



