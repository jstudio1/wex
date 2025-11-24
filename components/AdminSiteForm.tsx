'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner, SpinnerCustom } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import * as React from 'react';
import { type DateRange } from 'react-day-picker';
import { ArrowUp, ArrowDown, GripVertical, Home, Menu, CreditCard, Bell, Webhook, Gamepad2, Wallet, Smartphone, Share2, User, Trophy, Coins, Plus, Trash2, Settings, Wrench, FileText, Shield, KeyRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PolicyContent from '@/components/backoffice/PolicyContent';
import { normalizePremiumAppDisplayMode } from '@/lib/premium-app';
import { NAVBAR_ORDER_WITH_HOME, NAVBAR_STORAGE_KEYS, normalizeNavbarOrder, extractStorageNavbarOrder } from '@/lib/navbar';

type AdminSiteTab =
  | 'homepage'
  | 'navigation'
  | 'payment'
  | 'notifications'
  | 'integrations'
  | 'contact'
  | 'site-settings'
  | 'policy'
  | 'footer';

type AdminSiteFormProps = {
  initialTab?: AdminSiteTab;
};

type SiteData = { 
  posters: string[]; 
  gameAccountsBannerUrl?: string;
  premiumAppDisplayMode?: 'list' | 'cards';
  navbarMenus?: {
    home: boolean;
    products: boolean;
    mtopup: boolean;
    social: boolean;
    categories: boolean;
    games: boolean;
    premiumApp: boolean;
    cashcard: boolean;
    contact: boolean;
    blog: boolean;
  };
  navbarMenuOrder?: string[];
  navbarMenuLabels?: {
    products?: string;
    premiumApp?: string;
    social?: string;
    contact?: string;
    blog?: string;
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
type QrConfigState = {
  username: string;
  password: string;
  conId: string;
  promptpayId: string;
  promptpayType: '01' | '02';
  webhookKey: string;
  webhookUrl: string;
};

export default function AdminSiteForm({ initialTab = 'homepage' }: AdminSiteFormProps = {}) {
  const [form, setForm] = useState<SiteData>({ 
    posters: [], 
    gameAccountsBannerUrl: '',
    premiumAppDisplayMode: 'list',
    navbarMenus: {
      home: true,
      products: true,
      mtopup: true,
      social: true,
      categories: true,
      games: true,
      premiumApp: true,
      cashcard: true,
      contact: true,
      blog: true,
    },
    navbarMenuOrder: ['premiumApp', 'social', 'products', 'mtopup', 'cashcard', 'categories', 'blog', 'contact'],
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
  const [activeTab, setActiveTab] = useState<AdminSiteTab>(initialTab);
  const [qrConfig, setQrConfig] = useState<QrConfigState>({
    username: '',
    password: '',
    conId: '',
    promptpayId: '',
    promptpayType: '02',
    webhookKey: '',
    webhookUrl: '',
  });
  const [qrLoading, setQrLoading] = useState(true);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrStatus, setQrStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const resolvedWebhookUrl = React.useMemo(() => {
    const trimmed = qrConfig.webhookUrl?.trim();
    if (trimmed) return trimmed;
    if (typeof window !== 'undefined') {
      return `${window.location.origin.replace(/\/$/, '')}/api/payments/webhook`;
    }
    return 'https://wexplus.com/api/payments/webhook';
  }, [qrConfig.webhookUrl]);
  const toast = useToast();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/site', { cache: 'no-store' });
        const json = await res.json();
        const defaultNavbarMenus = {
          home: true,
          products: true,
          mtopup: true,
          social: true,
          categories: true,
          games: true,
          premiumApp: true,
          cashcard: true,
          contact: true,
          blog: true,
        };
        setForm({ 
          posters: json.posters || [], 
          gameAccountsBannerUrl: json.gameAccountsBannerUrl || '',
          premiumAppDisplayMode: normalizePremiumAppDisplayMode(json.premiumAppDisplayMode),
          navbarMenus: {
            ...defaultNavbarMenus,
            ...(json.navbarMenus || {})
          },
          navbarMenuOrder: json.navbarMenuOrder || ['premiumApp', 'social', 'products', 'mtopup', 'cashcard', 'categories', 'blog', 'contact'],
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
    let mounted = true;
    (async () => {
      try {
        setQrLoading(true);
        const res = await fetch('/api/admin/payments/qr-config', { cache: 'no-store' });
        if (!res.ok) throw new Error('load failed');
        const json = await res.json();
        if (!mounted) return;
        setQrConfig({
          username: json.username || '',
          password: json.password || '',
          conId: json.conId || '',
          promptpayId: json.promptpayId || '',
          promptpayType: json.promptpayType === '01' ? '01' : '02',
          webhookKey: json.webhookKey || '',
          webhookUrl: json.webhookUrl || '',
        });
        setQrStatus('idle');
      } catch (error) {
        console.error('QR config load error:', error);
        if (mounted) setQrStatus('error');
      } finally {
        if (mounted) setQrLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
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
          gameAccountsBannerUrl: form.gameAccountsBannerUrl || '',
          // ไม่ต้องเก็บ 'home' ใน order เพราะหน้าเว็บจะใส่ 'home' ไว้แรกเสมอ
          navbarMenuOrder: extractStorageNavbarOrder(form.navbarMenuOrder),
          navbarMenuLabels: form.navbarMenuLabels,
          premiumAppDisplayMode: normalizePremiumAppDisplayMode(form.premiumAppDisplayMode),
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

  const onQrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQrSaving(true);
    setQrStatus('idle');
    try {
      const payload = {
        ...qrConfig,
        promptpayType: qrConfig.promptpayType === '01' ? '01' : '02',
      webhookUrl: qrConfig.webhookUrl?.trim(),
      };
      const res = await fetch('/api/admin/payments/qr-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save failed');
      setQrStatus('ok');
      toast.show({
        title: 'บันทึกสำเร็จ',
        description: 'อัปเดตการตั้งค่า QR PromptPay เรียบร้อย',
        variant: 'default',
      });
    } catch (error) {
      console.error('QR config save error:', error);
      setQrStatus('error');
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'บันทึกไม่สำเร็จ โปรดลองใหม่',
        variant: 'destructive',
      });
    } finally {
      setQrSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    const text = resolvedWebhookUrl;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          toast.show({
            title: 'คัดลอกสำเร็จ',
            description: text,
            variant: 'default',
          });
        })
        .catch(() => {
          toast.show({
            title: 'คัดลอกไม่สำเร็จ',
            description: 'กรุณาคัดลอกด้วยตนเอง',
            variant: 'destructive',
          });
        });
    } else {
      toast.show({
        title: 'ไม่รองรับการคัดลอกอัตโนมัติ',
        description: text,
        variant: 'destructive',
      });
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

    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminSiteTab)} className="w-full">
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
            <Label htmlFor="game-accounts-banner">รูปภาพ Banner สำหรับ Section ไอดีเกมส์ (1920x400 px)</Label>
            <Input 
              id="game-accounts-banner"
              className="mt-1" 
              value={form.gameAccountsBannerUrl || ''} 
              onChange={(e) => setForm({ ...form, gameAccountsBannerUrl: e.target.value })} 
              placeholder="https://example.com/banner.jpg"
            />
            <p className="text-xs text-[color:var(--text)]/50 mt-1">ขนาดที่แนะนำ: 1920x400 px (กว้าง x สูง) - สำหรับแสดงบนหน้าแรก Section ไอดีเกมส์</p>
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
          <div className="space-y-2">
            <Label className="text-sm font-semibold">เรียงลำดับเมนู</Label>
            <p className="text-xs text-[color:var(--text)]/50 mb-2">ลากไอคอน <GripVertical className="inline size-3" /> เพื่อจัดลำดับการแสดงผล</p>
        
        {(() => {
          const menuInfo: Record<string, { label: string; key: string }> = {
            home: { label: 'หน้าหลัก', key: 'home' },
            premiumApp: { label: 'แอพพรีเมี่ยม', key: 'premiumApp' },
            social: { label: 'ปั้มโซเชียล', key: 'social' },
            products: { label: 'เติมเกม', key: 'products' },
            mtopup: { label: 'เติมเงินมือถือ', key: 'mtopup' },
            cashcard: { label: 'บัตรเติมเงิน', key: 'cashcard' },
            categories: { label: 'สินค้าอื่นๆ', key: 'categories' },
            blog: { label: 'How To', key: 'blog' },
            contact: { label: 'ติดต่อเรา', key: 'contact' },
            games: { label: 'สุ่มรางวัล', key: 'games' }
          };
          
          const handleDragEnd = (e: React.DragEvent) => {
            setDraggedIndex(null);
            setDragOverIndex(null);
            if (e.currentTarget instanceof HTMLElement) {
              e.currentTarget.style.opacity = '1';
            }
          };
          
          const handleDragLeave = () => {
            setDragOverIndex(null);
          };
          
          const allMenuKeys = Object.keys(menuInfo);
          const orderedKeys = normalizeNavbarOrder(form.navbarMenuOrder);
          const baseOrder = orderedKeys.filter((key) => key !== 'home' && NAVBAR_STORAGE_KEYS.includes(key as any));
          const otherMenus = allMenuKeys.filter((key) => !(NAVBAR_ORDER_WITH_HOME as readonly string[]).includes(key as any));
          const allMenus = [...orderedKeys, ...otherMenus];
          
          const handleDragStartForAll = (e: React.DragEvent, menuKey: string, index: number) => {
            setDraggedIndex(index);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', menuKey);
            if (e.currentTarget instanceof HTMLElement) {
              e.currentTarget.style.opacity = '0.5';
            }
          };
          
          const handleDragOverForAll = (e: React.DragEvent, index: number) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedIndex !== null && draggedIndex !== index) {
              setDragOverIndex(index);
            }
          };
          
          const handleDropForAll = (e: React.DragEvent, dropMenuKey: string, dropIndex: number) => {
            e.preventDefault();
            if (draggedIndex === null) return;
            
            const draggedMenuKey = allMenus[draggedIndex];
            if (!draggedMenuKey) return;
            
            const draggedIndexInBase = baseOrder.indexOf(draggedMenuKey as any);
            const dropIndexInBase = baseOrder.indexOf(dropMenuKey as any);
            
            let newOrder: string[] = [];
            
            if (draggedIndexInBase !== -1 && dropIndexInBase !== -1) {
              newOrder = [...baseOrder];
              newOrder.splice(draggedIndexInBase, 1);
              const newDropIndex = newOrder.indexOf(dropMenuKey as any);
              newOrder.splice(newDropIndex, 0, draggedMenuKey as any);
            } else if (draggedIndexInBase === -1 && dropIndexInBase !== -1) {
              newOrder = [...baseOrder];
              newOrder.splice(dropIndexInBase, 0, draggedMenuKey as any);
            } else if (draggedIndexInBase !== -1 && dropIndexInBase === -1) {
              newOrder = [...baseOrder];
              newOrder.splice(draggedIndexInBase + 1, 0, dropMenuKey as any);
            } else {
              newOrder = [...baseOrder, draggedMenuKey as any, dropMenuKey as any];
            }
            
            setForm({ ...form, navbarMenuOrder: extractStorageNavbarOrder(newOrder) });
            setDraggedIndex(null);
            setDragOverIndex(null);
          };
          
          return allMenus.map((menuKey, index) => {
            const menu = menuInfo[menuKey];
            if (!menu) return null;
            
            // Use custom label if available, otherwise use default
            const customLabel = form.navbarMenuLabels?.[menu.key as keyof typeof form.navbarMenuLabels];
            const displayLabel = customLabel || menu.label;
            
            const isEnabled = form.navbarMenus?.[menu.key as keyof typeof form.navbarMenus] !== false;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            // ใช้ orderedKeys แทน currentOrder เพื่อให้ตรงกับหน้าเว็บ
            const isInOrder = orderedKeys.includes(menuKey as any);
            const orderIndex = isInOrder ? orderedKeys.indexOf(menuKey as any) : -1;
            
            return (
              <div
                key={menuKey}
                draggable={true}
                onDragStart={(e) => handleDragStartForAll(e, menuKey, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOverForAll(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropForAll(e, menuKey, index)}
                className={`flex items-center gap-2 p-2.5 border rounded-md transition-all duration-200 cursor-move ${
                  isDragging 
                    ? 'opacity-50 border-accent/50 bg-accent/10 scale-95' 
                    : isDragOver
                    ? 'border-accent/70 bg-accent/10 scale-[1.02] shadow-lg shadow-accent/20'
                    : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                }`}
              >
                <div 
                  className="flex items-center gap-1.5 flex-shrink-0 cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className={`size-4 text-[color:var(--text)]/60 ${isDragging ? 'text-accent' : ''} transition-colors`} />
        </div>
                
                <div className="flex-1 min-w-0 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`menu-label-${menuKey}`} className="text-[10px] text-[color:var(--text)]/60 mb-0.5 block">ชื่อเมนู</Label>
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
                        className="w-full h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[color:var(--text)]/50 truncate">
                      {isEnabled ? 'แสดงใน NavBar' : 'ซ่อนใน NavBar'}
                        {isInOrder && menuKey !== 'home' && ` • ลำดับที่ ${orderIndex}`}
                        {menuKey === 'home' && isInOrder && ' • อยู่แรกเสมอ'}
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
                        // Auto-add to order when enabled
                        if (checked) {
                          setForm(prev => ({
                            ...prev,
                            navbarMenuOrder: extractStorageNavbarOrder([...(prev.navbarMenuOrder || []), menuKey])
                          }));
                        }
                    }}
                      className="scale-75"
          />
                  </div>
                  {/* แสดง Sub Menu สำหรับ Contact */}
                  {menuKey === 'contact' && isEnabled && (
                    <div className="mt-2 ml-8 space-y-1.5 border-l-2 border-emerald-500/30 pl-3 bg-black/20 rounded-r-md p-2">
                      <div className="text-[10px] font-medium text-emerald-400 mb-1.5">Sub Menu Items:</div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-[color:var(--text)]/70 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                          <span>ติดต่อเรา</span>
                          <span className="text-[color:var(--text)]/40">(/contact)</span>
                        </div>
                        <div className="text-[10px] text-[color:var(--text)]/70 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                          <span>Ticket Support</span>
                          <span className="text-[color:var(--text)]/40">(/account/tickets)</span>
                        </div>
                        <div className="text-[10px] text-[color:var(--text)]/70 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                          <span>ข้อกำหนดการใช้งาน</span>
                          <span className="text-[color:var(--text)]/40">(/terms)</span>
                        </div>
                        <div className="text-[10px] text-[color:var(--text)]/70 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                          <span>นโยบายความเป็นส่วนตัว</span>
                          <span className="text-[color:var(--text)]/40">(/privacy)</span>
                        </div>
                      </div>
                    </div>
                  )}
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
            <Label>ช่องทาง &quot;ใช้โค้ด&quot;</Label>
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
            <Label>ช่องทาง &quot;QR Payment&quot;</Label>
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
            <Label>ช่องทาง &quot;สลิปโอนเงิน&quot;</Label>
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
            <Label>ช่องทาง &quot;ซองอั่งเปา TrueWallet&quot;</Label>
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
                💡 <strong>หมายเหตุ:</strong> เลขที่บัญชีที่ตั้งค่าไว้จะถูกใช้เป็น &quot;บัญชีผู้รับที่คาดหวัง&quot; สำหรับตรวจสอบสลิปโอนเงินอัตโนมัติ
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

      <form onSubmit={onQrSubmit} className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-emerald-900/40 border border-emerald-600">
            <Shield className="size-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1">ตั้งค่า QR PromptPay API</h2>
            <p className="text-sm text-[color:var(--text)]/60">
              จัดการ Credential สำหรับสร้าง QR Payment และรับ webhook จาก TMweasy/TMwallet
            </p>
          </div>
        </div>

        {qrStatus === 'ok' && (
          <Alert>
            <AlertTitle>บันทึกสำเร็จ</AlertTitle>
            <AlertDescription>อัปเดตการตั้งค่า QR PromptPay เรียบร้อย</AlertDescription>
          </Alert>
        )}
        {qrStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
            <AlertDescription>โหลดหรือบันทึกการตั้งค่าไม่สำเร็จ โปรดลองใหม่</AlertDescription>
          </Alert>
        )}

        {qrLoading ? (
          <div className="flex items-center gap-2 text-sm text-[color:var(--text)]/60">
            <Spinner className="size-4" />
            กำลังโหลดการตั้งค่า...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={qrConfig.username}
                  onChange={(e) => setQrConfig({ ...qrConfig, username: e.target.value })}
                  placeholder="username จาก TMwallet"
                />
              </div>
              <div className="space-y-2">
                <Label>รหัสผ่าน</Label>
                <Input
                  type="password"
                  value={qrConfig.password}
                  onChange={(e) => setQrConfig({ ...qrConfig, password: e.target.value })}
                  placeholder="password API"
                />
              </div>
              <div className="space-y-2">
                <Label>CON ID</Label>
                <Input
                  value={qrConfig.conId}
                  onChange={(e) => setQrConfig({ ...qrConfig, conId: e.target.value })}
                  placeholder="เช่น 106233"
                />
              </div>
              <div className="space-y-2">
                <Label>PromptPay ID</Label>
                <Input
                  value={qrConfig.promptpayId}
                  onChange={(e) => setQrConfig({ ...qrConfig, promptpayId: e.target.value })}
                  placeholder="เลข PromptPay 10 หรือ 13 หลัก"
                />
              </div>
              <div className="space-y-2">
                <Label>PromptPay Type</Label>
                <select
                  className="input w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm"
                  value={qrConfig.promptpayType}
                  onChange={(e) =>
                    setQrConfig({
                      ...qrConfig,
                      promptpayType: e.target.value === '01' ? '01' : '02',
                    })
                  }
                >
                  <option value="01">01 - เบอร์โทรศัพท์</option>
                  <option value="02">02 - เลขบัตรประชาชน</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret (API Key)</Label>
                <Input
                  type="password"
                  value={qrConfig.webhookKey}
                  onChange={(e) => setQrConfig({ ...qrConfig, webhookKey: e.target.value })}
                  placeholder="API Key สำหรับตรวจสอบ webhook"
                />
                <p className="text-[11px] text-[color:var(--text)]/60">
                  ต้องตรงกับค่าใน TMweasy เพื่อยืนยัน webhook
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Webhook URL (ใช้คัดลอกไปใส่ใน TMweasy)</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={qrConfig.webhookUrl || ''}
                    onChange={(e) => setQrConfig({ ...qrConfig, webhookUrl: e.target.value })}
                    placeholder="https://example.com/api/payments/webhook"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" className="shrink-0" onClick={handleCopyWebhook}>
                    คัดลอกลิงก์
                  </Button>
                </div>
                <p className="text-[11px] text-[color:var(--text)]/60">
                  ถ้าเว้นว่าง ระบบจะแนะนำลิงก์จากโดเมนปัจจุบัน เช่น {resolvedWebhookUrl}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-3 text-xs text-amber-200">
              ตั้งค่า Webhook URL ใน TMweasy ให้ชี้ไปที่ <code className="text-amber-100">{resolvedWebhookUrl}</code>
            </div>
            <Button disabled={qrSaving} type="submit" className="w-full sm:w-auto">
              {qrSaving ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 size-4" />
                  บันทึกการตั้งค่า QR PromptPay
                </>
              )}
            </Button>
          </>
        )}
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

          {/* Premium App Display Mode */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div>
              <h3 className="text-base font-semibold mb-2">รูปแบบหน้าแอพพรีเมี่ยม</h3>
              <p className="text-xs text-gray-400">
                สลับการแสดงหน้า <code className="text-emerald-300">/premium-app</code> ระหว่างโหมดดั้งเดิม (การ์ดละแพ็กเกจ) และโหมดรวม (คลิกการ์ดหลักแล้วเลือกแพ็กเกจใน modal)
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, premiumAppDisplayMode: 'list' }))}
                className={`rounded-xl border p-4 text-left transition ${
                  (form.premiumAppDisplayMode || 'list') === 'list'
                    ? 'border-emerald-500/70 bg-emerald-950/20 shadow-lg shadow-emerald-500/20'
                    : 'border-white/10 bg-black/30 hover:border-emerald-500/40'
                }`}
              >
                <p className="text-sm font-semibold text-white">โหมดการ์ดแยกแพ็กเกจ</p>
                <p className="mt-1 text-xs text-gray-400">
                  แสดงแพ็กเกจทั้งหมดแบบการ์ดเหมือนปัจจุบัน (มีตัวกรองหมวด/หมวดย่อย)
                </p>
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, premiumAppDisplayMode: 'cards' }))}
                className={`rounded-xl border p-4 text-left transition ${
                  form.premiumAppDisplayMode === 'cards'
                    ? 'border-emerald-500/70 bg-emerald-950/20 shadow-lg shadow-emerald-500/20'
                    : 'border-white/10 bg-black/30 hover:border-emerald-500/40'
                }`}
              >
                <p className="text-sm font-semibold text-white">โหมดรวมเป็นการ์ดหมวดหลัก</p>
                <p className="mt-1 text-xs text-gray-400">
                  แสดงการ์ดต่อ 1 บริการหลัก (เช่น YouTube, Disney+) คลิกแล้วเปิด modal ให้เลือกแพ็กเกจย่อย ลดความยาวหน้า
                </p>
              </button>
            </div>
            <p className="text-xs text-gray-500">
              การสลับโหมดมีผลทันที ลูกค้าทุกคนเห็นเหมือนกัน
            </p>
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
      <p className="text-xs text-[color:var(--text)]/50">หมายเหตุ: เมื่อบันทึกรูปใหม่ popup จะเด้งทันทีแม้ว่าผู้ใช้จะกด &quot;ไม่แสดงอีกใน 3 วัน&quot; ไปแล้ว</p>
    </form>
  );
}


