/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { getTicketStatusBadgeClasses, getTicketStatusLabel, ADMIN_TICKET_STATUS_OPTIONS } from '@/lib/tickets';
import type { TicketCategory, TicketMessage, TicketSummary, TicketSettings } from '@/types/tickets';
import { Paperclip, Send, Plus, MessageSquare, ShieldCheck, Loader2, Trash2, Image as ImageIcon, FileText } from 'lucide-react';
import ImageViewer from '@/components/tickets/ImageViewer';

type AdminTicket = TicketSummary & {
  user?: { id: number; username: string; avatar_url?: string | null };
};

const STATUS_FILTERS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'open', label: 'เปิด' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'waiting_customer', label: 'รอลูกค้า' },
  { value: 'closed', label: 'ปิด' },
] as const;

export default function TicketsContent() {
  const toast = useToast();
  const [tab, setTab] = useState<'list' | 'settings'>('list');
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [messages, setMessages] = useState<Record<number, TicketMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<Record<number, boolean>>({});
  const [compose, setCompose] = useState<Record<number, { message: string; files: File[]; sending: boolean }>>({});

  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [settings, setSettings] = useState<TicketSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [addingCategory, setAddingCategory] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<Array<{ id: number; url: string; file_name: string }>>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId],
  );

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/tickets?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('โหลด Ticket ไม่สำเร็จ');
      const data = await res.json();
      setTickets(data.tickets || []);
      setStats(data.stats || {});
      if (!selectedTicketId && data.tickets?.[0]?.id) {
        setSelectedTicketId(data.tickets[0].id);
      }
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/ticket-categories', { cache: 'no-store' });
      if (!res.ok) throw new Error('โหลดหมวดหมู่ไม่สำเร็จ');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      toast.show({ title: 'โหลดหมวดหมู่ไม่สำเร็จ', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/ticket-settings', { cache: 'no-store' });
      if (!res.ok) throw new Error('โหลดการตั้งค่าไม่สำเร็จ');
      const data = await res.json();
      setSettings(data.settings || null);
    } catch (err) {
      toast.show({ title: 'โหลดการตั้งค่าไม่สำเร็จ', description: (err as Error).message, variant: 'destructive' });
    }
  };

