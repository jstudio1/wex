'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POPUP_COOKIE_KEY = 'popup_dismissed';
const POPUP_COOKIE_MAX_AGE = 3 * 24 * 60 * 60; // 3 วัน (วินาที)

export default function PopupNotification() {
  const [show, setShow] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [popupId, setPopupId] = useState<number | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAndShowPopup();
  }, []);

  const checkAndShowPopup = async () => {
    try {
      const res = await fetch('/api/popup', { 
        cache: 'default',
        headers: { 'Cache-Control': 'max-age=120' }
      });
      if (!res.ok) return;
      const json = await res.json();
      
      if (!json.image_url || !json.created_at) {
        setLoading(false);
        return;
      }

      setImageUrl(json.image_url);
      setPopupId(json.id);
      setCreatedAt(json.created_at);

      // เช็คว่าเคยปิด popup นี้ไปแล้วหรือยัง
      const dismissed = getCookie(POPUP_COOKIE_KEY);
      const popupCreatedAt = new Date(json.created_at).getTime();
      const now = Date.now();

      if (dismissed) {
        try {
          const dismissedData = JSON.parse(dismissed);
          const dismissedAt = dismissedData.dismissed_at;
          const dismissedPopupId = dismissedData.popup_id;

          // ถ้ามี popup ใหม่ (popup_id เปลี่ยน หรือ created_at หลังเวลาที่ปิด) หรือเกิน 3 วันแล้ว ให้แสดง
          const isNewPopup = dismissedPopupId !== json.id || popupCreatedAt > dismissedAt;
          const isOverThreeDays = (now - dismissedAt) > (3 * 24 * 60 * 60 * 1000);
          
          if (isNewPopup || isOverThreeDays) {
            setShow(true);
          }
        } catch {
          // ถ้า parse cookie ไม่ได้ ให้แสดง
          setShow(true);
        }
      } else {
        // ยังไม่เคยปิด ให้แสดง
        setShow(true);
      }
    } catch (err) {
      console.error('Popup check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (!popupId || !createdAt) return;
    
    // บันทึกว่าปิดแล้ว พร้อม popup_id และ timestamp (ใช้เวลาปัจจุบัน)
    const dismissedAt = Date.now();
    setCookie(POPUP_COOKIE_KEY, JSON.stringify({
      popup_id: popupId,
      dismissed_at: dismissedAt,
    }), POPUP_COOKIE_MAX_AGE);
    
    setShow(false);
  };

  if (loading || !show || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        // ปิด popup เมื่อคลิกที่ backdrop (นอก popup content)
        if (e.target === e.currentTarget) {
          setShow(false);
        }
      }}
    >
      <div 
        className="relative max-w-2xl w-full bg-black rounded-lg border border-white/20 shadow-2xl overflow-hidden"
        onClick={(e) => {
          // ป้องกันการปิดเมื่อคลิกที่ popup content
          e.stopPropagation();
        }}
      >
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 transition-colors"
          aria-label="ปิด"
        >
          <X className="size-5 text-[color:var(--text)]" />
        </button>
        
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={imageUrl} 
            alt="แจ้งเตือน" 
            className="w-full h-auto object-contain"
          />
        </div>
        
        <div className="p-4 bg-black/60 border-t border-white/10">
          <Button
            onClick={handleDismiss}
            className="w-full"
            variant="outline"
          >
            ไม่แสดงอีกใน 3 วัน
          </Button>
        </div>
      </div>
    </div>
  );
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

