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
import { ArrowUp, ArrowDown, GripVertical, Home, Menu, CreditCard, Bell, Webhook, Gamepad2, Wallet, Smartphone, Share2, User, Trophy, Coins } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
  };
  navbarMenuOrder?: string[];
  paymentMethods?: {
    code: boolean;
    qr: boolean;
    bank: boolean;
  };
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
    },
    navbarMenuOrder: ['products', 'social', 'categories', 'games', 'premiumApp', 'cashcard'],
    paymentMethods: {
      code: true,
      qr: true,
      bank: true,
    },
    discordWebhookUrl: '',
    discordWebhooks: {
      products: '',
      cashcard: '',
      premiumApp: '',
      social: '',
      gameAccounts: '',
      games: '',
      wallet: ''
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
          navbarMenuOrder: json.navbarMenuOrder || ['products', 'social', 'categories', 'games', 'premiumApp', 'cashcard'],
          paymentMethods: json.paymentMethods || {
            code: true,
            qr: true,
            bank: true,
          },
          discordWebhookUrl: json.discordWebhookUrl || '',
          discordWebhooks: json.discordWebhooks || {
            products: '',
            cashcard: '',
            premiumApp: '',
            social: '',
            gameAccounts: '',
            games: '',
            wallet: ''
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const sanitizedPosters = postersText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          posters: sanitizedPosters,
          navbarMenuOrder: form.navbarMenuOrder
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
      <TabsList className="w-full mb-6 grid grid-cols-2 sm:grid-cols-5 gap-2 h-auto">
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
      </TabsList>

      {/* หน้าแรก */}
      <TabsContent value="homepage" className="space-y-4">
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">การตั้งค่าหน้าแรก</h2>
            <p className="text-sm text-[color:var(--text)]/60">ปรับแต่งหัวข้อ, คำอธิบาย, และรูปภาพ</p>
          </div>
          <div>
            <Label>หัวเรื่องหน้าแรก</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>คำอธิบาย</Label>
            <Input className="mt-1" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
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
            social: { label: 'ปั้มโซเชียล', key: 'social' },
            categories: { label: 'สินค้าอื่นๆ', key: 'categories' },
            games: { label: 'สุ่มรางวัล', key: 'games' },
            premiumApp: { label: 'แอพพรีเมี่ยม', key: 'premiumApp' },
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
          
          return (form.navbarMenuOrder || []).map((menuKey, index) => {
            const menu = menuInfo[menuKey];
            if (!menu) return null;
            
            const isEnabled = form.navbarMenus?.[menu.key as keyof typeof form.navbarMenus] !== false;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            
            return (
              <div
                key={menuKey}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-all duration-200 cursor-move ${
                  isDragging 
                    ? 'opacity-50 border-accent/50 bg-accent/10 scale-95' 
                    : isDragOver
                    ? 'border-accent/70 bg-accent/10 scale-[1.02] shadow-lg shadow-accent/20'
                    : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                }`}
              >
                <div 
                  className="flex items-center gap-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className={`size-5 text-[color:var(--text)]/60 ${isDragging ? 'text-accent' : ''} transition-colors`} />
        </div>
                
                <div className="flex-1 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div>
                    <Label className="font-medium">เมนู "{menu.label}"</Label>
                    <p className="text-xs text-[color:var(--text)]/50 mt-0.5">
                      {isEnabled ? 'แสดงใน NavBar' : 'ซ่อนใน NavBar'}
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
                bank: form.paymentMethods?.bank ?? true,
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
                bank: form.paymentMethods?.bank ?? true,
              }
            })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>ช่องทาง "โอนเงิน"</Label>
            <p className="text-xs text-[color:var(--text)]/50 mt-1">เปิด/ปิดช่องทางเติมพอยต์ด้วยการโอนเงินผ่านธนาคาร</p>
          </div>
          <Switch
            checked={form.paymentMethods?.bank !== false}
            onCheckedChange={(checked) => setForm({
              ...form,
              paymentMethods: {
                code: form.paymentMethods?.code ?? true,
                qr: form.paymentMethods?.qr ?? true,
                bank: checked,
              }
            })}
          />
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


