import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OTP24HR_API_KEY = 'UYA1F2168KC6FE2AG5K1161WFGTDWRV9NONHBG';
const OTP24HR_API_URL = 'https://otp24hr.com/api/v2/mail';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mail = searchParams.get('mail');

    if (!mail) {
      return NextResponse.json(
        { error: 'กรุณาระบุอีเมล' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      return NextResponse.json(
        { error: 'รูปแบบอีเมลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Call otp24hr.com API
    const apiUrl = `${OTP24HR_API_URL}?mail=${encodeURIComponent(mail)}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Key': OTP24HR_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OTP24HR API Error:', errorText);
      return NextResponse.json(
        { error: 'ไม่สามารถดึงข้อมูลอีเมลได้', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('OTP Mail API Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลอีเมล', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

