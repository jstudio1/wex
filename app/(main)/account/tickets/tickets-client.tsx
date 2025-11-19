'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, MessageSquare, RefreshCw, Paperclip, Send, Image as ImageIcon, FileText, CheckCircle2, AlertCircle, ArrowLeft, X } from 'lucide-react';
import { TicketCategory, TicketMessage, TicketSummary } from '@/types/tickets';
import { getTicketStatusBadgeClasses, getTicketStatusLabel } from '@/lib/tickets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import ImageViewer from '@/components/tickets/ImageViewer';
import { useIsMobile } from '@/hooks/use-mobile';

type FilterKey = 'open' | 'closed' | 'all';

type TicketsClientProps = {
  initialTickets: TicketSummary[];
  initialTotals: { open: number; closed: number; all: number };
  categories: TicketCategory[];
  settings: { is_enabled: boolean; max_open_per_user: number };
};

type ComposeState = {
  message: string;
  files: File[];
  isSending: boolean;
};

export default function TicketsClient({ initialTickets, initialTotals, categories, settings }: TicketsClientProps) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<FilterKey>('open');
  const [tickets, setTickets] = useState<TicketSummary[]>(initialTickets);
  const [totals, setTotals] = useState(initialTotals);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(initialTickets[0]?.id ?? null);
  const [messages, setMessages] = useState<Record<number, TicketMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<Record<number, boolean>>({});
  const [composeState, setComposeState] = useState<Record<number, ComposeState>>({});
  const [newTicketDialog, setNewTicketDialog] = useState(false);
  const [newTicketLoading, setNewTicketLoading] = useState(false);
  const [agreePolicy, setAgreePolicy] = useState(true);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<Array<{ id: number; url: string; file_name: string }>>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'chat'>('list'); // สำหรับมือถือ: 'list' หรือ 'chat'
  const [newTicketForm, setNewTicketForm] = useState({
    title: '',
    category_id: categories[0]?.id ? String(categories[0].id) : '',
    message: '',
    files: [] as File[],
  });

  useEffect(() => {
    if (tickets.length && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedTicketId) || null, [tickets, selectedTicketId]);

  const handleFilterChange = async (nextFilter: FilterKey) => {
    setFilter(nextFilter);
    setLoadingList(true);
    try {
      const res = await fetch(`/api/tickets?filter=${nextFilter}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('ไม่สามารถโหลดรายการ Ticket ได้');
      }
      const data = await res.json();
      setTickets(data.tickets || []);
      setTotals(data.totals || initialTotals);
      setSelectedTicketId(data.tickets?.[0]?.id ?? null);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoadingList(false);
    }
  };

  const fetchMessages = useCallback(async (ticketId: number) => {
    setLoadingMessages((prev) => ({ ...prev, [ticketId]: true }));
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('โหลดข้อความไม่สำเร็จ');
      }
      const data = await res.json();
      setMessages((prev) => ({ ...prev, [ticketId]: data.messages || [] }));
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages((prev) => ({ ...prev, [ticketId]: false }));
    }
  }, [toast]);

  useEffect(() => {
    if (selectedTicketId) {
      fetchMessages(selectedTicketId);
    }
  }, [selectedTicketId, fetchMessages]);

  const handleSelectTicket = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    if (isMobile) {
      setViewMode('chat');
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
  };

  const handleFileChange = (files: File[], target: 'new' | number) => {
    if (target === 'new') {
      setNewTicketForm((prev) => ({ ...prev, files }));
      return;
    }
    setComposeState((prev) => ({
      ...prev,
      [target]: {
        message: prev[target]?.message || '',
        files,
        isSending: prev[target]?.isSending || false,
      },
    }));
  };

  const handleMessageChange = (ticketId: number, message: string) => {
    setComposeState((prev) => ({
      ...prev,
      [ticketId]: {
        message,
        files: prev[ticketId]?.files || [],
        isSending: prev[ticketId]?.isSending || false,
      },
    }));
  };

  const resetNewTicketForm = () => {
    setNewTicketForm({
      title: '',
      category_id: categories[0]?.id ? String(categories[0].id) : '',
      message: '',
      files: [],
    });
    setAgreePolicy(true);
  };

  const refreshList = () => {
    handleFilterChange(filter);
  };

  const handleCreateTicket = async () => {
    try {
      setNewTicketLoading(true);
      const formData = new FormData();
      formData.append('title', newTicketForm.title.trim());
      formData.append('category_id', newTicketForm.category_id);
      formData.append('message', newTicketForm.message.trim());
      newTicketForm.files.forEach((file) => formData.append('files', file));
      const res = await fetch('/api/tickets', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'สร้าง Ticket ไม่สำเร็จ');
      }
      const data = await res.json();
      toast.show({ title: 'สร้าง Ticket แล้ว', description: 'ทีมงานจะติดต่อกลับโดยเร็ว' });
      setNewTicketDialog(false);
      resetNewTicketForm();
      await handleFilterChange(filter);
      setSelectedTicketId(data.ticket?.id ?? null);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setNewTicketLoading(false);
    }
  };

  const handleSendMessage = async (ticketId: number) => {
    const state = composeState[ticketId];
    if (!state?.message.trim() && !(state?.files?.length)) {
      toast.show({ title: 'กรุณากรอกข้อความหรือแนบไฟล์', variant: 'destructive' });
      return;
    }
    setComposeState((prev) => ({ ...prev, [ticketId]: { ...(prev[ticketId] || { files: [] }), isSending: true } }));
    try {
      const formData = new FormData();
      formData.append('message', (state?.message || '').trim());
      state?.files?.forEach((file) => formData.append('files', file));
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'ส่งข้อความไม่สำเร็จ');
      }
      await fetchMessages(ticketId);
      setComposeState((prev) => ({
        ...prev,
        [ticketId]: { message: '', files: [], isSending: false },
      }));
      refreshList();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
      setComposeState((prev) => ({
        ...prev,
        [ticketId]: { ...(prev[ticketId] || { files: [] }), isSending: false },
      }));
    }
  };

  const handleCloseTicket = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'ไม่สามารถปิด Ticket ได้');
      }
      toast.show({ title: 'ปิด Ticket แล้ว', description: 'ขอบคุณที่ติดต่อเรา' });
      refreshList();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const renderTicketCard = (ticket: TicketSummary) => {
    const isActive = selectedTicketId === ticket.id && !isMobile;
    return (
      <button
        key={ticket.id}
        className={cn(
          'w-full rounded-lg border px-4 py-4 text-left transition-all',
          isActive
            ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_10px_30px_rgba(0,128,128,0.15)]'
            : 'border-white/10 bg-white/5 active:bg-white/10 hover:border-white/30',
        )}
        onClick={() => handleSelectTicket(ticket.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="rounded-lg bg-emerald-500/20 p-2.5 flex-shrink-0">
              <MessageSquare className="size-5 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white line-clamp-1 mb-1">{ticket.title}</p>
              <p className="text-xs text-white/60 line-clamp-2 mb-2">{ticket.last_message_preview || 'ยังไม่มีข้อความ'}</p>
              <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn('text-xs', getTicketStatusBadgeClasses(ticket.status))}>
            {getTicketStatusLabel(ticket.status)}
          </Badge>
                <span className="text-xs text-white/50">{ticket.category?.name || 'ไม่ระบุหมวดหมู่'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end">
          <span className="text-xs text-white/50">{new Date(ticket.last_message_at).toLocaleString('th-TH', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</span>
        </div>
      </button>
    );
  };

  const renderMessages = () => {
    if (!selectedTicketId) {
      return (
        <div className="flex h-full flex-col items-center justify-center rounded-md border border-white/10 bg-white/5 p-8 text-center text-white/60">
          <MessageSquare className="mb-4 size-8 text-white/40" />
          <p>เลือก Ticket ที่ต้องการอ่านหรือสร้าง Ticket ใหม่</p>
        </div>
      );
    }
    if (loadingMessages[selectedTicketId]) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-16 w-full rounded-md bg-white/10" />
          ))}
        </div>
      );
    }
    const messageList = messages[selectedTicketId] || [];
    if (!messageList.length) {
      return (
        <div className="rounded-md border border-dashed border-white/10 bg-white/5 p-6 text-center text-white/60">
          ยังไม่มีข้อความใน Ticket นี้
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {messageList.map((message) => {
          const isOwner = message.sender_role === 'user';
          return (
            <div
              key={message.id}
              className={cn('flex w-full', isOwner ? 'justify-start' : 'justify-end')}
            >
              <div
                className={cn(
                  'flex max-w-[75%] md:max-w-[75%] flex-col gap-2 rounded-lg md:rounded-md border px-3 py-2.5 md:py-2',
                  isOwner
                    ? 'rounded-tl-none border-emerald-500/40 bg-emerald-500/10'
                    : 'rounded-tr-none border-sky-500/40 bg-sky-500/10',
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={cn('font-semibold', isOwner ? 'text-emerald-200' : 'text-sky-200')}>
                    {isOwner ? 'คุณ' : 'ทีมงาน'}
                  </span>
                  <span className="text-white/50 text-[10px]">{new Date(message.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {message.body && <p className="text-sm text-white/90 whitespace-pre-line break-words">{message.body}</p>}
                {message.attachments && message.attachments.length > 0 && (() => {
                  const imageAttachments = message.attachments.filter((f) => f.file_type?.startsWith('image/'));
                  const otherFiles = message.attachments.filter((f) => !f.file_type?.startsWith('image/'));
                  
                  return (
                    <div className="flex flex-wrap gap-2">
                      {imageAttachments.length > 0 && (
                        <button
                          onClick={() => {
                            setImageViewerImages(
                              imageAttachments.map((img: any) => ({
                                id: img.id,
                                url: img.url || '',
                                file_name: img.file_name || '',
                              })),
                            );
                            setImageViewerIndex(0);
                            setImageViewerOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20 transition-colors"
                        >
                          <ImageIcon className="size-3.5" />
                          <span>ดูรูป {imageAttachments.length > 1 ? `(${imageAttachments.length})` : ''}</span>
                        </button>
                      )}
                      {otherFiles.map((file: any) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white/80 hover:border-emerald-400/50"
                        >
                          <FileText className="size-3.5 text-emerald-300" />
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

  const compose = selectedTicketId ? composeState[selectedTicketId] || { message: '', files: [], isSending: false } : null;

  const canCreateTicket = settings.is_enabled && totals.open < settings.max_open_per_user;

  // Mobile: แสดง chat view
  if (isMobile && viewMode === 'chat' && selectedTicketId) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col">
        {/* Chat Header - Mobile */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="text-white hover:bg-white/10 -ml-2"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex-1 min-w-0">
              {selectedTicket && (
                <>
                  <p className="text-sm font-semibold text-white truncate">{selectedTicket.title}</p>
                  <p className="text-xs text-white/60">{selectedTicket.category?.name || 'ไม่ระบุหมวดหมู่'}</p>
                </>
              )}
            </div>
            <Badge className={cn('text-xs', selectedTicket ? getTicketStatusBadgeClasses(selectedTicket.status) : '')}>
              {selectedTicket ? getTicketStatusLabel(selectedTicket.status) : ''}
            </Badge>
          </div>
        </div>

        {/* Chat Messages - Mobile */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {renderMessages()}
        </div>

        {/* Chat Input - Mobile */}
        {selectedTicket && selectedTicket.status !== 'closed' && (
          <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-white/10 p-4 pb-4 safe-area-inset-bottom">
            <div className="space-y-3">
              <Textarea
                className="min-h-[80px] resize-none border-white/10 bg-black/40 text-white placeholder:text-white/40 text-base"
                value={compose?.message || ''}
                onChange={(e) => handleMessageChange(selectedTicket.id, e.target.value)}
                placeholder="พิมพ์ข้อความ..."
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10 flex-shrink-0"
                  onClick={() => document.getElementById(`reply-upload-${selectedTicket.id}`)?.click()}
                >
                  <Paperclip className="size-4" />
                </Button>
                <input
                  id={`reply-upload-${selectedTicket.id}`}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileChange(Array.from(e.target.files || []), selectedTicket.id)}
                />
                {compose?.files?.length ? (
                  <div className="text-xs text-white/60 flex-1">
                    {compose.files.length} ไฟล์แนบ
                  </div>
                ) : null}
                <Button
                  onClick={() => handleSendMessage(selectedTicket.id)}
                  disabled={compose?.isSending}
                  className="bg-emerald-600 text-white hover:bg-emerald-500 flex-shrink-0"
                  size="lg"
                >
                  {compose?.isSending ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <ImageViewer
          images={imageViewerImages}
          initialIndex={imageViewerIndex}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />
      </div>
    );
  }

  // Mobile: แสดง list view หรือ Desktop: แสดง grid view
  return (
    <div className="min-h-screen bg-[#050505] px-4 py-4 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:gap-8">
        {/* Header */}
        <header className="rounded-lg border border-white/10 bg-gradient-to-br from-emerald-900/40 via-black to-black p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Ticket Center</p>
              <h1 className="text-xl md:text-2xl font-semibold text-white mt-1">ระบบติดต่อทีมงาน</h1>
              <p className="text-xs md:text-sm text-white/60">ติดตามสถานะ พูดคุย และส่งหลักฐานได้จากที่เดียว</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => handleFilterChange(filter)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                size={isMobile ? 'sm' : 'default'}
              >
                <RefreshCw className="mr-2 size-4" />
                รีเฟรช
              </Button>
              <Button
                onClick={() => setNewTicketDialog(true)}
                disabled={!canCreateTicket}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
                size={isMobile ? 'sm' : 'default'}
              >
                <Plus className="mr-2 size-4" />
                สร้าง Ticket ใหม่
              </Button>
            </div>
          </div>
          {!settings.is_enabled && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <AlertCircle className="size-4" />
              ระบบ Ticket ถูกปิดชั่วคราว
            </div>
          )}
          {settings.is_enabled && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
              <span>
                สามารถเปิดได้สูงสุด {settings.max_open_per_user} รายการ (เปิดอยู่ {totals.open})
              </span>
              {!canCreateTicket && (
                <span className="text-amber-300">
                  กรุณาปิด Ticket เก่าก่อนเพื่อเปิดรายการใหม่
                </span>
              )}
            </div>
          )}
        </header>

        <div className="grid gap-6 md:grid-cols-[360px_minmax(0,1fr)]">
          {/* List Section */}
          <section className={cn(
            "space-y-4 rounded-lg border border-white/10 bg-black/40 p-4",
            isMobile && "md:hidden"
          )}>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {(['open', 'closed', 'all'] as FilterKey[]).map((item) => (
                <button
                  key={item}
                  onClick={() => handleFilterChange(item)}
                  className={cn(
                    'rounded-lg border px-2 md:px-3 py-2.5 md:py-3 text-center text-xs font-semibold uppercase tracking-wide transition-all active:scale-95',
                    filter === item
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-white/60 active:bg-white/10',
                  )}
                >
                  <p className="text-[10px] md:text-xs">{item === 'open' ? 'Open' : item === 'closed' ? 'Closed' : 'ทั้งหมด'}</p>
                  <p className="mt-1 text-base md:text-lg text-white font-bold">
                    {item === 'open' ? totals.open : item === 'closed' ? totals.closed : totals.all}
                  </p>
                </button>
              ))}
            </div>

            <div className={cn(
              "space-y-3 overflow-y-auto",
              isMobile ? "h-[calc(100vh-280px)] pr-1" : "h-[60vh] pr-2"
            )}>
              {loadingList ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-28 md:h-24 w-full rounded-lg bg-white/10" />
                ))
              ) : tickets.length ? (
                tickets.map((ticket) => renderTicketCard(ticket))
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-6 md:p-8 text-center text-white/50">
                  <MessageSquare className="size-12 mx-auto mb-3 text-white/30" />
                  <p className="text-sm">ยังไม่มี Ticket ในกลุ่มนี้</p>
                </div>
              )}
            </div>
          </section>

          {/* Chat Section - Desktop Only */}
          <section className={cn(
            "hidden md:flex flex-col gap-4 rounded-lg border border-white/10 bg-black/40 p-5",
            isMobile && "hidden"
          )}>
            {selectedTicket && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{selectedTicket.title}</p>
                  <p className="text-xs text-white/60">{selectedTicket.category?.name || 'ไม่ระบุหมวดหมู่'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs', getTicketStatusBadgeClasses(selectedTicket.status))}>
                    {getTicketStatusLabel(selectedTicket.status)}
                  </Badge>
                  {selectedTicket.status !== 'closed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => handleCloseTicket(selectedTicket.id)}
                    >
                      ปิด Ticket
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto rounded-md border border-white/10 bg-black/60 p-4">
              {renderMessages()}
            </div>

            {selectedTicket && selectedTicket.status !== 'closed' && (
              <div className="rounded-md border border-white/10 bg-white/5 p-4">
                <Label className="text-xs uppercase tracking-[0.4em] text-white/50">ส่งข้อความ</Label>
                <Textarea
                  className="mt-2 h-24 resize-none border-white/10 bg-black/40 text-white placeholder:text-white/40"
                  value={compose?.message || ''}
                  onChange={(e) => handleMessageChange(selectedTicket.id, e.target.value)}
                  placeholder="พิมพ์ข้อความถึงทีมงาน..."
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => document.getElementById(`reply-upload-${selectedTicket.id}`)?.click()}
                    >
                      <Paperclip className="mr-2 size-4" />
                      แนบไฟล์
                    </Button>
                    <input
                      id={`reply-upload-${selectedTicket.id}`}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileChange(Array.from(e.target.files || []), selectedTicket.id)}
                    />
                    {compose?.files?.length ? (
                      <div className="text-xs text-white/60">{compose.files.length} ไฟล์แนบ</div>
                    ) : null}
                  </div>
                  <Button
                    onClick={() => handleSendMessage(selectedTicket.id)}
                    disabled={compose?.isSending}
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    {compose?.isSending ? (
                      <>
                        <RefreshCw className="mr-2 size-4 animate-spin" />
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
          </section>
        </div>
      </div>

      <Dialog
        open={newTicketDialog}
        onOpenChange={(open) => {
          setNewTicketDialog(open);
          if (!open) resetNewTicketForm();
        }}
      >
        <DialogContent className="max-w-2xl border border-white/10 bg-[#050505] text-white">
          <DialogHeader>
            <DialogTitle>สร้าง Ticket ใหม่</DialogTitle>
            <DialogDescription className="text-white/70">
              กรอกข้อมูลให้ครบถ้วนเพื่อให้ทีมงานช่วยเหลือได้เร็วขึ้น
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm text-white/70">หัวข้อ</Label>
                <Input
                  value={newTicketForm.title}
                  onChange={(e) => setNewTicketForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="เช่น เติมพอยต์ไม่เข้า"
                  className="mt-1.5 border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-sm text-white/70">หมวดหมู่</Label>
                <Select
                  value={newTicketForm.category_id}
                  onValueChange={(value) => setNewTicketForm((prev) => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger className="mt-1.5 border-white/10 bg-white/5 text-white">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0a] border-gray-800 text-white">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)} className="text-white focus:bg-white/10">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm text-white/70">รายละเอียด</Label>
              <Textarea
                value={newTicketForm.message}
                onChange={(e) => setNewTicketForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="อธิบายปัญหาของคุณให้ละเอียด"
                className="mt-1.5 h-32 border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>

            <div className="rounded-md border border-dashed border-white/15 bg-black/40 p-4">
              <Label className="text-sm text-white/70">แนบไฟล์ (สูงสุด 5 ไฟล์)</Label>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => document.getElementById('ticket-new-files')?.click()}
                >
                  <Paperclip className="mr-2 size-4" />
                  เลือกไฟล์
                </Button>
                <input
                  id="ticket-new-files"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileChange(Array.from(e.target.files || []), 'new')}
                />
                {newTicketForm.files.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-white/70">
                    {newTicketForm.files.map((file, idx) => (
                      <span key={`${file.name}-${idx}`} className="rounded-full bg-white/10 px-3 py-1">
                        {file.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/70">
              <div>
                <p className="font-semibold text-white">ยืนยันข้อมูลถูกต้อง</p>
                <p className="text-xs text-white/50">
                  การแนบหลักฐานครบถ้วนช่วยให้ทีมงานแก้ไขได้เร็วขึ้น
                </p>
              </div>
              <Switch checked={agreePolicy} onCheckedChange={setAgreePolicy} disabled={newTicketLoading} />
            </div>
          </div>

          <DialogFooter className="mt-4 flex w-full flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
              onClick={() => setNewTicketDialog(false)}
              disabled={newTicketLoading}
            >
              ยกเลิก
            </Button>
            <Button
              className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={handleCreateTicket}
              disabled={newTicketLoading || !agreePolicy || !canCreateTicket}
            >
              {newTicketLoading ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  ยืนยันสร้าง Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageViewer
        images={imageViewerImages}
        initialIndex={imageViewerIndex}
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
      />
    </div>
  );
}


