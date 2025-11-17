'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SpinnerCustom } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Save, Eye, EyeOff, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SlipVerificationSettings } from '@/lib/types/slip';

export default function SlipVerificationSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [settings, setSettings] = useState<SlipVerificationSettings | null>(null);
  const [formData, setFormData] = useState({
    rdcw_client_id: '',
    rdcw_client_secret: '',
    rdcw_endpoint: 'https://suba.rdcw.co.th/v2/inquiry',
    minimum_topup_amount: 49,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/slip-settings');
      const json = await res.json();
      if (json.ok && json.data) {
        const data = json.data as SlipVerificationSettings;
        setSettings(data);
        setFormData({
          rdcw_client_id: data.rdcw_client_id || '',
          rdcw_client_secret: data.rdcw_client_secret || '',
          rdcw_endpoint: data.rdcw_endpoint || 'https://suba.rdcw.co.th/v2/inquiry',
          minimum_topup_amount: Number(data.minimum_topup_amount) || 49,
        });
      }
    } catch (error) {
      console.error('Failed to fetch slip settings', error);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงข้อมูลการตั้งค่าได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/slip-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rdcw_client_id: formData.rdcw_client_id || null,
          rdcw_client_secret: formData.rdcw_client_secret || null,
          rdcw_endpoint: formData.rdcw_endpoint || 'https://suba.rdcw.co.th/v2/inquiry',
          minimum_topup_amount: Number(formData.minimum_topup_amount) || 49,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        toast.show({
          title: 'สำเร็จ',
          description: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
        });
        fetchSettings();
      } else {
        toast.show({
          title: 'เกิดข้อผิดพลาด',
          description: json.error || json.detail || 'ไม่ทราบสาเหตุ',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save slip settings', error);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'เกิดข้อผิดพลาดในการบันทึก',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = settings && 
    settings.rdcw_client_id && 
    settings.rdcw_client_secret && 
    settings.rdcw_endpoint;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">ตั้งค่าสลิปโอนเงิน</h2>
          <p className="text-sm text-[color:var(--text)]/60">ตั้งค่า RDCW API สำหรับตรวจสอบสลิปโอนเงิน</p>
        </div>
        {isConfigured && (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="size-5" />
            <span className="text-sm font-medium">ตั้งค่าเรียบร้อย</span>
          </div>
        )}
        {!isConfigured && (
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertCircle className="size-5" />
            <span className="text-sm font-medium">ยังไม่ได้ตั้งค่า</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-accent" />
            <CardTitle>การตั้งค่า RDCW API</CardTitle>
          </div>
          <CardDescription>
            ตั้งค่า API credentials สำหรับเชื่อมต่อกับ RDCW API เพื่อตรวจสอบสลิปโอนเงิน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="rdcw_endpoint" className="text-[color:var(--text)] font-medium">
                  RDCW API Endpoint
                </Label>
                <Input
                  id="rdcw_endpoint"
                  type="url"
                  value={formData.rdcw_endpoint}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, rdcw_endpoint: e.target.value }))
                  }
                  placeholder="https://suba.rdcw.co.th/v2/inquiry"
                  className="mt-2"
                  required
                />
                <p className="text-xs text-[color:var(--text)]/60 mt-1">
                  URL endpoint ของ RDCW API
                </p>
              </div>

              <div>
                <Label htmlFor="rdcw_client_id" className="text-[color:var(--text)] font-medium">
                  RDCW Client ID
                </Label>
                <Input
                  id="rdcw_client_id"
                  type="text"
                  value={formData.rdcw_client_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, rdcw_client_id: e.target.value }))
                  }
                  placeholder="กรอก RDCW Client ID"
                  className="mt-2"
                />
                <p className="text-xs text-[color:var(--text)]/60 mt-1">
                  Client ID สำหรับการยืนยันตัวตนกับ RDCW API
                </p>
              </div>

              <div>
                <Label htmlFor="rdcw_client_secret" className="text-[color:var(--text)] font-medium">
                  RDCW Client Secret
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="rdcw_client_secret"
                    type={showClientSecret ? 'text' : 'password'}
                    value={formData.rdcw_client_secret}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, rdcw_client_secret: e.target.value }))
                    }
                    placeholder="กรอก RDCW Client Secret"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text)]/60 hover:text-[color:var(--text)] transition-colors"
                  >
                    {showClientSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-xs text-[color:var(--text)]/60 mt-1">
                  Client Secret สำหรับการยืนยันตัวตนกับ RDCW API
                </p>
              </div>

              <div>
                <Label htmlFor="minimum_topup_amount" className="text-[color:var(--text)] font-medium">
                  จำนวนเงินขั้นต่ำ (บาท)
                </Label>
                <Input
                  id="minimum_topup_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minimum_topup_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, minimum_topup_amount: parseFloat(e.target.value) || 0 }))
                  }
                  className="mt-2"
                  required
                />
                <p className="text-xs text-[color:var(--text)]/60 mt-1">
                  จำนวนเงินขั้นต่ำที่ต้องโอนเพื่อเติมเงิน (1 บาท = 1 พ้อยต์)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <SpinnerCustom className="size-4" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    บันทึกการตั้งค่า
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ข้อมูลการตั้งค่า</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[color:var(--text)]/60">สร้างเมื่อ:</span>
                <span className="text-[color:var(--text)]">
                  {settings.created_at
                    ? new Date(settings.created_at).toLocaleString('th-TH')
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--text)]/60">อัพเดทล่าสุด:</span>
                <span className="text-[color:var(--text)]">
                  {settings.updated_at
                    ? new Date(settings.updated_at).toLocaleString('th-TH')
                    : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

