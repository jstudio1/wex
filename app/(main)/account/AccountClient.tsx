'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { 
  User, 
  Wallet, 
  ShoppingBag, 
  LogOut,
  Camera,
  Check,
  Save,
  X,
  CreditCard
} from 'lucide-react';

interface ProfileData {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
  points: number;
  is_admin: boolean;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

interface AccountClientProps {
  profile: ProfileData;
}

type QuickAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const quickActions: QuickAction[] = [
  {
    id: 'topup',
    label: 'เติมพอยต์',
    description: 'เพิ่มยอดพอยต์ทันที',
    href: '/wallet/topup',
    icon: CreditCard,
    accent: 'from-emerald-500/10 to-emerald-500/30 border-emerald-500/40 text-emerald-200',
  },
  {
    id: 'history',
    label: 'ประวัติการเติมเงิน',
    description: 'ตรวจสอบการเติมล่าสุด',
    href: '/wallet/history',
    icon: Wallet,
    accent: 'from-sky-500/10 to-sky-500/25 border-sky-500/40 text-sky-200',
  },
  {
    id: 'orders',
    label: 'คำสั่งซื้อทั้งหมด',
    description: 'ดูสถานะรายการสั่งซื้อ',
    href: '/orders',
    icon: ShoppingBag,
    accent: 'from-violet-500/10 to-violet-500/25 border-violet-500/40 text-violet-200',
  },
];

export default function AccountClient({ profile: initialProfile }: AccountClientProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form states - เฉพาะข้อมูลที่กรอกตอนสมัครสมาชิก
  const [formData, setFormData] = useState({
    username: initialProfile.username || '',
    email: initialProfile.email || '',
    phone: initialProfile.phone || '',
    firstName: initialProfile.first_name || '',
    lastName: initialProfile.last_name || '',
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatar_url || null);
  const [uploading, setUploading] = useState(false);

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/account/profile');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          username: data.username || '',
          email: data.email || '',
          phone: data.phone || '',
          firstName: data.first_name || '',
          lastName: data.last_name || '',
        });
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      toast.show({
        title: 'บันทึกสำเร็จ',
        description: 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว',
      });
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    loadProfile();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.show({
        title: 'ประเภทไฟล์ไม่ถูกต้อง',
        description: 'กรุณาเลือกไฟล์รูปภาพ (JPEG, PNG, WebP, GIF)',
        variant: 'destructive',
      });
      return;
    }

    // ตรวจสอบขนาดไฟล์ (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.show({
        title: 'ไฟล์ใหญ่เกินไป',
        description: 'ขนาดไฟล์ต้องไม่เกิน 5MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/account/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
      const data = await res.json();
        throw new Error(data.message || data.error || 'ไม่สามารถอัปโหลดรูปได้');
      }

      const data = await res.json();
      setAvatarUrl(data.avatar_url);

      toast.show({
        title: 'อัปโหลดสำเร็จ',
        description: 'อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว',
      });
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getInitials = () => {
    if (formData.firstName && formData.lastName) {
      return `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`.toUpperCase();
    }
    if (formData.firstName) {
      return formData.firstName.charAt(0).toUpperCase();
    }
    return initialProfile.username.charAt(0).toUpperCase();
  };

  if (loading) {
  return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090909]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="rounded-2xl border border-white/10 bg-[#0f0f10] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-3xl font-bold shadow-inner shadow-emerald-900/60 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    getInitials()
                  )}
                </div>
                <button
                  className="absolute -bottom-2 -right-2 rounded-full bg-[#0a0a0a] border border-white/10 p-2 text-white hover:bg-white/10 transition-colors"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                  <Camera className="size-4" />
                </button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/70">บัญชีของฉัน</p>
                <h1 className="mt-1 text-2xl font-bold text-white">{formData.firstName || formData.username}</h1>
                <p className="text-sm text-white/60">เข้าร่วมระบบเมื่อ {formatDate(initialProfile.created_at)}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs text-white/50">พอยต์ปัจจุบัน</p>
                <p className="text-2xl font-bold text-emerald-300 mt-1">{initialProfile.points.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs text-white/50">ชื่อผู้ใช้</p>
                <p className="text-lg font-semibold text-white mt-1 truncate">{formData.username}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs text-white/50">อัปเดตล่าสุด</p>
                <p className="text-sm font-medium text-white mt-1">{formatDate(initialProfile.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-xl border border-white/10 bg-[#0c0c0c] p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/40">เมนูลัด</p>
                  <h3 className="text-lg font-semibold text-white mt-1">การจัดการบัญชีรวดเร็ว</h3>
                </div>
                <div className="grid gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.id}
                        href={action.href}
                        className={`group rounded-2xl border px-4 py-4 transition-all hover:-translate-y-0.5 ${action.accent}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-black/40 p-2">
                            <Icon className="size-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{action.label}</p>
                            <p className="text-xs text-white/70">{action.description}</p>
                          </div>
                          <div className="text-sm text-white/60 group-hover:text-white transition-colors">→</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 flex items-center justify-center gap-2"
                >
                  <LogOut className="size-4" />
                  ออกจากระบบ
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#050505]/90 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col gap-2 border-b border-white/5 pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">จัดการข้อมูลส่วนตัว</h2>
                  <p className="text-sm text-white/60">
                    อัปเดตเฉพาะข้อมูลที่ให้ไว้ตอนสมัครสมาชิก เพื่อความถูกต้องของบัญชี
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <X className="mr-2 size-4" />
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {saving ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 size-4" />
                        บันทึก
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-8 pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs uppercase tracking-[0.3em] text-white/40">ชื่อผู้ใช้</Label>
                    <Input value={formData.username} disabled className="bg-white/5 border-white/10 text-white mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.3em] text-white/40">หมายเลขผู้ใช้</Label>
                    <Input value={String(initialProfile.id)} disabled className="bg-white/5 border-white/10 text-white mt-1.5" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="email" className="text-sm text-white/70">
                      อีเมล
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-white/5 border-white/10 text-white mt-1.5"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-white/70">เข้าร่วมเมื่อ</Label>
                    <Input value={formatDate(initialProfile.created_at)} disabled className="bg-white/5 border-white/10 text-white mt-1.5" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className="text-sm text-white/70">
                      ชื่อ
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="bg-white/5 border-white/10 text-white mt-1.5"
                      placeholder="กรอกชื่อ"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm text-white/70">
                      นามสกุล
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="bg-white/5 border-white/10 text-white mt-1.5"
                      placeholder="กรอกนามสกุล"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm text-white/70">
                    เบอร์โทรศัพท์ <span className="text-white/40">(ไม่บังคับ)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white/5 border-white/10 text-white mt-1.5"
                    placeholder="0812345678"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
