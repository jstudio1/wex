'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Gift, Info, CheckCircle2 } from 'lucide-react';

export default function TruewalletVoucher() {
  const [voucherInput, setVoucherInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const toast = useToast();

  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!voucherInput.trim()) {
      toast.show({
        title: 'กรุณากรอกรหัสซอง',
        description: 'โปรดกรอกลิงก์หรือรหัสซองอั่งเปา TrueWallet',
        variant: 'destructive',
      });
      return;
    }

    setRedeeming(true);

    try {
      const res = await fetch('/api/wallet/truewallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherInput: voucherInput.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถแลกซองได้');
      }

      toast.show({
        title: 'เติมเงินสำเร็จ!',
        description: json.data?.message || `ได้รับ ${json.data?.pointsAdded} พ้อยต์`,
      });

      // Reset form
      setVoucherInput('');
      
      // Refresh wallet balance
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
          <Gift className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">เติมเงินด้วยซองอั่งเปา TrueWallet</h2>
          <p className="text-sm text-gray-600">แลกซองและรับพ้อยต์ทันที</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-sm text-orange-800">
            <p className="font-semibold">วิธีใช้งาน:</p>
            <ol className="list-decimal list-inside space-y-1 text-orange-700">
              <li>รับซองอั่งเปา TrueWallet จากเพื่อนหรือโปรโมชั่น</li>
              <li>คัดลอกลิงก์หรือรหัสซอง</li>
              <li>วางในช่องด้านล่างและกดปุ่ม "แลกซองและรับพ้อยต์"</li>
            </ol>
            <p className="text-xs text-orange-600 mt-2">
              💡 <strong>ตัวอย่าง:</strong> https://gift.truemoney.com/campaign/?v=abc123xyz789 หรือแค่ abc123xyz789
            </p>
            <p className="text-xs text-orange-600 mt-1">
              ระบบจะแลกซองอัตโนมัติและเติมเงินทันที (1 บาท = 1 พ้อยต์)
            </p>
          </div>
        </div>
      </div>

      {/* Voucher Input Form */}
      <form onSubmit={handleRedeemVoucher} className="space-y-4">
        <div>
          <Label htmlFor="voucher_input" className="text-gray-700 font-medium">
            ลิงก์ซองหรือรหัสซอง
          </Label>
          
          <Input
            id="voucher_input"
            type="text"
            value={voucherInput}
            onChange={(e) => setVoucherInput(e.target.value)}
            placeholder="วางลิงก์หรือรหัสซองที่นี่..."
            disabled={redeeming}
            className="mt-2 h-12 text-base"
          />

          <p className="text-xs text-gray-500 mt-2">
            คุณสามารถวางลิงก์เต็ม (https://gift.truemoney.com/campaign/?v=...) หรือแค่รหัสซอง (abc123xyz789) ได้
          </p>
        </div>

        <Button
          type="submit"
          disabled={redeeming || !voucherInput.trim()}
          className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {redeeming ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-5 w-5" />
              กำลังแลกซอง...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              แลกซองและรับพ้อยต์
            </span>
          )}
        </Button>
      </form>

      {/* Benefits Box */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-orange-900">✨ ข้อดีของการเติมด้วยซองอั่งเปา:</p>
          <ul className="text-xs text-orange-800 space-y-1 ml-4">
            <li>• ไม่มีค่าธรรมเนียม</li>
            <li>• ได้พ้อยต์ทันที (1 บาท = 1 พ้อยต์)</li>
            <li>• รองรับทุกขนาดของซอง</li>
            <li>• สะดวก ไม่ต้องโอนเงิน</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

