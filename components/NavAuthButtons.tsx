'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogIn, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useAuthDialog } from '@/contexts/AuthDialogContext';

export default function NavAuthButtons() {
  const { isLoginOpen, isRegisterOpen, setLoginOpen, setRegisterOpen } = useAuthDialog();
  const loginOpen = isLoginOpen;
  const registerOpen = isRegisterOpen;
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Register enabled state
  const [registerEnabled, setRegisterEnabled] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/site', { cache: 'no-store' })
      .then((res) => res.json())
      .then((siteData) => {
        setRegisterEnabled(siteData.registerEnabled !== false); // default true
      })
      .catch(() => {
        setRegisterEnabled(true);
      });
  }, []);

  async function onLoginSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          usernameOrEmail, 
          password
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // ใช้ message จาก API response ก่อน ถ้าไม่มีค่อยใช้ error code
        if (json?.message) {
          throw new Error(json.message);
        }
        // Fallback ตาม error code
        if (json?.error === 'recaptcha_failed') {
          throw new Error('reCaptcha ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        }
        if (json?.error === 'account_disabled') {
          throw new Error('บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        }
        if (json?.error === 'invalid_credentials') {
          throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        }
        if (json?.error === 'invalid_payload') {
          throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
        }
        throw new Error(json?.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
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

    if (!acceptedTerms) {
      setError('กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password,
          firstName,
          lastName,
          email,
          phone: phone || undefined
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // ใช้ message จาก API response ก่อน ถ้าไม่มีค่อยใช้ error code
        if (json?.message) {
          throw new Error(json.message);
        }
        // Fallback ตาม error code
        if (json?.error === 'recaptcha_failed') {
          throw new Error('reCaptcha ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        }
        if (json?.error === 'username_taken') {
          throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
        }
        if (json?.error === 'email_taken') {
          throw new Error('อีเมลนี้ถูกใช้งานแล้ว');
        }
        if (json?.error === 'registration_disabled') {
          throw new Error('การสมัครสมาชิกถูกปิดใช้งาน');
        }
        if (json?.error === 'invalid_payload') {
          throw new Error('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
        }
        throw new Error(json?.error || 'สมัครสมาชิกไม่สำเร็จ');
      }
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
    setUsernameOrEmail(''); 
    setPassword(''); 
    setError(null); 
    setLoading(false); 
  };

  const resetRegisterState = () => { 
    setUsername(''); 
    setPassword(''); 
    setRepassword('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAcceptedTerms(false);
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
          onClick={() => {
            if (!registerEnabled) {
              toast.show({
                title: 'การสมัครสมาชิกถูกปิดใช้งาน',
                description: 'ขณะนี้ไม่สามารถสมัครสมาชิกใหม่ได้',
                variant: 'destructive'
              });
              return;
            }
            setRegisterOpen(true);
          }}
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
                <Label htmlFor="usernameOrEmail" className="text-gray-300 font-medium text-sm">ชื่อผู้ใช้หรืออีเมล</Label>
                <Input 
                  id="usernameOrEmail" 
                  value={usernameOrEmail} 
                  onChange={(e) => setUsernameOrEmail(e.target.value)} 
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
                    if (!registerEnabled) {
                      toast.show({
                        title: 'การสมัครสมาชิกถูกปิดใช้งาน',
                        description: 'ขณะนี้ไม่สามารถสมัครสมาชิกใหม่ได้',
                        variant: 'destructive'
                      });
                      return;
                    }
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
        if (open && !registerEnabled) {
          toast.show({
            title: 'การสมัครสมาชิกถูกปิดใช้งาน',
            description: 'ขณะนี้ไม่สามารถสมัครสมาชิกใหม่ได้',
            variant: 'destructive'
          });
          return;
        }
        setRegisterOpen(open);
        if (!open) resetRegisterState();
      }}>
        <DialogContent className="sm:max-w-[680px] bg-transparent border-0 shadow-none p-0 overflow-hidden max-h-[88dvh]">
          <div className="rounded-2xl border border-gray-800 bg-[#0a0a0a] text-white shadow-2xl flex flex-col max-h-[88dvh] overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 px-6 py-4 relative overflow-hidden flex-shrink-0">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-1">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">สมัครสมาชิก</h2>
                </div>
                <p className="text-white/95 text-xs">สร้างบัญชีใหม่เพื่อเริ่มต้นใช้งาน</p>
              </div>
            </div>

            {/* Form - Scrollable */}
            <form onSubmit={onRegisterSubmit} className="px-6 py-5 bg-[#0a0a0a] overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Row 1: ชื่อ + นามสกุล */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-firstName" className="text-gray-300 font-medium text-xs">ชื่อ</Label>
                    <Input 
                      id="reg-firstName" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      placeholder="กรอกชื่อ" 
                      required 
                      className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-lastName" className="text-gray-300 font-medium text-xs">นามสกุล</Label>
                    <Input 
                      id="reg-lastName" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      placeholder="กรอกนามสกุล" 
                      required 
                      className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-10 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Row 2: ชื่อผู้ใช้ + อีเมล */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                    <Label htmlFor="reg-username" className="text-gray-300 font-medium text-xs">ชื่อผู้ใช้</Label>
                <Input 
                  id="reg-username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="กรอกชื่อผู้ใช้" 
                  required 
                      className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-10 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-gray-300 font-medium text-xs">อีเมล</Label>
                    <Input 
                      id="reg-email" 
                      type="email"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="email@example.com" 
                      required 
                      className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-10 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Row 3: เบอร์โทร */}
                <div className="space-y-2">
                  <Label htmlFor="reg-phone" className="text-gray-300 font-medium text-xs">
                    เบอร์โทรศัพท์ <span className="text-gray-500 font-normal">(ไม่บังคับ)</span>
                  </Label>
                  <Input 
                    id="reg-phone" 
                    type="tel"
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="0812345678" 
                    className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-10 rounded-lg text-sm"
                  />
                </div>

                {/* Row 4: รหัสผ่าน + ยืนยันรหัสผ่าน */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-gray-300 font-medium text-xs">รหัสผ่าน</Label>
                <Input 
                  id="reg-password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="กรอกรหัสผ่าน" 
                  required 
                      className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-10 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-repassword" className="text-gray-300 font-medium text-xs">ยืนยันรหัสผ่าน</Label>
                <Input 
                  id="reg-repassword" 
                  type="password" 
                  value={repassword} 
                  onChange={(e) => setRepassword(e.target.value)} 
                  placeholder="กรอกรหัสผ่านอีกครั้ง" 
                  required 
                  className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30 h-10 rounded-lg text-sm"
                />
              </div>
            </div>

                {/* Terms and Privacy Checkbox */}
                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="accept-terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 border-gray-600 accent-emerald-600"
                  />
                  <label
                    htmlFor="accept-terms"
                    className="text-xs text-gray-300 leading-relaxed cursor-pointer"
                  >
                    ยอมรับ{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-emerald-400 hover:text-emerald-300 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ข้อกำหนดการใช้งาน
                    </Link>
                    {' '}และ{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-emerald-400 hover:text-emerald-300 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      นโยบายความเป็นส่วนตัว
                    </Link>
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-2.5 rounded-lg text-xs font-medium">
                  {error}
                </div>
              )}
              </div>
            </form>

            {/* Footer with buttons */}
            <div className="px-6 py-4 bg-[#0a0a0a] border-t border-gray-800 flex-shrink-0 space-y-3">
              <Button 
                type="button" 
                onClick={onRegisterSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white h-10 rounded-lg font-semibold shadow-lg shadow-emerald-500/30 text-sm"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    กำลังสมัคร...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    สมัครสมาชิก
                  </>
                )}
              </Button>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterOpen(false);
                    resetRegisterState();
                    setLoginOpen(true);
                  }}
                className="w-full inline-flex items-center justify-center border-2 border-emerald-600 bg-[#0a0a0a] text-emerald-400 hover:bg-emerald-900/30 hover:border-emerald-500 hover:text-emerald-300 h-10 rounded-lg font-semibold transition-colors text-sm"
                >
                <LogIn className="mr-2 h-4 w-4" />
                  เข้าสู่ระบบ
                </button>
              </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
