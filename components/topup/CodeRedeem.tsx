'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Gift } from 'lucide-react';

export default function CodeRedeem() {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.show({
        title: 'กรุณาใส่โค้ด',
        description: 'โปรดใส่โค้ดเติมพอยต์',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/wallet/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || 'ใช้โค้ดไม่สำเร็จ');
      }
      setMsg(json.message || `รับพอยต์ ${json.points?.toFixed(2) || 0} สำเร็จ!`);
      setCode('');
      window.dispatchEvent(new CustomEvent('wallet:changed'));
      toast.show({
        title: 'สำเร็จ',
        description: json.message || `รับพอยต์ ${json.points?.toFixed(2) || 0} สำเร็จ!`,
      });
    } catch (e: unknown) {
      const errorMsg = (e as Error).message;
      setMsg(errorMsg);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Gift className="size-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--text)]">ใช้โค้ดเติมพอยต์</h2>
          <p className="text-sm text-[color:var(--text)]/60">ใส่โค้ดเติมพอยต์ของคุณเพื่อรับพอยต์เข้าบัญชี</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-[color:var(--text)]/90 mb-2">
            โค้ดเติมพอยต์
          </label>
          <Input
            id="code"
            type="text"
            placeholder="XXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={loading}
            className="text-lg font-mono [&::placeholder]:!font-sans h-12"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full h-11"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              กำลังเติมพอยต์...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Gift className="size-4" />
              ใช้โค้ด
            </span>
          )}
        </Button>
      </form>

      {msg && (
        <div className={`p-4 rounded-lg text-sm border ${
          msg.includes('สำเร็จ') 
            ? 'bg-green-500/10 border-green-500/20 text-green-300' 
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          {msg}
        </div>
      )}
    </div>
  );
}

