'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Coins, Gift, QrCode, Building2, CreditCard, Wallet, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CodeRedeem from '@/components/topup/CodeRedeem';
import QrPayment from '@/components/topup/QrPayment';
import SlipTransfer from '@/components/topup/SlipTransfer';
import TruewalletVoucher from '@/components/topup/TruewalletVoucher';

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
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      activeColor: 'bg-red-50',
    },
    {
      id: 'qr' as PaymentMethod,
      name: 'QR Payment',
      icon: QrCode,
      iconImage: 'https://img5.pic.in.th/file/secure-sv1/webpqr.webp',
      description: 'ชำระผ่าน PromptPay',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      activeColor: 'bg-red-50',
    },
    {
      id: 'slip' as PaymentMethod,
      name: 'สลิปโอนเงิน',
      icon: Receipt,
      iconImage: 'https://img5.pic.in.th/file/secure-sv1/webpbank.webp',
      description: 'อัปโหลดสลิปตรวจสอบอัตโนมัติ',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      activeColor: 'bg-blue-50',
    },
    {
      id: 'truewallet' as PaymentMethod,
      name: 'ซองอั่งเปา',
      icon: Gift,
      iconImage: 'https://img2.pic.in.th/pic/wepwallet.webp',
      description: 'แลกซอง TrueWallet',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      activeColor: 'bg-orange-50',
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Spinner />
          </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 relative">
        <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgb(220, 38, 38) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>
        
        <main className="relative mx-auto max-w-4xl px-4 py-8">
          <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 shadow-lg">
                <Wallet className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">เติมพอยต์</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-600">ขณะนี้ไม่มีช่องทางการเติมพอยต์ที่เปิดใช้งาน</p>
              <p className="text-sm text-gray-500 mt-2">กรุณาติดต่อผู้ดูแลระบบ</p>
            </div>
          </div>
        </main>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(220, 38, 38) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>
      
      {/* Decorative Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-red-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 shadow-lg">
              <Wallet className="h-8 w-8 text-white" />
        </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">เติมพอยต์</h1>
          <p className="text-gray-600 text-sm md:text-base">เลือกวิธีเติมพอยต์ที่คุณต้องการ</p>
          </div>

      {/* Payment Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {methods.map((m) => {
          const Icon = m.icon;
          const isActive = method === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`relative p-6 rounded-2xl border-2 transition-all duration-200 ${
                isActive
                  ? `${m.activeColor} ${m.borderColor} shadow-lg scale-[1.02]`
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`p-4 rounded-xl ${isActive ? m.bgColor : 'bg-gray-50'} transition-colors flex items-center justify-center`}>
                  {m.iconImage ? (
                    <img 
                      src={m.iconImage} 
                      alt={m.name}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <Icon className={`h-8 w-8 ${isActive ? m.color : 'text-gray-400'} transition-colors`} />
                  )}
                </div>
                <div className="text-center">
                  <div className={`font-bold text-base ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                    {m.name}
                  </div>
                  <div className={`text-xs mt-1 ${isActive ? 'text-gray-600' : 'text-gray-500'}`}>
                    {m.description}
                  </div>
                </div>
                {isActive && (
                  <Badge 
                    className={`shadow-md font-semibold !border-0 ${
                      m.id === 'code' ? '!bg-red-600 !text-white' :
                      m.id === 'qr' ? '!bg-red-600 !text-white' :
                      m.id === 'slip' ? '!bg-blue-600 !text-white' :
                      '!bg-orange-600 !text-white'
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        {method === 'code' && <CodeRedeem />}
        {method === 'qr' && <QrPayment />}
        {method === 'slip' && <SlipTransfer accounts={bankAccounts} />}
        {method === 'truewallet' && <TruewalletVoucher />}
      </div>
    </main>
    </div>
  );
}
