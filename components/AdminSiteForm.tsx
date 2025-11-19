'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner, SpinnerCustom } from '@/components/ui/spinner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import * as React from 'react';
import { type DateRange } from 'react-day-picker';
import { ArrowUp, ArrowDown, GripVertical, Home, Menu, CreditCard, Bell, Webhook, Gamepad2, Wallet, Smartphone, Share2, User, Trophy, Coins, Plus, Trash2, Settings, Wrench, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PolicyContent from '@/components/backoffice/PolicyContent';

type SiteData = { 
  title: string; 
  subtitle: string; 
  posters: string[]; 
  flashStart?: string | null; 
  flashEnd?: string | null;
  navbarMenus?: {
    products: boolean;
    social: boolean;
    categories: boolean;
    games: boolean;
    premiumApp: boolean;
    cashcard: boolean;
    contact: boolean;
  };
  navbarMenuOrder?: string[];
  navbarMenuLabels?: {
    products?: string;
    premiumApp?: string;
    social?: string;
    contact?: string;
  };
  paymentMethods?: {
    code: boolean;
    qr: boolean;
    slip: boolean;
    truewallet: boolean;
  };
  bankAccounts?: Array<{
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch?: string;
  }>;
  truewalletPhone?: string;
  discordWebhookUrl?: string;
  discordWebhooks?: {
    products?: string;
    cashcard?: string;
    premiumApp?: string;
    social?: string;
    gameAccounts?: string;
    games?: string;
    wallet?: string;
  };
  contact?: {
    lineId?: string;
    phone?: string;
    facebook?: string;
    email?: string;
  };
  siteBrandName?: string;
  siteTitle?: string;
  siteMetaDescription?: string;
  maintenanceMode?: boolean;
  registerEnabled?: boolean;
  recaptchaSiteKey?: string;
  recaptchaSecretKey?: string;
  recaptchaEnabled?: boolean;
  termsPolicy?: string;
  footer?: {
    logoUrl?: string;
    description?: string;
    openingHours?: string;
    facebookUrl?: string;
    lineUrl?: string;
    instagramUrl?: string;
    phone?: string;
    email?: string;
    workingHours?: string;
    copyright?: string;
  };
};
type AnnouncementData = { text: string; enabled: boolean };

export default function AdminSiteForm() {
  const [form, setForm] = useState<SiteData>({ 
    title: '', 
    subtitle: '', 
    posters: [], 
    flashStart: null, 
    flashEnd: null,
    navbarMenus: {
      products: true,
      social: true,
      categories: true,
      games: true,
      premiumApp: true,
      cashcard: true,
      contact: true,
    },
    navbarMenuOrder: ['products', 'premiumApp', 'social', 'contact'],
    navbarMenuLabels: {
      products: 'เติมเกม',
      premiumApp: 'แอพ',
      social: 'ปั้ม',
      contact: 'ติดต่อเรา'
    },
    paymentMethods: {
      code: true,
      qr: true,
      slip: true,
      truewallet: true,
    },
    bankAccounts: [],
    truewalletPhone: '',
    discordWebhookUrl: '',
    discordWebhooks: {
      products: '',
      cashcard: '',
      premiumApp: '',
      social: '',
      gameAccounts: '',
      games: '',
      wallet: ''
    },
    contact: {
      lineId: '',
      phone: '',
      facebook: '',
      email: ''
    },
    siteBrandName: '',
    siteTitle: '',
    siteMetaDescription: '',
    maintenanceMode: false,
    registerEnabled: true,
    recaptchaSiteKey: '',
    recaptchaSecretKey: '',
    recaptchaEnabled: false,
    termsPolicy: '',
    footer: {
      logoUrl: '',
      description: '',
      openingHours: '',
      facebookUrl: '',
      lineUrl: '',
      instagramUrl: '',
      phone: '',
      email: '',
      workingHours: '',
      copyright: ''
    }
  });
  const [postersText, setPostersText] = useState<string>('');
  const [announcement, setAnnouncement] = useState<AnnouncementData>({ text: '', enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [status, setStatus] = useState<'ok' | 'error' | null>(null);
  const [announcementStatus, setAnnouncementStatus] = useState<'ok' | 'error' | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [openStartPicker, setOpenStartPicker] = useState(false);
  const [openEndPicker, setOpenEndPicker] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/site', { cache: 'no-store' });
        const json = await res.json();
        setForm({ 
          title: json.title || '', 
          subtitle: json.subtitle || '', 
          posters: json.posters || [], 
          flashStart: json.flashStart || '', 
          flashEnd: json.flashEnd || '',
          navbarMenus: json.navbarMenus || {
            products: true,
            social: true,
            categories: true,
            games: true,
            premiumApp: true,
            cashcard: true,
          },
          navbarMenuOrder: json.navbarMenuOrder || ['products', 'premiumApp', 'social', 'contact'],
          navbarMenuLabels: json.navbarMenuLabels || {
            products: 'เติมเกม',
            premiumApp: 'แอพ',
            social: 'ปั้ม',
            contact: 'ติดต่อเรา'
          },
          paymentMethods: json.paymentMethods || {
            code: true,
            qr: true,
            slip: true,
            truewallet: true,
          },
          bankAccounts: Array.isArray(json.bankAccounts) ? json.bankAccounts : [],
          truewalletPhone: json.truewalletPhone || '',
          discordWebhookUrl: json.discordWebhookUrl || '',
          discordWebhooks: json.discordWebhooks || {
            products: '',
            cashcard: '',
            premiumApp: '',
            social: '',
            gameAccounts: '',
            games: '',
            wallet: ''
          },
          contact: json.contact || {
            lineId: '',
            phone: '',
            facebook: '',
            email: ''
          },
          siteBrandName: json.siteBrandName || '',
          siteTitle: json.siteTitle || '',
          siteMetaDescription: json.siteMetaDescription || '',
          maintenanceMode: json.maintenanceMode === true,
          registerEnabled: json.registerEnabled !== false,
          recaptchaSiteKey: json.recaptchaSiteKey || '',
          recaptchaSecretKey: json.recaptchaSecretKey || '',
          recaptchaEnabled: json.recaptchaEnabled === true,
          termsPolicy: json.termsPolicy || '',
          footer: json.footer || {
            logoUrl: '',
            description: '',
            openingHours: '',
            facebookUrl: '',
            lineUrl: '',
            instagramUrl: '',
            phone: '',
            email: '',
            workingHours: '',
            copyright: ''
          }
        });
        setPostersText((json.posters || []).join('\n'));
        
        const annRes = await fetch('/api/admin/announcement', { cache: 'no-store' });
        if (annRes.ok) {
          const annJson = await annRes.json();
          setAnnouncement({ text: annJson.text || '', enabled: annJson.enabled || false });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsSmallScreen(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const addBankAccount = () => {
    setForm((prev) => ({
      ...prev,
      bankAccounts: [...(prev.bankAccounts || []), { bankName: '', accountName: '', accountNumber: '', branch: '' }],
    }));
  };

  const updateBankAccount = (index: number, field: 'bankName' | 'accountName' | 'accountNumber' | 'branch', value: string) => {
    setForm((prev) => {
      const bankAccounts = [...(prev.bankAccounts || [])];
      if (!bankAccounts[index]) return prev;
      bankAccounts[index] = {
        ...bankAccounts[index],
        [field]: value,
      };
      return { ...prev, bankAccounts };
    });
  };

  const removeBankAccount = (index: number) => {
    setForm((prev) => {
      const bankAccounts = [...(prev.bankAccounts || [])];
      bankAccounts.splice(index, 1);
      return { ...prev, bankAccounts };
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const sanitizedPosters = postersText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const sanitizedBankAccounts = (form.bankAccounts || [])
        .map((item) => ({
          bankName: item.bankName?.trim() || '',
          accountName: item.accountName?.trim() || '',
          accountNumber: item.accountNumber?.trim() || '',
          branch: item.branch?.trim() || '',
        }))
        .filter((item) => item.bankName && item.accountName && item.accountNumber)
        .map((item) =>
          item.branch
            ? item
            : {
                bankName: item.bankName,
                accountName: item.accountName,
                accountNumber: item.accountNumber,
              }
        );
      const res = await fetch('/api/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          posters: sanitizedPosters,
          navbarMenuOrder: form.navbarMenuOrder,
          navbarMenuLabels: form.navbarMenuLabels,
          bankAccounts: sanitizedBankAccounts,
          siteBrandName: form.siteBrandName || '',
          siteTitle: form.siteTitle || '',
          siteMetaDescription: form.siteMetaDescription || '',
          maintenanceMode: form.maintenanceMode === true,
          registerEnabled: form.registerEnabled !== false,
          recaptchaSiteKey: form.recaptchaSiteKey || '',
          recaptchaSecretKey: form.recaptchaSecretKey || '',
          recaptchaEnabled: form.recaptchaEnabled === true,
          termsPolicy: form.termsPolicy || '',
          footer: form.footer || {
            logoUrl: '',
            description: '',
            openingHours: '',
            facebookUrl: '',
            lineUrl: '',
            instagramUrl: '',
            phone: '',
            email: '',
            workingHours: '',
            copyright: ''
          }
        })
      });
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ');
      setStatus('ok');
      toast.show({
        title: 'บันทึกสำเร็จ',
        description: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
        variant: 'default'
      });
    } catch (err: unknown) {
      setStatus('error');
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'บันทึกไม่สำเร็จ โปรดลองใหม่',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const onAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAnnouncement(true);
    setAnnouncementStatus(null);
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcement)
      });
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ');
      setAnnouncementStatus('ok');
      toast.show({
        title: 'บันทึกสำเร็จ',
        description: 'บันทึกป้ายประกาศเรียบร้อยแล้ว',
        variant: 'default'
      });
    } catch (err: unknown) {
      setAnnouncementStatus('error');
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'บันทึกไม่สำเร็จ โปรดลองใหม่',
        variant: 'destructive'
      });
    } finally {
      setSavingAnnouncement(false);
    }
  };

  if (loading) return <SpinnerCustom className="py-10" />;

  return (
    <>
    {/* Global Alert */}
    {status === 'ok' && (
      <Alert className="mb-4">
        <AlertTitle>บันทึกสำเร็จ</AlertTitle>
        <AlertDescription>บันทึกการตั้งค่าเรียบร้อย</AlertDescription>
      </Alert>
    )}
    {status === 'error' && (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
        <AlertDescription>บันทึกไม่สำเร็จ โปรดลองใหม่</AlertDescription>
      </Alert>
    )}

    <Tabs defaultValue="homepage" className="w-full">
      <TabsList className="w-full mb-6 grid grid-cols-2 sm:grid-cols-6 gap-2 h-auto">
        <TabsTrigger value="homepage" className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm">
          <Home className="size-4 shrink-0" />
          <span className="hidden sm:inline">หน้าแรก</span>
        </TabsTrigger>
        <TabsTrigger value="navigation" className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm">
          <Menu className="size-4 shrink-0" />
          <span className="hidden sm:inline">เมนู</span>
        </TabsTrigger>
        <TabsTrigger value="payment" className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm">
          <CreditCard className="size-4 shrink-0" />
          <span className="hidden sm:inline">การชำระเงิน</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm">
          <Bell className="size-4 shrink-0" />
          <span className="hidden sm:inline">การแจ้งเตือน</span>
        </TabsTrigger>
        <TabsTrigger value="integrations" className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm col-span-2 sm:col-span-1">
          <Webhook className="size-4 shrink-0" />
          <span className="hidden sm:inline">แจ้งเตือน</span>
        </TabsTrigger>
        <TabsTrigger value="contact" className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm col-span-2 sm:col-span-1">
          <Share2 className="size-4 shrink-0" />
          <span className="hidden sm:inline">ติดต่อ</span>
        </TabsTrigger>
        <TabsTrigger value="site-settings" className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm col-span-2 sm:col-span-1">
          <Wrench className="size-4 shrink-0" />
          <span className="hidden sm:inline">ตั้งค่าเว็บ</span>
        </TabsTrigger>
        <TabsTrigger value="policy" className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm col-span-2 sm:col-span-1">
          <FileText className="size-4 shrink-0" />
          <span className="hidden sm:inline">ตั้งค่า Policy</span>
        </TabsTrigger>
        <TabsTrigger value="footer" className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm col-span-2 sm:col-span-1">
          <Settings className="size-4 shrink-0" />
          <span className="hidden sm:inline">Footer</span>
        </TabsTrigger>
      </TabsList>

      {/* หน้าแรก */}
      <TabsContent value="homepage" className="space-y-4">
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">การตั้งค่าหน้าแรก</h2>
            <p className="text-sm text-[color:var(--text)]/60">ปรับแต่งหัวข้อ, คำอธิบาย, และรูปภาพ</p>
          </div>
          
          {/* Site Branding Settings */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div>
              <h3 className="text-md font-semibold mb-2">ข้อมูลเว็บไซต์</h3>
              <p className="text-sm text-[color:var(--text)]/60 mb-4">ตั้งค่าชื่อแบรนด์, ชื่อเว็บไซต์ และคำอธิบายสำหรับ SEO</p>
            </div>
            
            <div>
              <Label htmlFor="site-brand-name">ชื่อเว็บหรือชื่อแบรนด์</Label>
              <Input 
                id="site-brand-name"
                className="mt-1" 
                value={form.siteBrandName || ''} 
                onChange={(e) => setForm({ ...form, siteBrandName: e.target.value })} 
                placeholder="เช่น WeXPlus"
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">ชื่อแบรนด์ที่ใช้แสดงบนหน้าเว็บ (เช่น NavBar, Footer)</p>
            </div>
            
            <div>
              <Label htmlFor="site-title">ชื่อเว็บไซต์ (Title)</Label>
              <Input 
                id="site-title"
                className="mt-1" 
                value={form.siteTitle || ''} 
                onChange={(e) => setForm({ ...form, siteTitle: e.target.value })} 
                placeholder="เช่น WeXPlus - เติมเกม ราคาถูก เว็บตรง รวดเร็ว ปลอดภัย 24 ชั่วโมง"
              />
              <p className="text-xs text-[color:var(--text)]/60 mt-1">ชื่อเว็บไซต์ที่แสดงบนแท็บเบราว์เซอร์และผลการค้นหา (SEO)</p>
              <p className="text-xs text-[color:var(--text)]/50 mt-1">💡 ควรมีความยาว 50-60 ตัวอักษร</p>
            </div>
            
            <div>
              <Label htmlFor="site-meta-description">คำอธิบายเว็บ (Meta Description)</Label>
              <Textarea
                id="site-meta-description"
                className="mt-1 h-24" 
                value={form.siteMetaDescription || ''} 
                onChange={(e) => setForm({ ...form, siteMetaDescription: e.target.value })} 
                placeholder="เช่น เว็บเติมเกมอันดับ 1 ราคาถูกที่สุด เติมเร็ว ปลอดภัย บริการตลอด 24 ชั่วโมง รองรับทุกเกมดัง พร้อมโปรโมชั่นสุดคุ้ม"
                maxLength={160}
              />
              <p className="text-xs text-[color:var(--text)]/60 mt-1">คำอธิบายที่แสดงในผลการค้นหา Google (SEO)</p>
              <p className="text-xs text-[color:var(--text)]/50 mt-1">💡 ควรมีความยาว 120-160 ตัวอักษร ({form.siteMetaDescription?.length || 0}/160)</p>
            </div>
          </div>
          
          <div>
            <Label>หัวเรื่องหน้าแรก</Label>
            <Input 
              className="mt-1" 
              value={form.title} 
              onChange={(e) => setForm({ ...form, title: e.target.value })} 
            />
          </div>
          <div>
            <Label>คำอธิบาย</Label>
            <Input 
              className="mt-1" 
              value={form.subtitle} 
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })} 
            />
          </div>
          <div>
            <Label>Poster URLs (ขึ้นบรรทัดใหม่แต่ละรูป)</Label>
            <Textarea
              className="mt-1 h-36"
              value={postersText}
              onChange={(e) => {
                setPostersText(e.target.value);
                setForm({ ...form, posters: e.target.value.split('\n') });
              }}
            />
            <p className="text-xs text-[color:var(--text)]/50 mt-1">ใส่ URL ของรูปภาพแต่ละบรรทัด (สำหรับ Hero Slider)</p>
          </div>
          <div>
            <Label>กำหนดเวลา Flash Sale</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Label className="text-xs text-[color:var(--text)]/70">เริ่ม</Label>
                <Popover open={openStartPicker} onOpenChange={setOpenStartPicker}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        readOnly
                        value={form.flashStart ? new Date(form.flashStart).toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                        placeholder="เลือกวันที่เริ่ม"
                      />
                      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">📅</div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.flashStart ? new Date(form.flashStart) : undefined}
                      onSelect={(d) => {
                        const from = d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0) : undefined;
                        setForm((prev) => ({ ...prev, flashStart: from ? from.toISOString() : '' }));
                        setOpenStartPicker(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="relative">
                <Label className="text-xs text-[color:var(--text)]/70">สิ้นสุด</Label>
                <Popover open={openEndPicker} onOpenChange={setOpenEndPicker}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        readOnly
                        value={form.flashEnd ? new Date(form.flashEnd).toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                        placeholder="เลือกวันที่สิ้นสุด"
                      />
                      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">📅</div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.flashEnd ? new Date(form.flashEnd) : undefined}
                      onSelect={(d) => {
                        const to = d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59) : undefined;
                        setForm((prev) => ({ ...prev, flashEnd: to ? to.toISOString() : '' }));
                        setOpenEndPicker(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <Button disabled={saving} type="submit" className="w-full sm:w-auto">
            {saving ? (<><Spinner />กำลังบันทึก...</>) : 'บันทึกการตั้งค่า'}
          </Button>
        </form>
      </TabsContent>

      {/* เมนู */}
      <TabsContent value="navigation" className="space-y-4">
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">การตั้งค่าเมนู NavBar</h2>
            <p className="text-sm text-[color:var(--text)]/60">จัดการการแสดงผลและลำดับเมนูใน NavBar</p>
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-semibold">เรียงลำดับเมนู</Label>
            <p className="text-xs text-[color:var(--text)]/50 mb-3">ลากไอคอน <GripVertical className="inline size-3" /> เพื่อจัดลำดับการแสดงผล</p>
        
        {(() => {
          const menuInfo: Record<string, { label: string; key: string }> = {
            products: { label: 'เติมเกม', key: 'products' },
            premiumApp: { label: 'แอพ', key: 'premiumApp' },
            social: { label: 'ปั้ม', key: 'social' },
            contact: { label: 'ติดต่อเรา', key: 'contact' },
            categories: { label: 'สินค้าอื่นๆ', key: 'categories' },
            games: { label: 'สุ่มรางวัล', key: 'games' },
            cashcard: { label: 'บัตรเติมเงิน', key: 'cashcard' }
          };
          
          const handleDragStart = (e: React.DragEvent, index: number) => {
            setDraggedIndex(index);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', '');
            // Add visual feedback
            if (e.currentTarget instanceof HTMLElement) {
              e.currentTarget.style.opacity = '0.5';
            }
          };
          
          const handleDragEnd = (e: React.DragEvent) => {
            setDraggedIndex(null);
            setDragOverIndex(null);
            if (e.currentTarget instanceof HTMLElement) {
              e.currentTarget.style.opacity = '1';
            }
          };
          
          const handleDragOver = (e: React.DragEvent, index: number) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedIndex !== null && draggedIndex !== index) {
              setDragOverIndex(index);
            }
          };
          
          const handleDragLeave = () => {
            setDragOverIndex(null);
          };
          
          const handleDrop = (e: React.DragEvent, dropIndex: number) => {
            e.preventDefault();
            if (draggedIndex === null) return;
            
            const newOrder = [...(form.navbarMenuOrder || [])];
            const draggedItem = newOrder[draggedIndex];
            newOrder.splice(draggedIndex, 1);
            newOrder.splice(dropIndex, 0, draggedItem);
            
            setForm({ ...form, navbarMenuOrder: newOrder });
            setDraggedIndex(null);
            setDragOverIndex(null);
          };
          
          // Show all menus from menuInfo
          const allMenuKeys = Object.keys(menuInfo);
          const currentOrder = form.navbarMenuOrder || [];
          
          // Combine: menus in order first, then menus not in order
          const allMenus = [
            ...currentOrder.filter(key => allMenuKeys.includes(key)),
            ...allMenuKeys.filter(key => !currentOrder.includes(key))
          ];
          
          return allMenus.map((menuKey, index) => {
            const menu = menuInfo[menuKey];
            if (!menu) return null;
            
            // Use custom label if available, otherwise use default
            const customLabel = form.navbarMenuLabels?.[menu.key as keyof typeof form.navbarMenuLabels];
            const displayLabel = customLabel || menu.label;
            
            const isEnabled = form.navbarMenus?.[menu.key as keyof typeof form.navbarMenus] !== false;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            const isInOrder = currentOrder.includes(menuKey);
            const orderIndex = isInOrder ? currentOrder.indexOf(menuKey) : -1;
            
            return (
              <div
                key={menuKey}
                draggable={isInOrder}
                onDragStart={(e) => {
                  if (isInOrder && orderIndex !== -1) {
                    handleDragStart(e, orderIndex);
                  }
                }}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                  if (isInOrder && orderIndex !== -1) {
                    handleDragOver(e, orderIndex);
                  }
                }}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  if (isInOrder && orderIndex !== -1) {
                    handleDrop(e, orderIndex);
                  }
                }}
                className={`flex flex-col gap-3 p-4 border rounded-lg transition-all duration-200 ${
                  isInOrder ? 'cursor-move' : 'cursor-default'
                } ${
                  isDragging 
                    ? 'opacity-50 border-accent/50 bg-accent/10 scale-95' 
                    : isDragOver
                    ? 'border-accent/70 bg-accent/10 scale-[1.02] shadow-lg shadow-accent/20'
                    : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isInOrder && (
                <div 
                  className="flex items-center gap-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className={`size-5 text-[color:var(--text)]/60 ${isDragging ? 'text-accent' : ''} transition-colors`} />
        </div>
                  )}
                
                  <div className="flex-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor={`menu-label-${menuKey}`} className="text-xs text-[color:var(--text)]/60 mb-1 block">ชื่อเมนู</Label>
                        <Input
                          id={`menu-label-${menuKey}`}
                          value={displayLabel}
                          onChange={(e) => {
                            const newLabels = {
                              ...(form.navbarMenuLabels || {}),
                              [menu.key]: e.target.value
                            };
                            setForm({
                              ...form,
                              navbarMenuLabels: newLabels
                            });
                          }}
                          placeholder={menu.label}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
          <div>
                        <p className="text-xs text-[color:var(--text)]/50">
                      {isEnabled ? 'แสดงใน NavBar' : 'ซ่อนใน NavBar'}
                          {isInOrder && ` • ลำดับที่ ${orderIndex + 1}`}
                    </p>
          </div>
          <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => {
                      const key = menu.key as keyof typeof form.navbarMenus;
                      setForm({
              ...form,
              navbarMenus: { 
                          ...(form.navbarMenus || {}),
                          [key]: checked
                        } as typeof form.navbarMenus
                      });
                    }}
          />
                    </div>
                  </div>
        </div>
          </div>
            );
          });
        })()}
          </div>
          <Button disabled={saving} type="submit" className="w-full sm:w-auto">
            {saving ? (<><Spinner />กำลังบันทึก...</>) : 'บันทึกการตั้งค่า'}
          </Button>
        </form>
      </TabsContent>

      {/* การชำระเงิน */}
      <TabsContent value="payment" className="space-y-4">
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">การตั้งค่าช่องทางการชำระเงินเติมพอยต์</h2>
            <p className="text-sm text-[color:var(--text)]/60">เปิด/ปิดช่องทางการเติมพอยต์แต่ละวิธี</p>
          </div>
          <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>ช่องทาง "ใช้โค้ด"</Label>
            <p className="text-xs text-[color:var(--text)]/50 mt-1">เปิด/ปิดช่องทางเติมพอยต์ด้วยโค้ด</p>
          </div>
          <Switch
            checked={form.paymentMethods?.code !== false}
            onCheckedChange={(checked) => setForm({
              ...form,
              paymentMethods: {
                code: checked,
                qr: form.paymentMethods?.qr ?? true,
                slip: form.paymentMethods?.slip ?? true,
                truewallet: form.paymentMethods?.truewallet ?? true,
              }
            })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>ช่องทาง "QR Payment"</Label>
            <p className="text-xs text-[color:var(--text)]/50 mt-1">เปิด/ปิดช่องทางเติมพอยต์ด้วย QR Payment</p>
          </div>
          <Switch
            checked={form.paymentMethods?.qr !== false}
            onCheckedChange={(checked) => setForm({
              ...form,
              paymentMethods: {
                code: form.paymentMethods?.code ?? true,
                qr: checked,
                slip: form.paymentMethods?.slip ?? true,
                truewallet: form.paymentMethods?.truewallet ?? true,
              }
            })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>ช่องทาง "สลิปโอนเงิน"</Label>
            <p className="text-xs text-[color:var(--text)]/50 mt-1">เปิด/ปิดช่องทางเติมพอยต์ด้วยสลิปโอนเงิน (ตรวจสอบอัตโนมัติ)</p>
          </div>
          <Switch
            checked={form.paymentMethods?.slip !== false}
            onCheckedChange={(checked) => setForm({
              ...form,
              paymentMethods: {
                code: form.paymentMethods?.code ?? true,
                qr: form.paymentMethods?.qr ?? true,
                slip: checked,
                truewallet: form.paymentMethods?.truewallet ?? true,
              }
            })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>ช่องทาง "ซองอั่งเปา TrueWallet"</Label>
            <p className="text-xs text-[color:var(--text)]/50 mt-1">เปิด/ปิดช่องทางเติมพอยต์ด้วยซองอั่งเปา TrueWallet</p>
          </div>
          <Switch
            checked={form.paymentMethods?.truewallet !== false}
            onCheckedChange={(checked) => setForm({
              ...form,
              paymentMethods: {
                code: form.paymentMethods?.code ?? true,
                qr: form.paymentMethods?.qr ?? true,
                slip: form.paymentMethods?.slip ?? true,
                truewallet: checked,
              }
            })}
          />
        </div>
          </div>
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div>
              <h3 className="text-md font-semibold">บัญชีธนาคารสำหรับโอนเงิน</h3>
              <p className="text-sm text-[color:var(--text)]/60">ตั้งค่าบัญชีธนาคารที่จะแสดงให้ลูกค้าเมื่อเลือกชำระเงินด้วยการโอน</p>
              <p className="text-xs text-[color:var(--text)]/50 mt-1">
                💡 <strong>หมายเหตุ:</strong> เลขที่บัญชีที่ตั้งค่าไว้จะถูกใช้เป็น "บัญชีผู้รับที่คาดหวัง" สำหรับตรวจสอบสลิปโอนเงินอัตโนมัติ
              </p>
            </div>
            {(form.bankAccounts || []).length === 0 && (
              <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-4 text-sm text-[color:var(--text)]/60">
                ยังไม่มีบัญชีธนาคาร กรุณาเพิ่มบัญชีใหม่
              </div>
            )}
            {(form.bankAccounts || []).map((account, index) => (
              <div key={index} className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
                    <CreditCard className="size-4" />
                    บัญชีที่ {index + 1}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => removeBankAccount(index)}
                  >
                    <Trash2 className="size-4" />
                    ลบ
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-[color:var(--text)]/70">ธนาคาร</Label>
                    <Input
                      className="mt-1"
                      value={account.bankName}
                      onChange={(e) => updateBankAccount(index, 'bankName', e.target.value)}
                      placeholder="เช่น กสิกรไทย"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[color:var(--text)]/70">ชื่อบัญชี</Label>
                    <Input
                      className="mt-1"
                      value={account.accountName}
                      onChange={(e) => updateBankAccount(index, 'accountName', e.target.value)}
                      placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[color:var(--text)]/70">เลขที่บัญชี</Label>
                    <Input
                      className="mt-1"
                      value={account.accountNumber}
                      onChange={(e) => updateBankAccount(index, 'accountNumber', e.target.value)}
                      placeholder="เช่น 123-4-56789-0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[color:var(--text)]/70">สาขา (ถ้ามี)</Label>
                    <Input
                      className="mt-1"
                      value={account.branch || ''}
                      onChange={(e) => updateBankAccount(index, 'branch', e.target.value)}
                      placeholder="เช่น สาขาสยามพารากอน"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto border-white/30 text-[color:var(--text)] hover:bg-white/10"
              onClick={addBankAccount}
            >
              <Plus className="size-4 mr-2" />
              เพิ่มบัญชีธนาคาร
            </Button>
          </div>
          
          {/* ตั้งค่าเบอร์ TrueWallet */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div>
              <h3 className="text-md font-semibold">ตั้งค่าซองอั่งเปา TrueWallet</h3>
              <p className="text-sm text-[color:var(--text)]/60">ระบุเบอร์โทรศัพท์ TrueWallet สำหรับรับเงินจากซองอั่งเปา</p>
            </div>
            <div>
              <Label className="text-xs text-[color:var(--text)]/70">เบอร์โทรศัพท์ TrueWallet (10 หลัก)</Label>
              <Input
                className="mt-1"
                type="tel"
                maxLength={10}
                value={form.truewalletPhone || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setForm({ ...form, truewalletPhone: value });
                }}
                placeholder="เช่น 0812345678"
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">
                เบอร์นี้จะใช้สำหรับรับเงินจากซองอั่งเปา TrueWallet ที่ลูกค้าแลก
              </p>
            </div>
          </div>
          
          <Button disabled={saving} type="submit" className="w-full sm:w-auto">
            {saving ? (<><Spinner />กำลังบันทึก...</>) : 'บันทึกการตั้งค่า'}
          </Button>
        </form>
      </TabsContent>

      {/* การแจ้งเตือน */}
      <TabsContent value="notifications" className="space-y-4">
        <form onSubmit={onAnnouncementSubmit} className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">ป้ายประกาศ</h2>
            <p className="text-sm text-[color:var(--text)]/60">ตั้งค่าป้ายประกาศที่แสดงใต้ NavBar</p>
          </div>
          {announcementStatus === 'ok' && (
            <Alert>
              <AlertTitle>บันทึกสำเร็จ</AlertTitle>
              <AlertDescription>ปรับแต่งป้ายประกาศเรียบร้อย</AlertDescription>
            </Alert>
          )}
          {announcementStatus === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
              <AlertDescription>บันทึกไม่สำเร็จ โปรดลองใหม่</AlertDescription>
            </Alert>
          )}
          <div>
            <Label>ข้อความป้ายประกาศ</Label>
            <Input 
              className="mt-1" 
              value={announcement.text} 
              onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })} 
              placeholder="กรอกข้อความที่จะแสดงในป้ายประกาศ..."
              maxLength={500}
            />
            <p className="text-xs text-[color:var(--text)]/50 mt-1">{announcement.text.length}/500 ตัวอักษร</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>เปิด/ปิดป้ายประกาศ</Label>
              <p className="text-xs text-[color:var(--text)]/50 mt-1">เปิดเพื่อแสดงป้ายประกาศใต้ NavBar</p>
            </div>
            <Switch
              checked={announcement.enabled}
              onCheckedChange={(checked) => setAnnouncement({ ...announcement, enabled: checked })}
            />
          </div>
          <Button disabled={savingAnnouncement} type="submit" className="w-full sm:w-auto">
            {savingAnnouncement ? (<><Spinner />กำลังบันทึก...</>) : 'บันทึกป้ายประกาศ'}
          </Button>
        </form>

        <AdminPopupForm />
      </TabsContent>

      {/* แจ้งเตือนซื้อสินค้าและบริการ */}
      <TabsContent value="integrations" className="space-y-4">
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">แจ้งเตือนซื้อสินค้าและบริการ</h2>
            <p className="text-sm text-[color:var(--text)]/60">ตั้งค่า Discord Webhook แยกตามแต่ละบริการ (เว้นว่างเพื่อปิดการแจ้งเตือนของบริการนั้น)</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook_products" className="flex items-center gap-2">
                <Gamepad2 className="size-4" />
                Discord Webhook - เติมเกม
              </Label>
              <Input
                id="webhook_products"
                className="mt-1"
                type="url"
                value={form.discordWebhooks?.products || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  discordWebhooks: {
                    ...form.discordWebhooks,
                    products: e.target.value
                  }
                })}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">แจ้งเตือนเมื่อมีการซื้อสินค้าเติมเกม</p>
            </div>

            <div>
              <Label htmlFor="webhook_cashcard" className="flex items-center gap-2">
                <CreditCard className="size-4" />
                Discord Webhook - บัตรเติมเงิน
              </Label>
              <Input
                id="webhook_cashcard"
                className="mt-1"
                type="url"
                value={form.discordWebhooks?.cashcard || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  discordWebhooks: {
                    ...form.discordWebhooks,
                    cashcard: e.target.value
                  }
                })}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">แจ้งเตือนเมื่อมีการซื้อบัตรเติมเงิน</p>
            </div>

            <div>
              <Label htmlFor="webhook_premium_app" className="flex items-center gap-2">
                <Smartphone className="size-4" />
                Discord Webhook - แอพพรีเมียม
              </Label>
              <Input
                id="webhook_premium_app"
                className="mt-1"
                type="url"
                value={form.discordWebhooks?.premiumApp || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  discordWebhooks: {
                    ...form.discordWebhooks,
                    premiumApp: e.target.value
                  }
                })}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">แจ้งเตือนเมื่อมีการซื้อแอพพรีเมียม</p>
            </div>

            <div>
              <Label htmlFor="webhook_social" className="flex items-center gap-2">
                <Share2 className="size-4" />
                Discord Webhook - ปั้มโซเชียล
              </Label>
              <Input
                id="webhook_social"
                className="mt-1"
                type="url"
                value={form.discordWebhooks?.social || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  discordWebhooks: {
                    ...form.discordWebhooks,
                    social: e.target.value
                  }
                })}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">แจ้งเตือนเมื่อมีการซื้อบริการโซเชียล</p>
            </div>

            <div>
              <Label htmlFor="webhook_game_accounts" className="flex items-center gap-2">
                <User className="size-4" />
                Discord Webhook - ไอดีเกม
              </Label>
              <Input
                id="webhook_game_accounts"
                className="mt-1"
                type="url"
                value={form.discordWebhooks?.gameAccounts || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  discordWebhooks: {
                    ...form.discordWebhooks,
                    gameAccounts: e.target.value
                  }
                })}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">แจ้งเตือนเมื่อมีการซื้อไอดีเกม</p>
            </div>

            <div>
              <Label htmlFor="webhook_games" className="flex items-center gap-2">
                <Trophy className="size-4" />
                Discord Webhook - เกมสุ่มรางวัล
              </Label>
              <Input
                id="webhook_games"
                className="mt-1"
                type="url"
                value={form.discordWebhooks?.games || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  discordWebhooks: {
                    ...form.discordWebhooks,
                    games: e.target.value
                  }
                })}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">แจ้งเตือนเมื่อมีการเล่นเกมสุ่มรางวัล</p>
            </div>

            <div>
              <Label htmlFor="webhook_wallet" className="flex items-center gap-2">
                <Coins className="size-4" />
                Discord Webhook - เติมพอยต์
              </Label>
              <Input
                id="webhook_wallet"
                className="mt-1"
                type="url"
                value={form.discordWebhooks?.wallet || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  discordWebhooks: {
                    ...form.discordWebhooks,
                    wallet: e.target.value
                  }
                })}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">แจ้งเตือนเมื่อมีการเติมพอยต์หรือใช้โค้ดเติมพอยต์</p>
            </div>
          </div>

          <Button disabled={saving} type="submit" className="w-full sm:w-auto">
            {saving ? (<><Spinner />กำลังบันทึก...</>) : 'บันทึกการตั้งค่า'}
          </Button>
        </form>
      </TabsContent>

      {/* ติดต่อแอดมิน */}
      <TabsContent value="contact" className="space-y-4">
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">ติดต่อแอดมิน</h2>
            <p className="text-sm text-[color:var(--text)]/60">ตั้งค่าข้อมูลติดต่อที่จะแสดงในปุ่มติดต่อแอดมิน (มุมขวาล่างของเว็บ)</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-line">LINE ID</Label>
              <Input
                id="contact-line"
                value={form.contact?.lineId || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  contact: { ...(form.contact || {}), lineId: e.target.value } 
                })}
                placeholder="เช่น @lineid หรือ https://line.me/ti/p/~lineid"
              />
              <p className="text-xs text-[color:var(--text)]/50">ใส่ LINE ID หรือ URL ของ LINE</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-phone">เบอร์โทรศัพท์</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={form.contact?.phone || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  contact: { ...(form.contact || {}), phone: e.target.value } 
                })}
                placeholder="เช่น 0812345678"
              />
              <p className="text-xs text-[color:var(--text)]/50">เบอร์โทรศัพท์สำหรับติดต่อ</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-facebook">Facebook URL</Label>
              <Input
                id="contact-facebook"
                type="url"
                value={form.contact?.facebook || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  contact: { ...(form.contact || {}), facebook: e.target.value } 
                })}
                placeholder="https://facebook.com/yourpage"
              />
              <p className="text-xs text-[color:var(--text)]/50">URL ของ Facebook Page</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.contact?.email || ''}
                onChange={(e) => setForm({ 
                  ...form, 
                  contact: { ...(form.contact || {}), email: e.target.value } 
                })}
                placeholder="admin@example.com"
              />
              <p className="text-xs text-[color:var(--text)]/50">อีเมลสำหรับติดต่อ</p>
            </div>
          </div>
          
          <Button disabled={saving} type="submit" className="w-full sm:w-auto">
            {saving ? (<><Spinner />กำลังบันทึก...</>) : 'บันทึกการตั้งค่า'}
          </Button>
        </form>
      </TabsContent>

      {/* ตั้งค่าเว็บไซต์ */}
      <TabsContent value="site-settings" className="space-y-4">
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">ตั้งค่าเว็บไซต์</h2>
            <p className="text-sm text-[color:var(--text)]/60">จัดการโหมดปรับปรุงเว็บไซต์และการสมัครสมาชิก</p>
          </div>

          {/* Maintenance Mode */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-mode" className="text-sm font-medium cursor-pointer">
                  โหมดปรับปรุงเว็บไซต์
                </Label>
                <p className="text-xs text-gray-400">
                  {form.maintenanceMode 
                    ? 'เว็บไซต์จะแสดงหน้าประกาศว่ากำลังปรับปรุง ผู้ใช้ทั่วไปไม่สามารถเข้าถึงได้ แต่แอดมินสามารถเข้าถึงได้' 
                    : 'เว็บไซต์ทำงานปกติ ผู้ใช้ทุกคนสามารถเข้าถึงได้'}
                </p>
                {form.maintenanceMode && (
                  <p className="text-xs text-amber-400 mt-1">
                    ⚠️ แอดมินสามารถเข้าถึงได้ผ่าน /backoffice
                  </p>
                )}
              </div>
              <Switch
                id="maintenance-mode"
                checked={form.maintenanceMode === true}
                onCheckedChange={(checked) => setForm({ ...form, maintenanceMode: checked })}
              />
            </div>
          </div>

          {/* Register Enabled */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800">
              <div className="space-y-0.5">
                <Label htmlFor="register-enabled" className="text-sm font-medium cursor-pointer">
                  เปิดใช้งานหน้าสมัครสมาชิก
                </Label>
                <p className="text-xs text-gray-400">
                  {form.registerEnabled 
                    ? 'ผู้ใช้สามารถสมัครสมาชิกใหม่ได้' 
                    : 'ปิดการสมัครสมาชิก ผู้ใช้ไม่สามารถสร้างบัญชีใหม่ได้'}
                </p>
              </div>
              <Switch
                id="register-enabled"
                checked={form.registerEnabled !== false}
                onCheckedChange={(checked) => setForm({ ...form, registerEnabled: checked })}
              />
            </div>
          </div>

          {/* Google reCaptcha */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div>
              <h3 className="text-base font-semibold mb-2">Google reCaptcha</h3>
              <p className="text-xs text-gray-400 mb-4">ตั้งค่า Google reCaptcha สำหรับหน้า login และ register</p>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800">
              <div className="space-y-0.5">
                <Label htmlFor="recaptcha-enabled" className="text-sm font-medium cursor-pointer">
                  เปิดใช้งาน reCaptcha
                </Label>
                <p className="text-xs text-gray-400">
                  {form.recaptchaEnabled 
                    ? 'เปิดใช้งาน reCaptcha ในหน้า login และ register' 
                    : 'ปิดการใช้งาน reCaptcha'}
                </p>
              </div>
              <Switch
                id="recaptcha-enabled"
                checked={form.recaptchaEnabled === true}
                onCheckedChange={(checked) => setForm({ ...form, recaptchaEnabled: checked })}
              />
            </div>

            {form.recaptchaEnabled && (
              <div className="space-y-4 p-4 rounded-lg border border-gray-800 bg-gray-900/30">
                <div className="grid gap-2">
                  <Label htmlFor="recaptcha-site-key" className="text-sm font-medium">
                    Site Key
                  </Label>
                  <Input
                    id="recaptcha-site-key"
                    value={form.recaptchaSiteKey || ''}
                    onChange={(e) => setForm({ ...form, recaptchaSiteKey: e.target.value })}
                    placeholder="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                  />
                  <p className="text-xs text-gray-400">reCaptcha Site Key (Public Key)</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="recaptcha-secret-key" className="text-sm font-medium">
                    Secret Key
                  </Label>
                  <Input
                    id="recaptcha-secret-key"
                    type="password"
                    value={form.recaptchaSecretKey || ''}
                    onChange={(e) => setForm({ ...form, recaptchaSecretKey: e.target.value })}
                    placeholder="6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"
                  />
                  <p className="text-xs text-gray-400">reCaptcha Secret Key (Private Key)</p>
                </div>
              </div>
            )}
          </div>

          <Button disabled={saving} type="submit" className="w-full sm:w-auto">
            {saving ? (<><Spinner />กำลังบันทึก...</>) : 'บันทึกการตั้งค่า'}
          </Button>
        </form>
      </TabsContent>

      {/* Policy Settings */}
      <TabsContent value="policy" className="space-y-4">
        <PolicyContent />
      </TabsContent>

      {/* Footer */}
      <TabsContent value="footer" className="space-y-4">
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">ตั้งค่า Footer</h2>
            <p className="text-sm text-[color:var(--text)]/60">จัดการข้อมูลที่จะแสดงใน Footer ของเว็บไซต์</p>
          </div>

          {/* Logo & Description */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div>
              <h3 className="text-md font-semibold mb-2">โลโก้และคำอธิบาย</h3>
            </div>
            <div>
              <Label htmlFor="footer-logo-url">URL โลโก้</Label>
              <Input
                id="footer-logo-url"
                className="mt-1"
                value={form.footer?.logoUrl || ''}
                onChange={(e) => setForm({ ...form, footer: { ...form.footer, logoUrl: e.target.value } })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">URL ของโลโก้ที่จะแสดงใน Footer</p>
            </div>
            <div>
              <Label htmlFor="footer-description">คำอธิบายเว็บ</Label>
              <Textarea
                id="footer-description"
                className="mt-1 h-24"
                value={form.footer?.description || ''}
                onChange={(e) => setForm({ ...form, footer: { ...form.footer, description: e.target.value } })}
                placeholder="เว็บเติมเกมอันดับ 1 ราคาถูกที่สุด เติมเร็ว ปลอดภัย บริการตลอด 24 ชั่วโมง"
                maxLength={200}
              />
              <p className="text-xs text-[color:var(--text)]/50 mt-1">คำอธิบายสั้นๆ เกี่ยวกับเว็บไซต์ ({form.footer?.description?.length || 0}/200)</p>
            </div>
            <div>
              <Label htmlFor="footer-opening-hours">เวลาเปิด-ปิดบริการ</Label>
              <Input
                id="footer-opening-hours"
                className="mt-1"
                value={form.footer?.openingHours || ''}
                onChange={(e) => setForm({ ...form, footer: { ...form.footer, openingHours: e.target.value } })}
                placeholder="เปิดบริการ 24 ชั่วโมง"
              />
            </div>
          </div>

          {/* Social Media */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div>
              <h3 className="text-md font-semibold mb-2">Social Media</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="footer-facebook-url">Facebook URL</Label>
                <Input
                  id="footer-facebook-url"
                  className="mt-1"
                  type="url"
                  value={form.footer?.facebookUrl || ''}
                  onChange={(e) => setForm({ ...form, footer: { ...form.footer, facebookUrl: e.target.value } })}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              <div>
                <Label htmlFor="footer-line-url">LINE URL</Label>
                <Input
                  id="footer-line-url"
                  className="mt-1"
                  type="url"
                  value={form.footer?.lineUrl || ''}
                  onChange={(e) => setForm({ ...form, footer: { ...form.footer, lineUrl: e.target.value } })}
                  placeholder="https://line.me/ti/p/~lineid"
                />
              </div>
              <div>
                <Label htmlFor="footer-instagram-url">Instagram URL</Label>
                <Input
                  id="footer-instagram-url"
                  className="mt-1"
                  type="url"
                  value={form.footer?.instagramUrl || ''}
                  onChange={(e) => setForm({ ...form, footer: { ...form.footer, instagramUrl: e.target.value } })}
                  placeholder="https://instagram.com/yourpage"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div>
              <h3 className="text-md font-semibold mb-2">ข้อมูลติดต่อ</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="footer-phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="footer-phone"
                  className="mt-1"
                  type="tel"
                  value={form.footer?.phone || ''}
                  onChange={(e) => setForm({ ...form, footer: { ...form.footer, phone: e.target.value } })}
                  placeholder="0812345678"
                />
              </div>
              <div>
                <Label htmlFor="footer-email">อีเมล</Label>
                <Input
                  id="footer-email"
                  className="mt-1"
                  type="email"
                  value={form.footer?.email || ''}
                  onChange={(e) => setForm({ ...form, footer: { ...form.footer, email: e.target.value } })}
                  placeholder="contact@WeXPlus.com"
                />
              </div>
              <div>
                <Label htmlFor="footer-working-hours">เวลาทำการ</Label>
                <Input
                  id="footer-working-hours"
                  className="mt-1"
                  value={form.footer?.workingHours || ''}
                  onChange={(e) => setForm({ ...form, footer: { ...form.footer, workingHours: e.target.value } })}
                  placeholder="ติดต่อได้ 24 ชม."
                />
              </div>
              <div>
                <Label htmlFor="footer-copyright">Copyright</Label>
                <Input
                  id="footer-copyright"
                  className="mt-1"
                  value={form.footer?.copyright || ''}
                  onChange={(e) => setForm({ ...form, footer: { ...form.footer, copyright: e.target.value } })}
                  placeholder={`© ${new Date().getFullYear()} สิทธิ์ทั้งหมด`}
                />
              </div>
            </div>
          </div>

          <Button disabled={saving} type="submit" className="w-full sm:w-auto">
            {saving ? (<><Spinner />กำลังบันทึก...</>) : 'บันทึกการตั้งค่า Footer'}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
    </>
  );
}

function AdminPopupForm() {
  const [popupImage, setPopupImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'ok' | 'error' | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchPopup();
  }, []);

  const fetchPopup = async () => {
    try {
      const res = await fetch('/api/admin/popup', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setPopupImage(json.image_url || '');
    } catch (err) {
      console.error('Popup fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!popupImage.trim()) {
      setStatus('error');
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'กรุณากรอก URL รูปภาพ',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/popup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: popupImage.trim() }),
      });
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ');
      setStatus('ok');
      toast.show({
        title: 'บันทึกสำเร็จ',
        description: 'บันทึกรูป popup เรียบร้อยแล้ว',
        variant: 'default'
      });
      await fetchPopup();
    } catch (err) {
      setStatus('error');
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'บันทึกไม่สำเร็จ โปรดลองใหม่',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Popup แจ้งเตือน</h2>
        <p className="text-sm text-[color:var(--text)]/60">ตั้งค่ารูปภาพ Popup ที่แสดงเมื่อผู้ใช้เข้าเว็บ</p>
      </div>
      {status === 'ok' && (
        <Alert>
          <AlertTitle>บันทึกสำเร็จ</AlertTitle>
          <AlertDescription>บันทึกรูป popup เรียบร้อยแล้ว</AlertDescription>
        </Alert>
      )}
      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
          <AlertDescription>บันทึกไม่สำเร็จ โปรดลองใหม่</AlertDescription>
        </Alert>
      )}
      <div>
        <Label>URL รูปภาพ Popup</Label>
        <Input
          className="mt-1"
          value={popupImage}
          onChange={(e) => setPopupImage(e.target.value)}
          placeholder="https://example.com/popup-image.jpg"
        />
        <p className="text-xs text-[color:var(--text)]/50 mt-1">ใส่ URL รูปภาพสี่เหลี่ยมที่จะแสดงใน popup เมื่อเข้าเว็บ</p>
        {popupImage && (
          <div className="mt-3 rounded-lg border border-white/10 overflow-hidden bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={popupImage} alt="Preview" className="w-full h-auto max-h-64 object-contain" />
          </div>
        )}
      </div>
      <Button disabled={saving} type="submit" className="w-full sm:w-auto">
        {saving ? (<><Spinner />กำลังบันทึก...</>) : 'บันทึกรูป Popup'}
      </Button>
      <p className="text-xs text-[color:var(--text)]/50">หมายเหตุ: เมื่อบันทึกรูปใหม่ popup จะเด้งทันทีแม้ว่าผู้ใช้จะกด "ไม่แสดงอีกใน 3 วัน" ไปแล้ว</p>
    </form>
  );
}


