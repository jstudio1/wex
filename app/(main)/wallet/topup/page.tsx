'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Coins, Gift, QrCode, Building2, CreditCard, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CodeRedeem from '@/components/topup/CodeRedeem';
import QrPayment from '@/components/topup/QrPayment';
import BankTransfer from '@/components/topup/BankTransfer';

type PaymentMethod = 'code' | 'qr' | 'bank';

export default function TopupPage() {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<{ code: boolean; qr: boolean; bank: boolean }>({
    code: true,
    qr: true,
    bank: true,
  });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/site', { cache: 'no-store' });
        const json = await res.json();
        const enabled = json.paymentMethods || { code: true, qr: true, bank: true };
        setPaymentMethods(enabled);
        
        // Set default method to first enabled method
        if (enabled.code) {
          setMethod('code');
        } else if (enabled.qr) {
          setMethod('qr');
        } else if (enabled.bank) {
          setMethod('bank');
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        // Default to code if error
        setMethod('code');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allMethods = [
    {
      id: 'code' as PaymentMethod,
      name: 'ใช้โค้ด',
      icon: Gift,
      description: 'ใช้โค้ดเติมพอยต์',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      id: 'qr' as PaymentMethod,
      name: 'QR Payment',
      icon: QrCode,
      description: 'ชำระผ่าน PromptPay',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      id: 'bank' as PaymentMethod,
      name: 'โอนเงิน',
      icon: Building2,
      description: 'โอนเงินผ่านธนาคาร',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
  ];

  // Filter methods based on settings
  const methods = allMethods.filter(m => {
    if (m.id === 'code') return paymentMethods.code;
    if (m.id === 'qr') return paymentMethods.qr;
    if (m.id === 'bank') return paymentMethods.bank;
    return false;
  });

  // If current method is disabled, switch to first available method
  useEffect(() => {
    if (!loading) {
      if (method === null && methods.length > 0) {
        setMethod(methods[0].id);
      } else if (method !== null) {
        const currentMethodEnabled = methods.find(m => m.id === method);
        if (!currentMethodEnabled && methods.length > 0) {
          setMethod(methods[0].id);
        }
      }
    }
  }, [paymentMethods, loading, methods]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6 md:py-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
              <Wallet className="size-8 text-accent" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[color:var(--text)]">เติมพอยต์</h1>
          <div className="flex justify-center">
            <Spinner />
          </div>
        </div>
      </main>
    );
  }

  if (methods.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6 md:py-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
              <Wallet className="size-8 text-accent" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[color:var(--text)]">เติมพอยต์</h1>
          <div className="card p-8 text-center">
            <p className="text-[color:var(--text)]/60">ขณะนี้ไม่มีช่องทางการเติมพอยต์ที่เปิดใช้งาน</p>
            <p className="text-sm text-[color:var(--text)]/40 mt-2">กรุณาติดต่อผู้ดูแลระบบ</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:py-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
            <Wallet className="size-8 text-accent" />
      </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[color:var(--text)]">เติมพอยต์</h1>
        <p className="text-[color:var(--text)]/60 text-sm md:text-base">เลือกวิธีเติมพอยต์ที่คุณต้องการ</p>
          </div>

      {/* Payment Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {methods.map((m) => {
          const Icon = m.icon;
          const isActive = method === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`relative p-4 md:p-6 rounded-xl border-2 transition-all duration-200 ${
                isActive
                  ? `${m.bgColor} ${m.borderColor} border-opacity-50 shadow-lg scale-[1.02]`
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 rounded-lg ${isActive ? m.bgColor : 'bg-white/5'}`}>
                  <Icon className={`size-6 ${isActive ? m.color : 'text-[color:var(--text)]/60'}`} />
                </div>
                <div className="text-center">
                  <div className={`font-semibold text-sm md:text-base ${isActive ? 'text-[color:var(--text)]' : 'text-[color:var(--text)]/70'}`}>
                    {m.name}
                  </div>
                  <div className={`text-xs mt-1 ${isActive ? 'text-[color:var(--text)]/60' : 'text-[color:var(--text)]/40'}`}>
                    {m.description}
                  </div>
                </div>
                {isActive && (
                  <div className="absolute -top-2 -right-2">
                    <Badge variant="destructive" className="bg-red-500 text-[color:var(--text)] border-red-500/30">
                      ฟรีค่าธรรมเนียม
                    </Badge>
          </div>
        )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Content Section */}
      <div className="card p-6 md:p-8">
        {method === 'code' && <CodeRedeem />}
        {method === 'qr' && <QrPayment />}
        {method === 'bank' && <BankTransfer />}
      </div>
    </main>
  );
}
