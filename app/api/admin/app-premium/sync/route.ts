import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'missing_secret' }, { status: 500 });

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${siteUrl}/api/app-premium/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` }
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    console.error('App premium sync proxy error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

