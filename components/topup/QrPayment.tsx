'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { QrCode, CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function QrPayment() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<{
    qr_image_base64: string;
    id_pay: string;
    amount: string;
    time_out: string;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'timeout' | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const toast = useToast();

  // Poll payment status
  useEffect(() => {
    if (!qrData || paymentStatus === 'paid' || paymentStatus === 'timeout') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status?id_pay=${encodeURIComponent(qrData.id_pay)}`);
        const data = await res.json();
        
        if (data.status === 'PAID') {
          setPaymentStatus('paid');
          window.dispatchEvent(new CustomEvent('wallet:changed'));
          toast.show({
            title: 'ชำระเงินสำเร็จ',
            description: `ได้รับ ${data.amount} บาท เข้าบัญชีแล้ว`,
          });
          clearInterval(interval as unknown as NodeJS.Timeout);
        } else if (data.status === 'TIMEOUT') {
          setPaymentStatus('timeout');
          clearInterval(interval as unknown as NodeJS.Timeout);
        }
      } catch (error) {
        console.error('Payment status check error:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval as unknown as NodeJS.Timeout);
  }, [qrData, paymentStatus, toast]);

  // Countdown timer
  useEffect(() => {
    if (!qrData || paymentStatus !== 'pending') {
      setCountdown(null);
      return;
    }

    const timeout = parseInt(qrData.time_out, 10);
    let remaining = timeout;

    const interval = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        setPaymentStatus('timeout');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrData, paymentStatus]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0 || amountNum > 100000) {
      toast.show({
        title: 'จำนวนเงินไม่ถูกต้อง',
        description: 'กรุณาใส่จำนวนเงินระหว่าง 1 - 100,000 บาท',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setPaymentStatus(null);
    setQrData(null);
    
    try {
      const ref1 = `TOPUP_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const res = await fetch('/api/payments/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum, ref1 }),
      });

      const data = await res.json();
      
      if (data.status !== 1) {
        throw new Error(data.message || 'สร้าง QR Payment ไม่สำเร็จ');
      }

      setQrData(data);
      setPaymentStatus('pending');
      setAmount('');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-900/30 border border-emerald-700">
          <QrCode className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">ชำระผ่าน PromptPay</h2>
          <p className="text-sm text-gray-400">สแกน QR Code เพื่อชำระเงินผ่านแอปธนาคาร</p>
        </div>
      </div>

      {!qrData ? (
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div>
            <Label htmlFor="amount" className="text-gray-300 font-medium">
              จำนวนเงิน (บาท)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="เช่น 100, 500, 1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              min="1"
              max="100000"
              step="1"
              className="h-12 text-lg mt-2 border-2 border-gray-700 bg-[#1a1a1a] text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
            />
            <p className="text-xs text-gray-400 mt-1">จำนวนเงินขั้นต่ำ 1 บาท สูงสุด 100,000 บาท</p>
          </div>
          <Button
            type="submit"
            disabled={loading || !amount}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                กำลังสร้าง QR Code...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                สร้าง QR Code
              </span>
            )}
          </Button>
        </form>
      ) : (
        <div className="space-y-6">
          {paymentStatus === 'paid' ? (
            <div className="text-center space-y-4 py-8 bg-emerald-900/20 border border-emerald-800 rounded-2xl">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-emerald-900/50 border border-emerald-600">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-emerald-400 mb-2">ชำระเงินสำเร็จ</h3>
                <p className="text-gray-300">ได้รับ {qrData.amount} บาท เข้าบัญชีแล้ว</p>
              </div>
              <Button
                onClick={() => {
                  setQrData(null);
                  setPaymentStatus(null);
                  setCountdown(null);
                }}
                variant="outline"
                className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
              >
                เติมเงินอีกครั้ง
              </Button>
            </div>
          ) : paymentStatus === 'timeout' ? (
            <div className="text-center space-y-4 py-8 bg-red-900/20 border border-red-800 rounded-2xl">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-red-900/50 border border-red-700">
                  <XCircle className="h-12 w-12 text-red-400" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-red-400 mb-2">QR Code หมดอายุ</h3>
                <p className="text-gray-300">QR Code หมดอายุแล้ว กรุณาสร้างใหม่</p>
              </div>
              <Button
                onClick={() => {
                  setQrData(null);
                  setPaymentStatus(null);
                  setCountdown(null);
                }}
                variant="outline"
                className="border-red-800 text-red-400 hover:bg-red-900/20"
              >
                สร้าง QR Code ใหม่
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-[#0f0f0f] rounded-2xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-400">จำนวนเงิน</div>
                    <div className="text-2xl font-bold text-white">{parseFloat(qrData.amount).toLocaleString()} บาท</div>
                  </div>
                  {countdown !== null && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-900/30 border border-amber-700">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span className="text-amber-300 font-mono font-semibold">{formatTime(countdown)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-center p-4 bg-black rounded-lg border border-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${qrData.qr_image_base64}`}
                    alt="QR Code"
                    className="w-full max-w-xs"
                  />
                </div>
                <p className="text-center text-sm text-gray-400 mt-4">
                  สแกน QR Code นี้ด้วยแอปธนาคารของคุณเพื่อชำระเงิน
                </p>
              </div>
              <div className="bg-[#0f0f0f] rounded-2xl p-4 border border-gray-800">
                <div className="flex items-center gap-3">
                  <Spinner className="h-5 w-5 text-emerald-400" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">กำลังตรวจสอบสถานะการชำระเงิน...</div>
                    <div className="text-xs text-gray-400 mt-1">กรุณารอสักครู่</div>
                  </div>
                  <div className="text-sm font-semibold text-white tabular-nums">
                    {parseFloat(qrData.amount).toLocaleString()} ฿
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
