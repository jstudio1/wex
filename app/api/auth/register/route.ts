import { NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validators';
import { hashPassword } from '@/lib/hash';
import { createServiceClient } from '@/lib/supabase';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { getErrorMessage } from '@/lib/error-messages';

export async function POST(req: Request) {
  try {
    // Check if registration is enabled
    const sb = createServiceClient();
    const { data: registerSetting } = await sb
      .from('settings')
      .select('value')
      .eq('key', 'REGISTER_ENABLED')
      .maybeSingle();
    
    const isRegisterEnabled = registerSetting?.value !== 'false'; // default true
    if (!isRegisterEnabled) {
      return NextResponse.json({ 
        error: 'registration_disabled',
        message: getErrorMessage('registration_disabled')
      }, { status: 403 });
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'invalid_payload',
        message: getErrorMessage('invalid_payload')
      }, { status: 400 });
    }

    const { username, password, firstName, lastName, email, phone, recaptchaToken } = parsed.data;

    // Verify reCaptcha if enabled
    if (recaptchaToken) {
      const isValid = await verifyRecaptcha(recaptchaToken);
      if (!isValid) {
        return NextResponse.json({ 
          error: 'recaptcha_failed',
          message: getErrorMessage('recaptcha_failed')
        }, { status: 400 });
      }
    }
    const password_hash = await hashPassword(password);

    // ตรวจสอบ username และ email ซ้ำ
    const [usernameCheck, emailCheck] = await Promise.all([
      sb.from('users').select('id').eq('username', username).maybeSingle(),
      sb.from('users').select('id').eq('email', email).maybeSingle(),
    ]);
    
    if (usernameCheck.error || emailCheck.error) {
      return NextResponse.json({ 
        error: 'db_error',
        message: getErrorMessage('db_error')
      }, { status: 500 });
    }
    
    if (usernameCheck.data) {
      return NextResponse.json({ 
        error: 'username_taken',
        message: getErrorMessage('username_taken')
      }, { status: 409 });
    }
    
    if (emailCheck.data) {
      return NextResponse.json({ 
        error: 'email_taken',
        message: getErrorMessage('email_taken')
      }, { status: 409 });
    }

    const { data, error } = await sb
      .from('users')
      .insert({ 
        username, 
        password_hash,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null
      })
      .select('id, username, email, first_name, last_name, phone')
      .single();
    if (error) {
      return NextResponse.json({ 
        error: 'db_error',
        message: getErrorMessage('db_error')
      }, { status: 500 });
    }

    try {
      const { sendTelegramNotification } = await import('@/lib/telegram');
      await sendTelegramNotification(
        `👤 <b>ผู้ใช้ใหม่สมัครสมาชิก</b>\n\n<b>Username:</b> ${data.username}\n<b>ชื่อ:</b> ${data.first_name} ${data.last_name}\n<b>อีเมล:</b> ${data.email}${data.phone ? `\n<b>เบอร์โทร:</b> ${data.phone}` : ''}`,
        'registration'
      );
    } catch (e) {
      console.error('Failed to send registration telegram notification:', e);
    }

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ 
      error: 'unexpected',
      message: getErrorMessage('unexpected')
    }, { status: 500 });
  }
}



