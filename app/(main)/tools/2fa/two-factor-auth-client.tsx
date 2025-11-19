'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { authenticator } from 'otplib';
import { Copy, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TwoFactorAuthClient() {
  const toast = useToast();
  const [secretKey, setSecretKey] = useState('');
  const [otp, setOtp] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidSecret, setIsValidSecret] = useState<boolean | null>(null);

  // Validate Base32 secret key
  const validateSecret = useCallback((secret: string): boolean => {
    if (!secret.trim()) return false;
    // Base32 regex: only A-Z and 2-7
    const base32Regex = /^[A-Z2-7]+=*$/;
    return base32Regex.test(secret.toUpperCase().replace(/\s/g, ''));
  }, []);

  // Generate TOTP
  const generateOTP = useCallback(() => {
    if (!secretKey.trim()) {
      setIsValidSecret(false);
      return;
    }

    const cleanSecret = secretKey.toUpperCase().replace(/\s/g, '');
    
    if (!validateSecret(cleanSecret)) {
      setIsValidSecret(false);
      setOtp(null);
      return;
    }

    try {
      setIsValidSecret(true);
      const token = authenticator.generate(cleanSecret);
      setOtp(token);
      setTimeRemaining(30);
    } catch (error) {
      console.error('TOTP generation error:', error);
      setIsValidSecret(false);
      setOtp(null);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้างรหัส OTP ได้ กรุณาตรวจสอบ Secret Key',
        variant: 'destructive',
      });
    }
  }, [secretKey, validateSecret, toast]);

  // Start generating OTP automatically
  useEffect(() => {
    if (!isGenerating || !secretKey.trim() || !validateSecret(secretKey.toUpperCase().replace(/\s/g, ''))) {
      return;
    }

    // Generate immediately
    generateOTP();

    // Set up interval to regenerate every 30 seconds
    const interval = setInterval(() => {
      generateOTP();
    }, 30000);

    return () => clearInterval(interval);
  }, [isGenerating, secretKey, generateOTP, validateSecret]);

  // Countdown timer
  useEffect(() => {
    if (!isGenerating || !otp) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGenerating, otp]);

  // Warning when time is running out
  const showWarning = timeRemaining <= 7 && timeRemaining > 0;

  const handleStart = () => {
    if (!secretKey.trim()) {
      toast.show({
        title: 'กรุณากรอก Secret Key',
        variant: 'destructive',
      });
      return;
    }

    const cleanSecret = secretKey.toUpperCase().replace(/\s/g, '');
    if (!validateSecret(cleanSecret)) {
      toast.show({
        title: 'Secret Key ไม่ถูกต้อง',
        description: 'กรุณากรอก Base32 secret key ที่ถูกต้อง (เช่น JBSWY3DPEHPK3PXP)',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    generateOTP();
  };

  const handleCopy = async () => {
    if (!otp) return;

    try {
      await navigator.clipboard.writeText(otp);
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

  const handleClear = () => {
    setSecretKey('');
    setOtp(null);
    setIsGenerating(false);
    setTimeRemaining(30);
    setIsValidSecret(null);
  };

  const handleSecretChange = (value: string) => {
    setSecretKey(value);
    if (value.trim()) {
      const cleanSecret = value.toUpperCase().replace(/\s/g, '');
      setIsValidSecret(validateSecret(cleanSecret));
    } else {
      setIsValidSecret(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">เครื่องมือ 2FA</h1>
        <p className="text-white/70">สร้างรหัส OTP สำหรับการยืนยันตัวตนแบบ 2FA</p>
      </div>

      <Card className="bg-black/30 border-white/10">
        <CardHeader>
          <CardTitle>สร้างรหัส OTP</CardTitle>
          <CardDescription>กรอก Base32 Secret Key เพื่อสร้างรหัส OTP 6 หลัก</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret Key (Base32)</Label>
            <div className="space-y-2">
              <Input
                id="secret-key"
                value={secretKey}
                onChange={(e) => handleSecretChange(e.target.value)}
                placeholder="เช่น JBSWY3DPEHPK3PXP"
                className={cn(
                  'bg-black/50 border-white/10 font-mono',
                  isValidSecret === false && 'border-red-500/50',
                  isValidSecret === true && 'border-emerald-500/50',
                )}
                disabled={isGenerating}
              />
              {isValidSecret === false && secretKey.trim() && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Secret Key ไม่ถูกต้อง กรุณากรอก Base32 format
                </p>
              )}
              {isValidSecret === true && (
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Secret Key ถูกต้อง
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleStart}
              disabled={!secretKey.trim() || isValidSecret === false || isGenerating}
              className="flex-1"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isGenerating && 'animate-spin')} />
              {isGenerating ? 'กำลังสร้างรหัส...' : 'เริ่มสร้างรหัส'}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={!secretKey && !otp}>
              <Trash2 className="h-4 w-4 mr-2" />
              ล้างข้อมูล
            </Button>
          </div>

          {otp && isGenerating && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="text-center space-y-2">
                <Label className="text-sm text-white/70">รหัส OTP</Label>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-5xl font-mono font-bold tracking-wider text-emerald-400">
                    {otp}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="h-12 w-12"
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn(
                    'text-sm font-semibold',
                    showWarning ? 'text-amber-400' : 'text-white/70',
                  )}
                >
                  รหัสจะหมดอายุใน
                </div>
                <div
                  className={cn(
                    'text-2xl font-mono font-bold min-w-[3rem] text-center',
                    showWarning ? 'text-amber-400 animate-pulse' : 'text-emerald-400',
                  )}
                >
                  {timeRemaining}
                </div>
                <div className="text-sm text-white/70">วินาที</div>
              </div>

              {showWarning && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                  <p className="text-sm text-amber-400 font-semibold">
                    ⚠️ รหัสจะหมดอายุใน {timeRemaining} วินาที
                  </p>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={handleCopy}
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

      <Card className="mt-6 bg-black/30 border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">วิธีใช้งาน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/70">
          <p>1. กรอก Base32 Secret Key ที่ได้รับจากแอป Authenticator</p>
          <p>2. กดปุ่ม &quot;เริ่มสร้างรหัส&quot; เพื่อเริ่มสร้างรหัส OTP</p>
          <p>3. รหัสจะอัปเดตอัตโนมัติทุก 30 วินาที</p>
          <p>4. ใช้ปุ่ม &quot;คัดลอกรหัส&quot; เพื่อคัดลอกไปใช้</p>
          <p className="pt-2 text-xs text-white/50">
            * รหัส OTP จะหมดอายุทุก 30 วินาที และจะสร้างรหัสใหม่อัตโนมัติ
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

