'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { UserCircle, Lock, Coins, Calendar, Shield } from 'lucide-react';

interface ProfileData {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
  points: number;
  is_admin: boolean;
}

interface AccountClientProps {
  profile: ProfileData;
}

export default function AccountClient({ profile: initialProfile }: AccountClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.show({
        title: 'รหัสผ่านไม่ตรงกัน',
        description: 'โปรดตรวจสอบรหัสผ่านอีกครั้ง',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast.show({
        title: 'รหัสผ่านสั้นเกินไป',
        description: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
        }
        throw new Error(data.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      }

      toast.show({
        title: 'สำเร็จ',
        description: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(220, 38, 38) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>
      
      {/* Decorative Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-red-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 shadow-lg">
            <UserCircle className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">จัดการโปรไฟล์</h1>
            <p className="text-sm text-gray-600">ข้อมูลบัญชีและการตั้งค่า</p>
          </div>
        </div>

        {/* ข้อมูลบัญชี */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-red-600" />
            ข้อมูลบัญชี
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-red-50 to-pink-50 border border-red-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 shadow-md">
                <Coins className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-600">พอยต์คงเหลือ</div>
                <div className="text-xl font-bold text-red-600">{initialProfile.points.toFixed(2)} บาท</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-600 shadow-md">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-600">วันที่สมัครสมาชิก</div>
                <div className="text-sm font-medium text-gray-900">{formatDate(initialProfile.created_at)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* เปลี่ยนรหัสผ่าน */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-600" />
            เปลี่ยนรหัสผ่าน
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current_password" className="text-gray-700 font-medium">รหัสผ่านปัจจุบัน</Label>
              <Input
                id="current_password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-12 border-2 border-gray-400 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-200 shadow-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new_password" className="text-gray-700 font-medium">รหัสผ่านใหม่</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 border-2 border-gray-400 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-200 shadow-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm_password" className="text-gray-700 font-medium">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 border-2 border-gray-400 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-200 shadow-sm"
              />
            </div>
            <Button 
              type="submit" 
              disabled={changingPassword} 
              className="w-full md:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
            >
              {changingPassword ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  กำลังเปลี่ยนรหัสผ่าน...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  เปลี่ยนรหัสผ่าน
                </span>
              )}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
