'use client';

import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function ContactAdminButton() {
  const [open, setOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});

  useEffect(() => {
    // ดึงข้อมูลติดต่อจาก API site
    const fetchContactInfo = async () => {
      try {
        const res = await fetch('/api/site');
        if (res.ok) {
          const data = await res.json();
          setContactInfo({
            line: data.contact?.lineId || '',
            phone: data.contact?.phone || '',
            facebook: data.contact?.facebook || '',
            email: data.contact?.email || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch contact info:', error);
      }
    };
    fetchContactInfo();
  }, []);

  const handleLineClick = () => {
    if (contactInfo.line) {
      // Support both LINE ID format and full URL
      const lineId = contactInfo.line.startsWith('http') 
        ? contactInfo.line 
        : `https://line.me/ti/p/~${contactInfo.line}`;
      window.open(lineId, '_blank');
    }
  };

  const handlePhoneClick = () => {
    if (contactInfo.phone) {
      window.open(`tel:${contactInfo.phone}`, '_self');
    }
  };

  const handleFacebookClick = () => {
    if (contactInfo.facebook) {
      window.open(contactInfo.facebook, '_blank');
    }
  };

  const handleEmailClick = () => {
    if (contactInfo.email) {
      window.open(`mailto:${contactInfo.email}`, '_self');
    }
  };

  // ซ่อนปุ่มถ้าไม่มีข้อมูลติดต่อเลย
  const hasContactInfo = contactInfo.line || contactInfo.phone || contactInfo.facebook || contactInfo.email;
  
  if (!hasContactInfo) {
    return null;
  }

  return (
    <>
      {/* Sticky Contact Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen(true)}
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group p-0 border-0 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          aria-label="ติดต่อแอดมิน"
        >
          <MessageCircle className="h-7 w-7 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Contact Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ติดต่อแอดมิน</DialogTitle>
            <DialogDescription>
              เลือกช่องทางที่ต้องการติดต่อ
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {contactInfo.line && (
              <Button
                onClick={handleLineClick}
                className="w-full bg-[#06C755] hover:bg-[#05B048] text-white justify-start gap-3 h-12"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.058 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                <span>LINE: {contactInfo.line}</span>
              </Button>
            )}
            {contactInfo.phone && (
              <Button
                onClick={handlePhoneClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start gap-3 h-12"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>โทร: {contactInfo.phone}</span>
              </Button>
            )}
            {contactInfo.facebook && (
              <Button
                onClick={handleFacebookClick}
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white justify-start gap-3 h-12"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </Button>
            )}
            {contactInfo.email && (
              <Button
                onClick={handleEmailClick}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white justify-start gap-3 h-12"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email: {contactInfo.email}</span>
              </Button>
            )}
            {!contactInfo.line && !contactInfo.phone && !contactInfo.facebook && !contactInfo.email && (
              <p className="text-sm text-gray-500 text-center py-4">
                ยังไม่ได้ตั้งค่าข้อมูลติดต่อ
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

