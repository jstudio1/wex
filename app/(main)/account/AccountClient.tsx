'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { UserCircle, Lock, Coins, Calendar } from 'lucide-react';

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
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <UserCircle className="size-8 text-accent" />
        <h1 className="text-2xl md:text-3xl font-bold text-[color:var(--text)]">จัดการโปรไฟล์</h1>
      </div>

      {/* ข้อมูลบัญชี */}
      <section className="shadow-input rounded-xl border border-white/15 bg-black/80 p-6 md:p-8 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-[color:var(--text)] mb-6 flex items-center gap-2">
          <UserCircle className="size-5" />
          ข้อมูลบัญชี
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
            <Coins className="size-5 text-yellow-300" />
            <div>
              <div className="text-sm text-[color:var(--text)]/70">พอยต์คงเหลือ</div>
              <div className="text-lg font-semibold text-[color:var(--text)]">{initialProfile.points.toFixed(2)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
            <Calendar className="size-5 text-blue-300" />
            <div>
              <div className="text-sm text-[color:var(--text)]/70">วันที่สมัครสมาชิก</div>
              <div className="text-sm font-medium text-[color:var(--text)]">{formatDate(initialProfile.created_at)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* เปลี่ยนรหัสผ่าน */}
      <section className="shadow-input rounded-xl border border-white/15 bg-black/80 p-6 md:p-8 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-[color:var(--text)] mb-6 flex items-center gap-2">
          <Lock className="size-5" />
          เปลี่ยนรหัสผ่าน
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="current_password" className="text-[color:var(--text)]">รหัสผ่านปัจจุบัน</Label>
            <Input
              id="current_password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new_password" className="text-[color:var(--text)]">รหัสผ่านใหม่</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm_password" className="text-[color:var(--text)]">ยืนยันรหัสผ่านใหม่</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" disabled={changingPassword} className="w-full md:w-auto">
            {changingPassword ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                กำลังเปลี่ยนรหัสผ่าน...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Lock className="size-4" />
                เปลี่ยนรหัสผ่าน
              </span>
            )}
          </Button>
        </form>
      </section>
    </main>
  );
}

