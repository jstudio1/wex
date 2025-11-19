'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import ReCaptcha from '@/components/ReCaptcha';

export default function LoginClient() {
  const searchParams = useSearchParams();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaEnabled, setRecaptchaEnabled] = useState(false);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('');
  const [recaptchaKey, setRecaptchaKey] = useState(0); // Force re-render
  const toast = useToast();

  useEffect(() => {
    fetch('/api/recaptcha/config', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        console.log('[Login] reCaptcha config:', data);
        setRecaptchaEnabled(data.enabled === true);
        setRecaptchaSiteKey(data.siteKey || '');
      })
      .catch((err) => {
        console.error('[Login] Error fetching reCaptcha config:', err);
        setRecaptchaEnabled(false);
      });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check reCaptcha if enabled
    if (recaptchaEnabled && !recaptchaToken) {
      setError('กรุณายืนยัน reCaptcha');
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'กรุณายืนยัน reCaptcha', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          usernameOrEmail, 
          password,
          ...(recaptchaToken && { recaptchaToken })
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.error === 'recaptcha_failed') {
          throw new Error('reCaptcha ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        }
        if (json?.error === 'account_disabled') {
          throw new Error(json?.message || 'บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        }
        if (json?.error === 'invalid_credentials') {
          throw new Error(json?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        }
        if (json?.error === 'invalid_payload') {
          throw new Error(json?.message || 'กรุณากรอกข้อมูลให้ครบถ้วน');
        }
        throw new Error(json?.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }
      toast.show({ title: 'สำเร็จ', description: 'เข้าสู่ระบบเรียบร้อย' });
      const redirectTo = searchParams?.get('redirect') || '/products';
      window.location.href = redirectTo;
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setError(msg);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: msg, variant: 'destructive' });
      // Reset reCaptcha on error
      if (recaptchaEnabled) {
        setRecaptchaToken(null);
        setRecaptchaKey((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="shadow-input w-full rounded-none border border-white/15 bg-black/80 p-4 backdrop-blur-md md:rounded-2xl md:p-8">
        <h2 className="text-xl font-bold text-[color:var(--text)]">ยินดีต้อนรับ</h2>
        <p className="mt-2 max-w-sm text-sm text-[color:var(--text)]/70">เข้าสู่ระบบเพื่อใช้งานเว็บไซต์</p>
        <form className="my-8" onSubmit={onSubmit}>
          <div className="mb-4 grid gap-2">
            <Label htmlFor="usernameOrEmail" className="text-[color:var(--text)]">ชื่อผู้ใช้หรืออีเมล</Label>
            <Input id="usernameOrEmail" placeholder="username หรือ email@example.com" value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} />
          </div>
          <div className="mb-6 grid gap-2">
            <Label htmlFor="password" className="text-[color:var(--text)]">รหัสผ่าน</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {recaptchaEnabled && recaptchaSiteKey && (
            <div className="mb-4">
              <ReCaptcha
                key={recaptchaKey}
                siteKey={recaptchaSiteKey}
                onVerify={(token) => setRecaptchaToken(token)}
                onExpire={() => setRecaptchaToken(null)}
                onError={() => {
                  setRecaptchaToken(null);
                  setError('เกิดข้อผิดพลาดกับ reCaptcha');
                }}
                disabled={loading}
              />
            </div>
          )}
          {error && <p className="-mt-4 mb-4 text-sm text-red-400">{error}</p>}
          <button type="submit" className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-accent to-accent/80 font-medium text-[color:var(--text)] shadow-lg disabled:opacity-60">
            {loading ? (<span className="inline-flex items-center gap-2"><Spinner /> กำลังเข้าสู่ระบบ...</span>) : 'เข้าสู่ระบบ →'}
            <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
            <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
          </button>
          <div className="mt-6 text-center text-sm text-[color:var(--text)]/70">
            ยังไม่มีบัญชี? <Link href="/register" className="text-accent underline hover:text-accent/80">สมัครสมาชิก</Link>
          </div>
        </form>
      </div>
    </main>
  );
}


