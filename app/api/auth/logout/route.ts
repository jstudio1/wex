import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/url';

export async function POST() {
  const baseUrl = getBaseUrl();
  const res = NextResponse.redirect(new URL('/products', baseUrl));
  res.cookies.set('auth_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
  return res;
}



