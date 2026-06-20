'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Facebook, Mail, MessageCircle, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ContactInfo = {
  line?: string;
  phone?: string;
  facebook?: string;
  email?: string;
};

type ContactAction = {
  key: string;
  label: string;
  value: string;
  icon: typeof MessageCircle;
  onClick: () => void;
  className: string;
};

function normalizeLineUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const lineId = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return `https://line.me/ti/p/~${encodeURIComponent(lineId)}`;
}

export default function ContactAdminButton() {
  const [open, setOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const res = await fetch('/api/site', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setContactInfo({
          line: data.contact?.lineId || '',
          phone: data.contact?.phone || '',
          facebook: data.contact?.facebook || '',
          email: data.contact?.email || '',
        });
      } catch (error) {
        console.error('Failed to fetch contact info:', error);
      }
    };

    void fetchContactInfo();
  }, []);

  const actions: ContactAction[] = useMemo(() => {
    const items: ContactAction[] = [];

    if (contactInfo.line) {
      items.push({
        key: 'line',
        label: 'LINE',
        value: contactInfo.line,
        icon: MessageCircle,
        onClick: () => window.open(normalizeLineUrl(contactInfo.line || ''), '_blank', 'noopener,noreferrer'),
        className: 'border-emerald-300/35 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-500/20',
      });
    }

    if (contactInfo.phone) {
      items.push({
        key: 'phone',
        label: 'โทร',
        value: contactInfo.phone,
        icon: Phone,
        onClick: () => window.open(`tel:${contactInfo.phone}`, '_self'),
        className: 'border-sky-300/35 bg-sky-500/10 text-sky-100 hover:border-sky-300/60 hover:bg-sky-500/20',
      });
    }

    if (contactInfo.facebook) {
      items.push({
        key: 'facebook',
        label: 'Facebook',
        value: 'เปิดแชทผ่าน Facebook',
        icon: Facebook,
        onClick: () => window.open(contactInfo.facebook, '_blank', 'noopener,noreferrer'),
        className: 'border-blue-300/35 bg-blue-500/10 text-blue-100 hover:border-blue-300/60 hover:bg-blue-500/20',
      });
    }

    if (contactInfo.email) {
      items.push({
        key: 'email',
        label: 'Email',
        value: contactInfo.email,
        icon: Mail,
        onClick: () => window.open(`mailto:${contactInfo.email}`, '_self'),
        className: 'border-violet-300/35 bg-violet-500/10 text-violet-100 hover:border-violet-300/60 hover:bg-violet-500/20',
      });
    }

    return items;
  }, [contactInfo.email, contactInfo.facebook, contactInfo.line, contactInfo.phone]);

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-20 right-4 z-50 sm:bottom-24 sm:right-5 lg:bottom-6 lg:right-6">
        <button
          onClick={() => setOpen(true)}
          aria-label="ติดต่อแอดมิน"
          aria-haspopup="dialog"
          className="group relative isolate flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/45 bg-gradient-to-br from-emerald-300 via-emerald-400 to-cyan-400 text-emerald-950 shadow-[0_12px_28px_rgba(16,185,129,0.45)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_18px_36px_rgba(16,185,129,0.55)] sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3"
        >
          <span className="pointer-events-none absolute -inset-1 -z-10 rounded-full bg-emerald-400/40 blur-md opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border border-black/15 bg-red-400 animate-pulse" />
          <MessageCircle className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
          <span className="hidden text-sm font-semibold tracking-wide text-emerald-950 sm:inline">Contact</span>
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[430px] border border-white/15 bg-[#0a0b11] text-white shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">ติดต่อแอดมิน</DialogTitle>
            <DialogDescription className="text-white/65">เลือกช่องทางที่สะดวกเพื่อสอบถามหรือแจ้งปัญหา</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2.5 py-2">
            {actions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-200 ${item.className}`}
                >
                  <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/25">
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="line-clamp-1 text-xs opacity-85">{item.value}</p>
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
