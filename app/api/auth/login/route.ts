import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validators';
import { verifyPassword } from '@/lib/hash';
import { createServiceClient } from '@/lib/supabase';
import { signJwt } from '@/lib/jwt';
import { verifyRecaptcha } from '@/lib/recaptcha';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'invalid_payload', 
        message: 'กรุณากรอกชื่อผู้ใช้หรืออีเมลและรหัสผ่านให้ถูกต้อง' 
      }, { status: 400 });
    }

    const { usernameOrEmail, password, recaptchaToken } = parsed.data;

    // Verify reCaptcha if enabled
    if (recaptchaToken) {
      const isValid = await verifyRecaptcha(recaptchaToken);
      if (!isValid) {
        return NextResponse.json({ error: 'recaptcha_failed' }, { status: 400 });
      }
    }
    const sb = createServiceClient();
    
    // ตรวจสอบว่าเป็น email หรือ username
    const isEmail = usernameOrEmail.includes('@');
    let query = sb
      .from('users')
      .select('id, username, password_hash, is_active, email');
    
    if (isEmail) {
      query = query.eq('email', usernameOrEmail);
    } else {
      query = query.eq('username', usernameOrEmail);
    }
    
    const { data: user, error } = await query.maybeSingle();
    if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });
    if (!user) {
      return NextResponse.json({ 
        error: 'invalid_credentials', 
        message: 'ไม่พบผู้ใช้ในระบบ กรุณาตรวจสอบชื่อผู้ใช้หรืออีเมล' 
      }, { status: 401 });
    }

    // ตรวจสอบว่าผู้ใช้ถูกปิดใช้งานหรือไม่
    if (user.is_active === false) {
      return NextResponse.json({ error: 'account_disabled', message: 'บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ' }, { status: 403 });
    }

    const ok = await verifyPassword(password, user.password_hash as string);
    if (!ok) {
      return NextResponse.json({ 
        error: 'invalid_credentials', 
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' 
      }, { status: 401 });
    }

    const token = await signJwt({ sub: String(user.id), username: user.username });
    const res = NextResponse.json({ user: { id: user.id, username: user.username } });
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



