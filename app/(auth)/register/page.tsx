'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import ReCaptcha from '@/components/ReCaptcha';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaEnabled, setRecaptchaEnabled] = useState(false);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('');
  const [recaptchaKey, setRecaptchaKey] = useState(0); // Force re-render
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    // Check if registration is enabled and get reCaptcha config
    Promise.all([
      fetch('/api/site', { cache: 'no-store' }).then((res) => res.json()),
      fetch('/api/recaptcha/config', { cache: 'no-store' }).then((res) => res.json())
    ])
      .then(([siteData, recaptchaData]) => {
        console.log('[Register] reCaptcha config:', recaptchaData);
        if (siteData.registerEnabled === false) {
          toast.show({
            title: 'การสมัครสมาชิกถูกปิดใช้งาน',
            description: 'ขณะนี้ไม่สามารถสมัครสมาชิกใหม่ได้',
            variant: 'destructive'
          });
          router.push('/login');
        } else {
          setRecaptchaEnabled(recaptchaData.enabled === true);
          setRecaptchaSiteKey(recaptchaData.siteKey || '');
          setChecking(false);
        }
      })
      .catch((err) => {
        console.error('[Register] Error fetching config:', err);
        setChecking(false);
      });
  }, [router, toast]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repassword) {
      toast.show({ title: 'รหัสผ่านไม่ตรงกัน', description: 'โปรดตรวจสอบรหัสผ่านอีกครั้ง', variant: 'destructive' });
      return;
    }

    // Check reCaptcha if enabled
    if (recaptchaEnabled && !recaptchaToken) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'กรุณายืนยัน reCaptcha', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password,
          ...(recaptchaToken && { recaptchaToken })
        })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.error === 'registration_disabled') {
          throw new Error('การสมัครสมาชิกถูกปิดใช้งาน');
        }
        if (json.error === 'recaptcha_failed') {
          throw new Error('reCaptcha ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        }
        throw new Error(json.error === 'username_taken' ? 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' : 'สมัครสมาชิกไม่สำเร็จ');
      }
      toast.show({ title: 'สำเร็จ', description: 'สมัครสมาชิกเรียบร้อย โปรดเข้าสู่ระบบ' });
      window.location.href = '/login';
    } catch (err: unknown) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
      // Reset reCaptcha on error
      if (recaptchaEnabled) {
        setRecaptchaToken(null);
        setRecaptchaKey((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="shadow-input w-full rounded-none border border-white/15 bg-black/80 p-4 backdrop-blur-md md:rounded-2xl md:p-8 flex items-center justify-center min-h-[200px]">
          <Spinner className="size-8" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="shadow-input w-full rounded-none border border-white/15 bg-black/80 p-4 backdrop-blur-md md:rounded-2xl md:p-8">
        <h2 className="text-xl font-bold text-[color:var(--text)]">สมัครสมาชิก</h2>
        <p className="mt-2 max-w-sm text-sm text-[color:var(--text)]/70">สร้างบัญชีใหม่เพื่อเริ่มต้นใช้งาน</p>
        <form onSubmit={onSubmit} className="my-8">
          <div className="mb-4 grid gap-2">
            <Label htmlFor="username" className="text-[color:var(--text)]">ชื่อผู้ใช้</Label>
            <Input id="username" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="mb-4 grid gap-2">
            <Label htmlFor="password" className="text-[color:var(--text)]">รหัสผ่าน</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="mb-6 grid gap-2">
            <Label htmlFor="repassword" className="text-[color:var(--text)]">ยืนยันรหัสผ่าน</Label>
            <Input id="repassword" type="password" placeholder="••••••••" value={repassword} onChange={(e) => setRepassword(e.target.value)} />
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
                  toast.show({ title: 'เกิดข้อผิดพลาด', description: 'เกิดข้อผิดพลาดกับ reCaptcha', variant: 'destructive' });
                }}
                disabled={loading}
              />
            </div>
          )}
          <button type="submit" className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-accent to-accent/80 font-medium text-[color:var(--text)] shadow-lg disabled:opacity-60">
            {loading ? (<span className="inline-flex items-center gap-2"><Spinner /> กำลังสมัคร...</span>) : 'สมัครสมาชิก →'}
            <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
            <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
          </button>
        </form>
      </div>
    </main>
  );
}


