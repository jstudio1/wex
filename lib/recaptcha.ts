import { createServiceClient } from './supabase';

export async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    // Get reCaptcha settings
    const sb = createServiceClient();
    const { data: settingsRows } = await sb
      .from('settings')
      .select('key, value')
      .in('key', ['RECAPTCHA_ENABLED', 'RECAPTCHA_SECRET_KEY']);

    const settings: Record<string, string> = {};
    for (const row of settingsRows || []) {
      settings[row.key as string] = row.value as string;
    }

    const isEnabled = settings.RECAPTCHA_ENABLED === 'true';
    const secretKey = settings.RECAPTCHA_SECRET_KEY || '';

    // If reCaptcha is disabled, skip verification
    if (!isEnabled || !secretKey) {
      return true;
    }

    // If no token provided, fail verification
    if (!token || token.trim() === '') {
      return false;
    }

    // Verify token with Google
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('reCaptcha verification error:', error);
    return false;
  }
}

