'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogIn, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function NavAuthButtons() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLoginSubmit(e: React.FormEvent) {
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
      window.dispatchEvent(new Event('wallet:changed'));
      window.location.reload();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'สมัครสมาชิกไม่สำเร็จ');
      // Close register dialog and open login
      setRegisterOpen(false);
      resetRegisterState();
      setLoginOpen(true);
      setError('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const resetLoginState = () => { 
    setUsername(''); 
    setPassword(''); 
    setError(null); 
    setLoading(false); 
  };

  const resetRegisterState = () => { 
    setUsername(''); 
    setPassword(''); 
    setRepassword('');
    setError(null); 
    setLoading(false); 
  };

  return (
    <>
      <div className="hidden md:flex items-center divide-x divide-white/30">
        <button
          onClick={() => setLoginOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 font-medium transition-opacity duration-200 hover:opacity-80 [&]:!text-white"
          style={{ color: 'white !important' }}
        >
          <LogIn className="h-5 w-5" style={{ color: 'white' }} />
          <span style={{ color: 'white' }}>เข้าสู่ระบบ</span>
        </button>
        <button
          onClick={() => setRegisterOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 font-medium transition-opacity duration-200 hover:opacity-80 [&]:!text-white"
          style={{ color: 'white !important' }}
        >
          <UserPlus className="h-5 w-5" style={{ color: 'white' }} />
          <span style={{ color: 'white' }}>สมัครสมาชิก</span>
        </button>
      </div>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onOpenChange={(open) => {
        setLoginOpen(open);
        if (!open) resetLoginState();
      }}>
        <DialogContent className="sm:max-w-[480px] bg-transparent border-0 shadow-none p-0 overflow-visible">
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#0a0a0a] text-white shadow-2xl">
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 px-8 py-6 relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                    <LogIn className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">เข้าสู่ระบบ</h2>
                </div>
                <p className="text-white/95 text-sm">กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งาน</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={onLoginSubmit} className="px-8 py-6 space-y-5 bg-[#0a0a0a]">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300 font-medium text-sm">ชื่อผู้ใช้หรืออีเมล</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="กรอกชื่อผู้ใช้หรืออีเมลของคุณ" 
                  required 
                  className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-11 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 font-medium text-sm">รหัสผ่าน</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="กรอกรหัสผ่าน" 
                  required 
                  className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-11 rounded-lg"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="remember" className="w-4 h-4 accent-emerald-600 rounded" />
                  <span className="text-sm text-gray-300">จดจำการเข้าสู่ระบบ</span>
                </label>
              </div>
              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white h-12 rounded-lg font-semibold shadow-lg shadow-emerald-500/30"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    เข้าสู่ระบบ
                  </>
                )}
              </Button>
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setLoginOpen(false);
                    resetLoginState();
                    setRegisterOpen(true);
                  }}
                  className="flex-1 inline-flex items-center justify-center border-2 border-emerald-600 bg-[#0a0a0a] text-emerald-400 hover:bg-emerald-900/30 hover:border-emerald-500 hover:text-emerald-300 h-11 rounded-lg font-semibold transition-colors"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  สมัครสมาชิก
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Dialog */}
      <Dialog open={registerOpen} onOpenChange={(open) => {
        setRegisterOpen(open);
        if (!open) resetRegisterState();
      }}>
        <DialogContent className="sm:max-w-[480px] bg-transparent border-0 shadow-none p-0 overflow-visible">
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#0a0a0a] text-white shadow-2xl">
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 px-8 py-6 relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">สมัครสมาชิก</h2>
                </div>
                <p className="text-white/95 text-sm">สร้างบัญชีใหม่เพื่อเริ่มต้นใช้งาน</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={onRegisterSubmit} className="px-8 py-6 space-y-5 bg-[#0a0a0a]">
              <div className="space-y-2">
                <Label htmlFor="reg-username" className="text-gray-300 font-medium text-sm">ชื่อผู้ใช้</Label>
                <Input 
                  id="reg-username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="กรอกชื่อผู้ใช้" 
                  required 
                  className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-11 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-gray-300 font-medium text-sm">รหัสผ่าน</Label>
                <Input 
                  id="reg-password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="กรอกรหัสผ่าน" 
                  required 
                  className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-11 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-repassword" className="text-gray-300 font-medium text-sm">ยืนยันรหัสผ่าน</Label>
                <Input 
                  id="reg-repassword" 
                  type="password" 
                  value={repassword} 
                  onChange={(e) => setRepassword(e.target.value)} 
                  placeholder="กรอกรหัสผ่านอีกครั้ง" 
                  required 
                  className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-11 rounded-lg"
                />
              </div>
              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white h-12 rounded-lg font-semibold shadow-lg shadow-emerald-500/30"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    กำลังสมัคร...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    สมัครสมาชิก
                  </>
                )}
              </Button>
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterOpen(false);
                    resetRegisterState();
                    setLoginOpen(true);
                  }}
                  className="flex-1 inline-flex items-center justify-center border-2 border-emerald-600 bg-[#0a0a0a] text-emerald-400 hover:bg-emerald-900/30 hover:border-emerald-500 hover:text-emerald-300 h-11 rounded-lg font-semibold transition-colors"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  เข้าสู่ระบบ
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
