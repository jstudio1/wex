'use client';

import { useState, useEffect } from 'react';
import dynamicImport from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Coins, Gift, QrCode, Building2, CreditCard, Wallet, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CodeRedeem = dynamicImport(() => import('@/components/topup/CodeRedeem'), {
  loading: () => <div className="h-64 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
  ssr: false,
});

const QrPayment = dynamicImport(() => import('@/components/topup/QrPayment'), {
  loading: () => <div className="h-64 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
  ssr: false,
});

const SlipTransfer = dynamicImport(() => import('@/components/topup/SlipTransfer'), {
  loading: () => <div className="h-64 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
  ssr: false,
});

const TruewalletVoucher = dynamicImport(() => import('@/components/topup/TruewalletVoucher'), {
  loading: () => <div className="h-64 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
  ssr: false,
});

type PaymentMethod = 'code' | 'qr' | 'slip' | 'truewallet';
type BankAccount = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
};

export default function TopupPage() {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<{ code: boolean; qr: boolean; slip: boolean; truewallet: boolean }>({
    code: true,
    qr: true,
    slip: true,
    truewallet: true,
  });
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/site', { cache: 'no-store' });
        const json = await res.json();
        const enabled = json.paymentMethods || { code: true, qr: true, slip: true, truewallet: true };
        setPaymentMethods(enabled);
        setBankAccounts(Array.isArray(json.bankAccounts) ? json.bankAccounts : []);
        
        if (enabled.code) {
          setMethod('code');
        } else if (enabled.qr) {
          setMethod('qr');
        } else if (enabled.slip) {
          setMethod('slip');
        } else if (enabled.truewallet) {
          setMethod('truewallet');
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
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
      iconImage: null,
      description: 'ใช้โค้ดเติมพอยต์',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/30',
      borderColor: 'border-emerald-600',
      activeColor: 'bg-emerald-900/20',
    },
    {
      id: 'qr' as PaymentMethod,
      name: 'QR Payment',
      icon: QrCode,
      iconImage: 'https://img5.pic.in.th/file/secure-sv1/webpqr.webp',
      description: 'ชำระผ่าน PromptPay',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/30',
      borderColor: 'border-emerald-600',
      activeColor: 'bg-emerald-900/20',
    },
    {
      id: 'slip' as PaymentMethod,
      name: 'สลิปโอนเงิน',
      icon: Receipt,
      iconImage: 'https://noveba.com/wp-content/uploads/promtpay-qr.png',
      description: 'อัปโหลดสลิปตรวจสอบอัตโนมัติ',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/30',
      borderColor: 'border-emerald-600',
      activeColor: 'bg-emerald-900/20',
    },
    {
      id: 'truewallet' as PaymentMethod,
      name: 'ซองอั่งเปา',
      icon: Gift,
      iconImage: 'https://img2.pic.in.th/pic/wepwallet.webp',
      description: 'แลกซอง TrueWallet',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/30',
      borderColor: 'border-emerald-600',
      activeColor: 'bg-emerald-900/20',
    },
  ];

  const methods = allMethods.filter(m => {
    if (m.id === 'code') return paymentMethods.code;
    if (m.id === 'qr') return paymentMethods.qr;
    if (m.id === 'slip') return paymentMethods.slip;
    if (m.id === 'truewallet') return paymentMethods.truewallet;
    return false;
  });

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
      <div className="min-h-screen flex items-center justify-center">
            <Spinner />
          </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="min-h-screen relative">
        <main className="relative mx-auto max-w-4xl px-4 py-8">
          <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg">
                <Wallet className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">เติมพอยต์</h1>
            <div className="bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-800 p-8 text-center">
              <p className="text-gray-300">ขณะนี้ไม่มีช่องทางการเติมพอยต์ที่เปิดใช้งาน</p>
              <p className="text-sm text-gray-400 mt-2">กรุณาติดต่อผู้ดูแลระบบ</p>
            </div>
          </div>
        </main>
        </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <main className="relative mx-auto max-w-4xl px-4 py-5 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5 sm:space-y-2 mb-4 sm:mb-8">
          <div className="flex items-center justify-center gap-3 mb-2 sm:mb-4">
            <div className="flex h-11 w-11 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg">
              <Wallet className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
        </div>
          </div>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-white">เติมพอยต์</h1>
          <p className="text-gray-300 text-xs sm:text-sm md:text-base">เลือกวิธีเติมพอยต์ที่คุณต้องการ</p>
          </div>

      {/* Payment Method Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {methods.map((m) => {
          const Icon = m.icon;
          const isActive = method === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`relative p-3 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 ${
                isActive
                  ? `${m.activeColor} ${m.borderColor} shadow-lg sm:scale-[1.02]`
                  : 'bg-[#0a0a0a] border-gray-800 hover:border-emerald-600/50 hover:shadow-md'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5 sm:gap-3">
                <div className={`p-2.5 sm:p-4 rounded-lg sm:rounded-xl ${isActive ? m.bgColor : 'bg-gray-900/50'} transition-colors flex items-center justify-center`}>
                  {m.iconImage ? (
                    <img
                      src={m.iconImage}
                      alt={m.name}
                      className="h-7 w-7 sm:h-12 sm:w-12 object-contain"
                    />
                  ) : (
                    <Icon className={`h-5 w-5 sm:h-8 sm:w-8 ${isActive ? m.color : 'text-gray-200'} transition-colors`} />
                  )}
                </div>
                <div className="text-center min-w-0 w-full">
                  <div className={`font-bold text-xs sm:text-base truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
                    {m.name}
                  </div>
                  <div className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 line-clamp-2 sm:line-clamp-none ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                    {m.description}
                  </div>
                </div>
                {isActive && (
                  <Badge
                    className={`shadow-md font-semibold !border-0 text-[9px] sm:text-xs px-1.5 sm:px-2.5 py-0 sm:py-0.5 ${
                      m.id === 'slip' ? '!bg-sky-500 !text-white' :
                      '!bg-emerald-600 !text-white'
                    }`}
                  >
                    ฟรีค่าธรรมเนียม
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Content Section */}
        <div className="bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-800 p-4 sm:p-6 md:p-8">
        {method === 'code' && <CodeRedeem />}
        {method === 'qr' && <QrPayment />}
        {method === 'slip' && <SlipTransfer accounts={bankAccounts} />}
        {method === 'truewallet' && <TruewalletVoucher />}
      </div>
    </main>
    </div>
  );
}
