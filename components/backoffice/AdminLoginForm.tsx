'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';

export default function AdminLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'เข้าสู่ระบบไม่สำเร็จ');
      
      // Check if user is admin
      const checkRes = await fetch('/api/admin/check');
      const checkData = await checkRes.json();
      if (!checkData.isAdmin) {
        throw new Error('บัญชีนี้ไม่ใช่ผู้ดูแลระบบ');
      }
      
      toast.show({ title: 'สำเร็จ', description: 'เข้าสู่ระบบเรียบร้อย' });
      window.location.href = '/backoffice';
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setError(msg);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="shadow-input w-full rounded-none border border-white/15 bg-black/80 p-4 backdrop-blur-md md:rounded-2xl md:p-8">
          <div className="mb-6 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/50 border border-emerald-800/50">
              <Shield className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-center text-xl font-bold text-[color:var(--text)]">เข้าสู่ระบบผู้ดูแล</h2>
          <p className="mt-2 text-center text-sm text-[color:var(--text)]/70">กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ</p>
          <form className="my-8" onSubmit={onSubmit}>
            <div className="mb-4 grid gap-2">
              <Label htmlFor="admin-username" className="text-[color:var(--text)]">ชื่อผู้ใช้</Label>
              <Input 
                id="admin-username" 
                placeholder="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mb-6 grid gap-2">
              <Label htmlFor="admin-password" className="text-[color:var(--text)]">รหัสผ่าน</Label>
              <Input 
                id="admin-password" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            {error && <p className="-mt-4 mb-4 text-sm text-red-400">{error}</p>}
            <button 
              type="submit" 
              className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-emerald-600 to-emerald-500 font-medium text-white shadow-lg disabled:opacity-60 hover:from-emerald-500 hover:to-emerald-400 transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                'เข้าสู่ระบบ →'
              )}
              <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
              <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