useEffect(() => {
  const handle = setTimeout(() => {
    fetchTickets();
  }, 400);
  return () => clearTimeout(handle);
}, [statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchCategories();
    fetchSettings();
  }, []);

  const fetchMessages = async (ticketId: number, force = false) => {
    if (!force && messages[ticketId]?.length) return;
    setLoadingMessages((prev) => ({ ...prev, [ticketId]: true }));
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, { cache: 'no-store' });
      if (!res.ok) throw new Error('โหลดข้อความไม่สำเร็จ');
      const data = await res.json();
      setMessages((prev) => ({ ...prev, [ticketId]: data.messages || [] }));
    } catch (err) {
      toast.show({ title: 'โหลดข้อความไม่สำเร็จ', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoadingMessages((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  useEffect(() => {
    if (selectedTicketId) {
      fetchMessages(selectedTicketId);
    }
  }, [selectedTicketId]);

  const sendAdminMessage = async (ticketId: number) => {
    const state = compose[ticketId];
    if (!state?.message.trim() && !(state?.files?.length)) {
      toast.show({ title: 'กรุณากรอกข้อความหรือแนบไฟล์', variant: 'destructive' });
      return;
    }
    setCompose((prev) => ({ ...prev, [ticketId]: { ...(prev[ticketId] || { files: [] }), sending: true } }));
    try {
      const formData = new FormData();
      formData.append('message', state?.message || '');
      state?.files?.forEach((file) => formData.append('files', file));
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'ส่งข้อความไม่สำเร็จ');
      }
      await fetchMessages(ticketId, true);
      setCompose((prev) => ({ ...prev, [ticketId]: { message: '', files: [], sending: false } }));
      fetchTickets();
    } catch (err) {
      toast.show({ title: 'ส่งข้อความไม่สำเร็จ', description: (err as Error).message, variant: 'destructive' });
      setCompose((prev) => ({ ...prev, [ticketId]: { ...(prev[ticketId] || { files: [] }), sending: false } }));
    }
  };

  const updateTicketStatus = async (ticketId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('อัปเดตสถานะไม่สำเร็จ');
      toast.show({ title: 'อัปเดตสถานะแล้ว' });
      fetchTickets();
      fetchMessages(ticketId, true);
    } catch (err) {
      toast.show({ title: 'อัปเดตสถานะไม่สำเร็จ', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    try {
      setSavingSettings(true);
      const res = await fetch('/api/admin/ticket-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_enabled: settings.is_enabled,
          max_open_per_user: settings.max_open_per_user,
        }),
      });
      if (!res.ok) throw new Error('บันทึกการตั้งค่าไม่สำเร็จ');
      toast.show({ title: 'บันทึกการตั้งค่าสำเร็จ' });
    } catch (err) {
      toast.show({ title: 'บันทึกการตั้งค่าไม่สำเร็จ', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const addCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.show({ title: 'กรุณากรอกชื่อหมวดหมู่', variant: 'destructive' });
      return;
    }
    try {
      setAddingCategory(true);
      const res = await fetch('/api/admin/ticket-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('เพิ่มหมวดหมู่ไม่สำเร็จ');
      setCategoryForm({ name: '', description: '' });
      fetchCategories();
      toast.show({ title: 'เพิ่มหมวดหมู่แล้ว' });
    } catch (err) {
      toast.show({ title: 'เพิ่มหมวดหมู่ไม่สำเร็จ', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setAddingCategory(false);
    }
  };

  const toggleCategory = async (category: TicketCategory) => {
    try {
      const res = await fetch(`/api/admin/ticket-categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !category.is_active }),
      });
      if (!res.ok) throw new Error('อัปเดตหมวดหมู่ไม่สำเร็จ');
      fetchCategories();
    } catch (err) {
      toast.show({ title: 'อัปเดตหมวดหมู่ไม่สำเร็จ', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const deleteCategory = async (categoryId: number) => {
    try {
      const res = await fetch(`/api/admin/ticket-categories/${categoryId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('ลบหมวดหมู่ไม่สำเร็จ');
      fetchCategories();
      toast.show({ title: 'ลบหมวดหมู่แล้ว' });
    } catch (err) {
      toast.show({ title: 'ลบหมวดหมู่ไม่สำเร็จ', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const renderTicketList = () => {
    if (loadingTickets) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-20 w-full rounded-md bg-white/5" />
          ))}
        </div>
      );
    }
    if (!tickets.length) {
      return (
        <div className="rounded-md border border-dashed border-white/10 bg-white/5 p-8 text-center text-white/50">
          ยังไม่มี Ticket
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            onClick={() => setSelectedTicketId(ticket.id)}
            className={cn(
              'w-full rounded-md border px-4 py-4 text-left transition-all',
              selectedTicketId === ticket.id
                ? 'border-emerald-500/50 bg-emerald-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/30',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{ticket.title}</p>
                <p className="text-xs text-white/60">
                  #{ticket.id} • {ticket.user?.username || 'ลูกค้า'}
                </p>
              </div>
              <Badge className={cn('text-xs', getTicketStatusBadgeClasses(ticket.status))}>
                {getTicketStatusLabel(ticket.status)}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-white/50 line-clamp-2">{ticket.last_message_preview || 'ยังไม่มีข้อความ'}</p>
          </button>
        ))}
      </div>
    );
  };

  const renderMessages = () => {
    if (!selectedTicketId) {
      return (
        <div className="flex h-full flex-col items-center justify-center rounded-md border border-white/10 bg-white/5 p-8 text-center text-white/60">
          <MessageSquare className="mb-4 size-8 text-white/40" />
          เลือก Ticket ทางซ้ายเพื่อดูรายละเอียด
        </div>
      );
    }
    if (loadingMessages[selectedTicketId]) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-16 w-full rounded-md bg-white/5" />
          ))}
        </div>
      );
    }
    const list = messages[selectedTicketId] || [];
    if (!list.length) {
      return (
        <div className="rounded-md border border-dashed border-white/10 bg-white/5 p-6 text-center text-white/50">
          ยังไม่มีข้อความ
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {list.map((message) => {
          const isAdmin = message.sender_role === 'admin';
          return (
            <div
              key={message.id}
              className={cn('flex w-full', isAdmin ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'flex max-w-[75%] flex-col gap-2 rounded-md border px-3 py-2',
                  isAdmin
                    ? 'rounded-tr-none border-sky-500/40 bg-sky-500/10'
                    : 'rounded-tl-none border-white/20 bg-white/5',
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={isAdmin ? 'text-sky-200 font-semibold' : 'text-white/70 font-semibold'}>
                    {isAdmin ? 'ทีมงาน' : 'ลูกค้า'}
                  </span>
                  <span className="text-white/50 text-[10px]">{new Date(message.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {message.body && <p className="text-sm text-white whitespace-pre-line break-words">{message.body}</p>}
                {message.attachments && message.attachments.length > 0 && (() => {
                  const imageAttachments = message.attachments.filter((f) => f.file_type?.startsWith('image/'));
                  const otherFiles = message.attachments.filter((f) => !f.file_type?.startsWith('image/'));
                  
                  return (
                    <div className="flex flex-wrap gap-2">
                      {imageAttachments.length > 0 && (
                        <button
                          onClick={() => {
                            setImageViewerImages(
                              imageAttachments.map((img) => ({
                                id: img.id,
                                url: img.url || '',
                                file_name: img.file_name || '',
                              })),
                            );
                            setImageViewerIndex(0);
                            setImageViewerOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded border border-sky-500/40 bg-sky-500/10 px-2 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20 transition-colors"
                        >
                          <ImageIcon className="size-3.5" />
                          <span>ดูรูป {imageAttachments.length > 1 ? `(${imageAttachments.length})` : ''}</span>
                        </button>
                      )}
                      {otherFiles.map((file) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white/80 hover:border-emerald-400/50"
                        >
                          <FileText className="size-3.5" />
                          <span className="line-clamp-1">{file.file_name}</span>
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const currentCompose = selectedTicketId ? compose[selectedTicketId] || { message: '', files: [], sending: false } : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/40 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Ticket Support</p>
          <h2 className="text-xl font-semibold text-white">จัดการ Ticket ลูกค้า</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {STATUS_FILTERS.filter(item => item.value !== 'all').map((item) => (
            <div key={item.value} className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-center">
              <p className="text-xs text-white/50">{item.label}</p>
              <p className="text-lg font-semibold text-white">{stats[item.value] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'list' | 'settings')}>
        <TabsList className="bg-white/10">
          <TabsTrigger value="list">รายการ Ticket</TabsTrigger>
          <TabsTrigger value="settings">การตั้งค่า</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-6 rounded-lg border border-white/10 bg-black/40 p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger className="border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent className="bg-[#050505] text-white">
                {STATUS_FILTERS.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="text-white">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value)}>
              <SelectTrigger className="border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="หมวดหมู่" />
              </SelectTrigger>
              <SelectContent className="bg-[#050505] text-white">
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)} className="text-white">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="ค้นหา (หัวข้อ, ผู้ใช้)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-white/10 bg-white/5 text-white placeholder:text-white/40 md:col-span-2"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-md border border-white/10 bg-black/60 p-4">{renderTicketList()}</div>

            <div className="space-y-4 rounded-md border border-white/10 bg-black/60 p-4">
              {selectedTicket && (
                <div className="rounded-md border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedTicket.title}</p>
                      <p className="text-xs text-white/60">
                        #{selectedTicket.id} • {selectedTicket.user?.username || 'ลูกค้า'}
                      </p>
                    </div>
                    <Select value={selectedTicket.status} onValueChange={(value) => updateTicketStatus(selectedTicket.id, value)}>
                      <SelectTrigger className="w-48 border-white/20 bg-black/40 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#050505] text-white">
                        {ADMIN_TICKET_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-white">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="max-h-[50vh] overflow-y-auto pr-2">{renderMessages()}</div>

              {selectedTicket && (
                <div className="rounded-md border border-white/10 bg-white/5 p-4">
                  <Textarea
                    placeholder="ตอบกลับลูกค้า..."
                    value={currentCompose?.message || ''}
                    onChange={(e) =>
                      setCompose((prev) => ({
                        ...prev,
                        [selectedTicket.id]: {
                          message: e.target.value,
                          files: prev[selectedTicket.id]?.files || [],
                          sending: prev[selectedTicket.id]?.sending || false,
                        },
                      }))
                    }
                    className="border-white/10 bg-black/40 text-white placeholder:text-white/40"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => document.getElementById(`admin-ticket-upload-${selectedTicket.id}`)?.click()}
                    >
                        <Paperclip className="mr-2 size-4" />
                        แนบไฟล์
                      </Button>
                      <input
                      id={`admin-ticket-upload-${selectedTicket.id}`}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) =>
                          setCompose((prev) => ({
                            ...prev,
                            [selectedTicket.id]: {
                              message: prev[selectedTicket.id]?.message || '',
                              files: Array.from(e.target.files || []),
                              sending: prev[selectedTicket.id]?.sending || false,
                            },
                          }))
                        }
                      />
                      {currentCompose?.files?.length ? (
                        <span className="text-xs text-white/60">{currentCompose.files.length} ไฟล์</span>
                      ) : null}
                    </div>
                    <Button
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                      disabled={currentCompose?.sending}
                      onClick={() => sendAdminMessage(selectedTicket.id)}
                    >
                      {currentCompose?.sending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          กำลังส่ง...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 size-4" />
                          ส่งข้อความ
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-6 rounded-lg border border-white/10 bg-black/40 p-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-white">สถานะการใช้งาน</p>
                <p className="text-sm text-white/60">เปิด/ปิดระบบ Ticket และกำหนดจำนวน Ticket สูงสุด</p>
              </div>
              <Switch
                checked={settings?.is_enabled ?? true}
                onCheckedChange={(checked) => setSettings((prev) => (prev ? { ...prev, is_enabled: checked } : prev))}
              />
            </div>
            <div className="mt-4 max-w-xs">
              <Label className="text-sm text-white/70">จำนวน Ticket เปิดพร้อมกันสูงสุด</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={settings?.max_open_per_user ?? 3}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, max_open_per_user: Math.max(1, Math.min(10, Number(e.target.value) || 1)) } : prev,
                  )
                }
                className="mt-1.5 border-white/10 bg-white/5 text-white"
              />
            </div>
            <Button
              className="mt-4 bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={saveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
              บันทึกการตั้งค่า
            </Button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">หมวดหมู่ Ticket</p>
                <p className="text-sm text-white/60">จัดการหัวข้อให้ลูกค้าเลือกขณะสร้าง Ticket</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="ชื่อหมวดหมู่"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="border-white/10 bg-black/30 text-white placeholder:text-white/40"
                />
                <Input
                  placeholder="คำอธิบาย (ไม่บังคับ)"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="border-white/10 bg-black/30 text-white placeholder:text-white/40"
                />
                <Button onClick={addCategory} disabled={addingCategory} className="bg-emerald-600 text-white hover:bg-emerald-500">
                  {addingCategory ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                  เพิ่ม
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{cat.name}</p>
                    <p className="text-xs text-white/50">{cat.description || 'ไม่มีคำอธิบาย'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'border-white/20 text-white',
                        cat.is_active ? 'hover:bg-emerald-500/20' : 'hover:bg-white/10',
                      )}
                      onClick={() => toggleCategory(cat)}
                    >
                      {cat.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-500/10"
                      onClick={() => deleteCategory(cat.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ImageViewer
        images={imageViewerImages}
        initialIndex={imageViewerIndex}
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
      />
    </div>
  );
}


