import { NextResponse, type NextRequest } from 'next/server';
import { verifyJwt } from './lib/jwt';

const AUTH_PATHS = [
  /^\/api\/orders(\/?|$)/,
  /^\/orders(\/?|$)/,
  /^\/admin(\/?|$)/
];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;
  const needAuth = AUTH_PATHS.some((p) => p.test(url));
  if (!needAuth) return NextResponse.next();

  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    if (url.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await verifyJwt(token);
    return NextResponse.next();
  } catch {
    if (url.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/api/:path*', '/orders/:path*']
};


