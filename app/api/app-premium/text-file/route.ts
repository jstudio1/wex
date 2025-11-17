import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json({ error: 'missing_url' }, { status: 400 });
    }

    // Validate URL to prevent SSRF
    if (!fileUrl.startsWith('https://otp24hr.com/')) {
      return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
    }

    console.log(`[App Premium Text File] Fetching: ${fileUrl}`);

    // Fetch from OTP24HR API
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      console.error(`[App Premium Text File] HTTP error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'fetch_failed', detail: `HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const text = await response.text();
    console.log(`[App Premium Text File] Successfully fetched ${text.length} characters`);

    return NextResponse.json({ ok: true, content: text });
  } catch (error) {
    console.error('[App Premium Text File] Error:', error);
    return NextResponse.json(
      { error: 'unexpected', detail: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

