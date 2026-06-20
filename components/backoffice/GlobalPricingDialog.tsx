'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';

type Props = {
  trigger?: React.ReactNode;
};

export default function GlobalPricingDialog({ trigger }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [percent, setPercent] = useState('0');
  const [fixed, setFixed] = useState('0');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/global-markup')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setPercent(String(data?.percent ?? 0));
        setFixed(String(data?.fixed ?? 0));
      })
      .catch(() => {
        if (cancelled) return;
        toast.show({ title: 'โหลดข้อมูลไม่สำเร็จ', variant: 'destructive' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const handleSave = async () => {
    const pct = Number(percent);
    const fix = Number(fixed);
    if (!Number.isFinite(pct) || !Number.isFinite(fix)) {
      toast.show({ title: 'กรอกตัวเลขไม่ถูกต้อง', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/global-markup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percent: pct, fixed: fix }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || j.error || 'บันทึกไม่สำเร็จ');
      }
      toast.show({ title: 'บันทึกเรียบร้อย', description: 'ปรับ markup ทั่วเว็บแล้ว' });
      setOpen(false);
    } catch (e) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-2 text-xs rounded border border-border hover:bg-muted/50"
          >
            ควบคุมราคา (ทั้งเว็บ)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ควบคุมราคา (ทั้งเว็บไซต์)</DialogTitle>
          <DialogDescription>
            กำหนด markup ที่บวกเพิ่มทุกบริการของเว็บ
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="global-percent">เพิ่ม % ทั่วเว็บ</Label>
              <Input
                id="global-percent"
                type="number"
                step="0.01"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="global-fixed">+ บาท ทั่วเว็บ</Label>
              <Input
                id="global-fixed"
                type="number"
                step="0.01"
                value={fixed}
                onChange={(e) => setFixed(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              สูตรราคาขาย = (ต้นทุน + item.fixed + item.%) + global fixed + global %
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Spinner className="size-4 mr-2" /> : null}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
