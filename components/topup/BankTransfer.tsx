'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Upload, FileText } from 'lucide-react';

// ข้อมูลบัญชีธนาคาร (ควรดึงจาก database หรือ config)
const BANK_ACCOUNTS = [
  {
    name: 'ธนาคารกรุงเทพ',
    accountName: 'บริษัท ตัวอย่าง จำกัด',
    accountNumber: '123-456-7890',
    branch: 'สาขาหลัก',
  },
  {
    name: 'ธนาคารกสิกรไทย',
    accountName: 'บริษัท ตัวอย่าง จำกัด',
    accountNumber: '987-654-3210',
    branch: 'สาขาหลัก',
  },
];

export default function BankTransfer() {
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState(0);
  const [transferDate, setTransferDate] = useState('');
  const [transferTime, setTransferTime] = useState('');
  const [transferSlip, setTransferSlip] = useState<File | null>(null);
  const [transferRef, setTransferRef] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.show({
          title: 'ไฟล์ใหญ่เกินไป',
          description: 'กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB',
          variant: 'destructive',
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.show({
          title: 'รูปแบบไฟล์ไม่ถูกต้อง',
          description: 'กรุณาอัปโหลดไฟล์รูปภาพ',
          variant: 'destructive',
        });
        return;
      }
      setTransferSlip(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (!transferDate || !transferTime) {
      toast.show({
        title: 'กรุณาระบุวันเวลาที่โอน',
        description: 'โปรดระบุวันที่และเวลาที่ทำการโอนเงิน',
        variant: 'destructive',
      });
      return;
    }

    if (!transferSlip) {
      toast.show({
        title: 'กรุณาอัปโหลดสลิปการโอน',
        description: 'โปรดอัปโหลดสลิปการโอนเงิน',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      // สร้าง FormData สำหรับส่งไฟล์
      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('bank_index', selectedBank.toString());
      formData.append('transfer_date', transferDate);
      formData.append('transfer_time', transferTime);
      formData.append('transfer_ref', transferRef);
      formData.append('transfer_slip', transferSlip);

      const res = await fetch('/api/wallet/bank-transfer', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.message || json.error || 'ส่งคำขอเติมพอยต์ไม่สำเร็จ');
      }

      toast.show({
        title: 'ส่งคำขอสำเร็จ',
        description: 'ระบบกำลังตรวจสอบการโอนเงินของคุณ จะแจ้งเตือนเมื่อได้รับการอนุมัติ',
      });

      // Reset form
      setAmount('');
      setTransferDate('');
      setTransferTime('');
      setTransferSlip(null);
      setTransferRef('');
      
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

  const bank = BANK_ACCOUNTS[selectedBank];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Building2 className="size-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--text)]">โอนเงินผ่านธนาคาร</h2>
          <p className="text-sm text-[color:var(--text)]/60">โอนเงินเข้าบัญชีธนาคารและอัปโหลดสลิป</p>
        </div>
      </div>

      {/* Bank Account Info */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-emerald-300 font-semibold">บัญชีรับโอน</Label>
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(parseInt(e.target.value, 10))}
            className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm text-[color:var(--text)]"
          >
            {BANK_ACCOUNTS.map((b, idx) => (
              <option key={idx} value={idx} className="bg-black">
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[color:var(--text)]/60">ธนาคาร:</span>
            <span className="text-[color:var(--text)] font-medium">{bank.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[color:var(--text)]/60">ชื่อบัญชี:</span>
            <span className="text-[color:var(--text)] font-medium">{bank.accountName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[color:var(--text)]/60">เลขที่บัญชี:</span>
            <span className="text-[color:var(--text)] font-mono font-medium">{bank.accountNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[color:var(--text)]/60">สาขา:</span>
            <span className="text-[color:var(--text)] font-medium">{bank.branch}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="amount" className="text-[color:var(--text)]/90">
            จำนวนเงินที่โอน (บาท)
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
            className="h-12 text-lg mt-2"
          />
          <p className="text-xs text-[color:var(--text)]/50 mt-1">จำนวนเงินที่คุณโอนเข้าบัญชี</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="transfer_date" className="text-[color:var(--text)]/90">
              วันที่โอน
            </Label>
            <Input
              id="transfer_date"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              disabled={loading}
              max={new Date().toISOString().split('T')[0]}
              className="h-12 mt-2"
            />
          </div>
          <div>
            <Label htmlFor="transfer_time" className="text-[color:var(--text)]/90">
              เวลาที่โอน
            </Label>
            <Input
              id="transfer_time"
              type="time"
              value={transferTime}
              onChange={(e) => setTransferTime(e.target.value)}
              disabled={loading}
              className="h-12 mt-2"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="transfer_ref" className="text-[color:var(--text)]/90">
            เลขที่อ้างอิง (ถ้ามี)
          </Label>
          <Input
            id="transfer_ref"
            type="text"
            placeholder="เช่น REF123456789"
            value={transferRef}
            onChange={(e) => setTransferRef(e.target.value)}
            disabled={loading}
            className="h-12 mt-2"
          />
          <p className="text-xs text-[color:var(--text)]/50 mt-1">เลขที่อ้างอิงจากการโอน (ไม่จำเป็น)</p>
        </div>

        <div>
          <Label htmlFor="transfer_slip" className="text-[color:var(--text)]/90">
            อัปโหลดสลิปการโอน
          </Label>
          <div className="mt-2">
            <label
              htmlFor="transfer_slip"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 hover:border-white/30 transition-colors"
            >
              {transferSlip ? (
                <div className="flex flex-col items-center gap-2 p-4">
                  <FileText className="size-8 text-emerald-400" />
                  <span className="text-sm text-[color:var(--text)] font-medium">{transferSlip.name}</span>
                  <span className="text-xs text-[color:var(--text)]/60">{(transferSlip.size / 1024).toFixed(1)} KB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 p-4">
                  <Upload className="size-8 text-[color:var(--text)]/40" />
                  <span className="text-sm text-[color:var(--text)]/60">คลิกเพื่ออัปโหลดสลิป</span>
                  <span className="text-xs text-[color:var(--text)]/40">รองรับไฟล์รูปภาพขนาดไม่เกิน 5 MB</span>
                </div>
              )}
              <input
                id="transfer_slip"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !amount || !transferDate || !transferTime || !transferSlip}
          className="w-full h-11"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              กำลังส่งคำขอ...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Building2 className="size-4" />
              ส่งคำขอเติมพอยต์
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}

