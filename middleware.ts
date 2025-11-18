import { NextResponse, type NextRequest } from 'next/server';
import { verifyJwt } from './lib/jwt';
import { createServiceClient } from './lib/supabase';

const AUTH_PATHS = [
  /^\/api\/orders(\/?|$)/,
  /^\/orders(\/?|$)/,
  /^\/admin(\/?|$)/
];

const ALLOWED_PATHS_IN_MAINTENANCE = [
  /^\/backoffice(\/?|$)/,
  /^\/api\/admin(\/?|$)/,
  /^\/api\/auth\/login(\/?|$)/,
  /^\/maintenance(\/?|$)/,
  /^\/api\/site(\/?|$)/,
];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;
  
  // Check maintenance mode (skip for API routes to avoid blocking API calls that need to check maintenance)
  if (!url.startsWith('/api/') && url !== '/maintenance') {
    try {
      const sb = createServiceClient();
      const { data: maintenanceData } = await sb
        .from('settings')
        .select('value')
        .eq('key', 'MAINTENANCE_MODE')
        .maybeSingle();
      
      const isMaintenanceMode = maintenanceData?.value === 'true';
      
      if (isMaintenanceMode) {
        // Block /login when maintenance mode is on
        if (url === '/login') {
          return NextResponse.redirect(new URL('/maintenance', req.url));
        }
        
        // Allow access to backoffice, and maintenance page
        const isAllowedPath = ALLOWED_PATHS_IN_MAINTENANCE.some((p) => p.test(url));
        
        if (!isAllowedPath) {
          // Check if user is admin
          const token = req.cookies.get('auth_token')?.value;
          if (token) {
            try {
              const payload = await verifyJwt<{ sub: string }>(token);
              const { data: userData } = await sb
                .from('users')
                .select('is_admin')
                .eq('id', Number(payload.sub))
                .maybeSingle();
              
              if (userData?.is_admin === true) {
                // Admin can access, continue
                // Don't return here, let it continue to auth check
              } else {
                // Not admin, redirect to maintenance
                return NextResponse.redirect(new URL('/maintenance', req.url));
              }
            } catch {
              // Invalid token, redirect to maintenance
              return NextResponse.redirect(new URL('/maintenance', req.url));
            }
          } else {
            // No token, redirect to maintenance
            return NextResponse.redirect(new URL('/maintenance', req.url));
          }
        }
      }
    } catch (error) {
      // If error checking maintenance mode, continue normally
      console.error('Error checking maintenance mode:', error);
    }
  }
  
  // Original auth check
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
    const payload = await verifyJwt<{ sub: string }>(token);
    // ตรวจสอบว่า user ถูกปิดใช้งานหรือไม่
    const sb = createServiceClient();
    const { data: userData } = await sb
      .from('users')
      .select('is_active')
      .eq('id', Number(payload.sub))
      .maybeSingle();
    
    if (userData && userData.is_active === false) {
      // User ถูกปิดใช้งาน
      if (url.startsWith('/api/')) {
        return NextResponse.json({ error: 'account_disabled', message: 'บัญชีของคุณถูกปิดใช้งาน' }, { status: 403 });
      }
      // ลบ cookie และ redirect ไป login
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('error', 'account_disabled');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('auth_token');
      return response;
    }
    
    return NextResponse.next();
  } catch {
    if (url.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/orders/:path*',
    '/((?!_next/static|_next/image|favicon.ico|maintenance).*)',
  ],
};


