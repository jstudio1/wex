'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Copy, RefreshCw, Trash2, AlertCircle, CheckCircle2, Smartphone, Mail, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type MailItem = {
  uid: number;
  from: string;
  subject: string;
  date: string;
  html: string;
  unseen: boolean;
};

type OTPAppClientProps = {
  appId?: string;
};

const appNames: Record<string, { name: string; nameThai: string }> = {
  netflix: { name: 'NETFLIX', nameThai: 'เน็ตฟลิกซ์' },
  chatgpt: { name: 'CHATGPT', nameThai: 'แชทจีบีที' },
  canva: { name: 'CANVA', nameThai: 'แคนวา' },
  tiktok: { name: 'TIKTOK', nameThai: 'ติ๊กต๊อก' },
  'grok-ai': { name: 'GROK AI', nameThai: 'กร็อก เอไอ' },
  'perplexity-ai': { name: 'Perplexity AI', nameThai: 'ตัวช่วย AI' },
  otp24hr: { name: 'OTP24HR', nameThai: 'โอทีพี 24 ชม.' },
};

export default function OTPAppClient({ appId }: OTPAppClientProps) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidEmail, setIsValidEmail] = useState<boolean | null>(null);
  const [mails, setMails] = useState<MailItem[]>([]);
  const [selectedMail, setSelectedMail] = useState<MailItem | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const appInfo = appId ? appNames[appId] : null;
  const displayName = appInfo ? `${appInfo.nameThai} (${appInfo.name})` : 'รับ OTP แอพ';

  // Validate email format
  const validateEmail = useCallback((email: string): boolean => {
    if (!email.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Handle email change
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value.trim()) {
      setIsValidEmail(validateEmail(value));
    } else {
      setIsValidEmail(null);
    }
  };

  // Extract OTP from HTML content
  const extractOTP = (html: string): string | null => {
    // Try to find OTP patterns in HTML
    const patterns = [
      /(\d{4,8})/g, // 4-8 digit numbers
      /code[:\s]*(\d{4,8})/i,
      /otp[:\s]*(\d{4,8})/i,
      /verification[:\s]*code[:\s]*(\d{4,8})/i,
    ];

    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches) {
        // Find the longest number that looks like OTP (usually 4-6 digits)
        const numbers = matches
          .map(m => m.replace(/\D/g, ''))
          .filter(n => n.length >= 4 && n.length <= 8);
        if (numbers.length > 0) {
          return numbers[0];
        }
      }
    }

    // Try to find in text content
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const textMatches = textContent.match(/\b(\d{4,8})\b/g);
    if (textMatches) {
      return textMatches[0];
    }

    return null;
  };

  // Fetch mails from API
  const fetchMails = useCallback(async (emailAddress: string) => {
    try {
      const res = await fetch(`/api/otp/mail?mail=${encodeURIComponent(emailAddress)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถดึงข้อมูลอีเมลได้');
      }

      if (data.data && Array.isArray(data.data)) {
        setMails(data.data);

        // Try to extract OTP from the latest email
        if (data.data.length > 0) {
          const latestMail = data.data[0];
          setSelectedMail(latestMail);
          const otp = extractOTP(latestMail.html);
          if (otp) {
            setOtpCode(otp);
          }
        }
      } else {
        setMails([]);
        setSelectedMail(null);
        setOtpCode('');
      }
    } catch (error) {
      console.error('Fetch mails error:', error);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลอีเมลได้',
        variant: 'destructive',
      });
      setMails([]);
      setSelectedMail(null);
      setOtpCode('');
    }
  }, [toast]);

  // Request OTP
  const handleRequestOTP = async () => {
    if (!email.trim()) {
      toast.show({
        title: 'กรุณากรอกอีเมล',
        variant: 'destructive',
      });
      return;
    }

    if (!validateEmail(email)) {
      toast.show({
        title: 'อีเมลไม่ถูกต้อง',
        description: 'กรุณากรอกอีเมลที่ถูกต้อง (เช่น example@wexplus.com)',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setOtpCode('');
    setMails([]);
    setSelectedMail(null);

    await fetchMails(email);
    setIsLoading(false);
  };

  // Auto refresh when enabled
  useEffect(() => {
    if (autoRefresh && email && validateEmail(email)) {
      const interval = setInterval(() => {
        fetchMails(email);
      }, 5000); // Refresh every 5 seconds
      setRefreshInterval(interval);
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh, email, validateEmail, fetchMails, refreshInterval]);

  // Handle copy OTP
  const handleCopyOTP = async () => {
    if (!otpCode) return;

    try {
      await navigator.clipboard.writeText(otpCode);
      toast.show({
        title: 'คัดลอกสำเร็จ',
        description: 'รหัส OTP ถูกคัดลอกไปยัง clipboard แล้ว',
      });
    } catch (error) {
      toast.show({
        title: 'คัดลอกไม่สำเร็จ',
        description: 'ไม่สามารถคัดลอกรหัสได้',
        variant: 'destructive',
      });
    }
  };

  // Handle clear
  const handleClear = () => {
    setEmail('');
    setOtpCode('');
    setIsLoading(false);
    setIsValidEmail(null);
    setMails([]);
    setSelectedMail(null);
    setAutoRefresh(false);
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // Handle mail selection
  const handleSelectMail = (mail: MailItem) => {
    setSelectedMail(mail);
    const otp = extractOTP(mail.html);
    if (otp) {
      setOtpCode(otp);
    } else {
      setOtpCode('');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/30 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {displayName}
          </CardTitle>
          <CardDescription>กรอกอีเมลเพื่อรับรหัส OTP จากอีเมล</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <div className="space-y-2">
              <Input
                id="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="เช่น example@wexplus.com"
                className={cn(
                  'bg-black/50 border-white/10',
                  isValidEmail === false && 'border-red-500/50',
                  isValidEmail === true && 'border-emerald-500/50',
                )}
                disabled={isLoading}
              />
              {isValidEmail === false && email.trim() && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  อีเมลไม่ถูกต้อง กรุณากรอกอีเมลที่ถูกต้อง
                </p>
              )}
              {isValidEmail === true && (
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  อีเมลถูกต้อง
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleRequestOTP}
              disabled={!email.trim() || isValidEmail === false || isLoading}
              className="flex-1"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              {isLoading ? 'กำลังดึงข้อมูล...' : 'ดึงอีเมล'}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={!email && !otpCode && mails.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              ล้างข้อมูล
            </Button>
          </div>

          {mails.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-white/70">รายการอีเมล ({mails.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAutoRefresh(!autoRefresh);
                    if (!autoRefresh && email) {
                      fetchMails(email);
                    }
                  }}
                  className="text-xs"
                >
                  <RefreshCw className={cn('h-3 w-3 mr-1', autoRefresh && 'animate-spin')} />
                  {autoRefresh ? 'ปิดอัปเดตอัตโนมัติ' : 'อัปเดตอัตโนมัติ'}
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {mails.map((mail) => (
                  <button
                    key={mail.uid}
                    onClick={() => handleSelectMail(mail)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all',
                      selectedMail?.uid === mail.uid
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : 'bg-black/30 border-white/10 hover:bg-black/50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-white truncate">{mail.from}</p>
                          {mail.unseen && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                              ใหม่
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/70 truncate mb-1">{mail.subject}</p>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <Clock className="h-3 w-3" />
                          <span>{mail.date}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {otpCode && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="text-center space-y-2">
                <Label className="text-sm text-white/70">รหัส OTP</Label>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-5xl font-mono font-bold tracking-wider text-emerald-400">
                    {otpCode}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyOTP}
                    className="h-12 w-12"
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={handleCopyOTP}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  คัดลอกรหัส
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-black/30 border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">วิธีใช้งาน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/70">
          <p>1. กรอกอีเมลที่ต้องการใช้ (เช่น example@wexplus.com)</p>
          <p>2. กดปุ่ม &quot;ดึงอีเมล&quot; เพื่อดึงรายการอีเมลล่าสุด</p>
          <p>3. เลือกอีเมลที่มีรหัส OTP จากรายการ</p>
          <p>4. ระบบจะดึงรหัส OTP อัตโนมัติ หรือใช้ปุ่ม &quot;คัดลอกรหัส&quot; เพื่อคัดลอกไปใช้</p>
          <p>5. เปิดใช้งาน &quot;อัปเดตอัตโนมัติ&quot; เพื่อดึงอีเมลใหม่ทุก 5 วินาที</p>
          <p className="pt-2 text-xs text-white/50">
            * ระบบจะพยายามดึงรหัส OTP จากเนื้อหาอีเมลอัตโนมัติ
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

