'use client';

import { useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function LoginDialog() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.error === 'invalid_credentials') {
          throw new Error(json?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        }
        if (json?.error === 'invalid_payload') {
          throw new Error(json?.message || 'กรุณากรอกข้อมูลให้ครบถ้วน');
        }
        if (json?.error === 'account_disabled') {
          throw new Error(json?.message || 'บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        }
        throw new Error(json?.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }
      window.dispatchEvent(new Event('wallet:changed'));
      window.location.reload();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const resetState = () => { setUsernameOrEmail(''); setPassword(''); setError(null); setLoading(false); };

  return (
    <Dialog onOpenChange={(v) => { if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button type="button" className="px-3 py-2 text-xs" variant="outline">เข้าสู่ระบบ</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] border-0 bg-transparent p-0">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/80 shadow-2xl backdrop-blur-md">
          <div className="bg-gradient-to-br from-white/10 to-transparent px-5 py-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://sv1.img.in.th/71ng7t.png" alt="Logo" className="h-7 w-auto opacity-90" />
              <div>
                <DialogTitle>เข้าสู่ระบบ</DialogTitle>
                <DialogDescription>กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งาน</DialogDescription>
              </div>
            </div>
          </div>
          <form onSubmit={onSubmit} className="px-5 pb-5 pt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="usernameOrEmail">ชื่อผู้ใช้หรืออีเมล</Label>
                <Input id="usernameOrEmail" value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} placeholder="username หรือ email@example.com" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <DialogClose asChild>
                <Button type="button" variant="ghost">ยกเลิก</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>{loading ? (<><Spinner /> กำลังเข้าสู่ระบบ</>) : 'เข้าสู่ระบบ'}</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}



