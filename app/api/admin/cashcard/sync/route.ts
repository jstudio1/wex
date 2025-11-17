import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'webhook_secret_not_configured' }, { status: 500 });
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${siteUrl}/api/cashcard/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });

    const json = await response.json();

    if (!response.ok) {
      return NextResponse.json(json, { status: response.status });
    }

    return NextResponse.json(json);
  } catch (error) {
    console.error('Admin cashcard sync error:', error);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

