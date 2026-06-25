'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SpinnerCustom } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Save, Eye, EyeOff, Key, Edit, RefreshCw, Wallet, Calendar, Clock } from 'lucide-react';

type ApiKey = {
  id: number;
  key_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type ApiKeyWithValue = ApiKey & {
  key_value: string;
};

export default function ApiKeysContent() {
  const toast = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(false);
  const [formData, setFormData] = useState<{ key_value: string; description: string }>({ key_value: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [currentKeyName, setCurrentKeyName] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, { balance: string; currency?: string; username?: string; rankText?: string; loading?: boolean }>>({});
  const [loadingAllBalances, setLoadingAllBalances] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  // ดึง balance อัตโนมัติเมื่อเข้าหน้า
  useEffect(() => {
    if (apiKeys.length > 0 && !loading) {
      fetchAllBalances();
    }
  }, [apiKeys.length, loading]);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/admin/api-keys');
      const json = await res.json();
      if (json.ok) {
        setApiKeys(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = async (keyName: string) => {
    setCurrentKeyName(keyName);
    setOpenDialog(keyName);
    setShowValue(false);
    
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_name: keyName })
      });
      const json = await res.json();
      if (json.ok && json.data) {
        const data = json.data as ApiKeyWithValue;
        setFormData({
          key_value: data.key_value,
          description: data.description || ''
        });
      }
    } catch (error) {
      console.error('Failed to load API key value', error);
    }
  };

  const closeDialog = () => {
    setOpenDialog(null);
    setCurrentKeyName(null);
    setFormData({ key_value: '', description: '' });
    setShowValue(false);
  };

  const saveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentKeyName) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_name: currentKeyName,
          key_value: formData.key_value,
          description: formData.description || null
        })
      });
      const json = await res.json();
      if (json.ok) {
        closeDialog();
        fetchApiKeys();
        // Clear balance เมื่ออัพเดท API key
        setBalances(prev => {
          const newBalances = { ...prev };
          delete newBalances[currentKeyName];
          return newBalances;
        });
        toast.show({ title: 'สำเร็จ', description: 'บันทึก API Key เรียบร้อยแล้ว' });
      } else {
        toast.show({ 
          title: 'เกิดข้อผิดพลาด', 
          description: json.error || json.detail || 'ไม่ทราบสาเหตุ',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to save API key', error);
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: 'เกิดข้อผิดพลาดในการบันทึก',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchAllBalances = async () => {
    setLoadingAllBalances(true);
    const balanceKeys = apiKeys.filter(key => 
      key.key_name === 'SOCIAL_API_KEY' ||
      key.key_name === 'peamsubapi' ||
      key.key_name === 'OTP24HR_API_KEY' ||
      key.key_name === 'WEPAY_USERNAME'
    );
    
    for (const apiKey of balanceKeys) {
      try {
        const res = await fetch('/api/admin/api-keys/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key_name: apiKey.key_name })
        });
        const json = await res.json();
        if (json.ok) {
          setBalances(prev => ({
            ...prev,
            [apiKey.key_name]: {
              balance: json.data.balance || '0',
              currency: json.data.currency || json.data.balance_used ? 'THB' : undefined,
              username: json.data.username,
              rankText: json.data.rankText,
              loading: false
            }
          }));
        }
      } catch (error) {
        console.error(`Failed to fetch balance for ${apiKey.key_name}`, error);
      }
    }
    setLoadingAllBalances(false);
  };

  const fetchBalance = async (keyName: string) => {
    setBalances(prev => ({ ...prev, [keyName]: { ...prev[keyName], loading: true } }));
    try {
      const res = await fetch('/api/admin/api-keys/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_name: keyName })
      });
      const json = await res.json();
      if (json.ok) {
        setBalances(prev => ({
          ...prev,
          [keyName]: {
            balance: json.data.balance || '0',
            currency: json.data.currency || json.data.balance_used ? 'THB' : undefined,
            username: json.data.username,
            rankText: json.data.rankText,
            loading: false
          }
        }));
        toast.show({ title: 'สำเร็จ', description: 'อัพเดทยอด balance เรียบร้อยแล้ว' });
      } else {
        toast.show({ 
          title: 'เกิดข้อผิดพลาด', 
          description: json.error || json.detail || 'ไม่สามารถดึง balance ได้',
          variant: 'destructive'
        });
        setBalances(prev => ({ ...prev, [keyName]: { ...prev[keyName], loading: false } }));
      }
    } catch (error) {
      console.error('Failed to fetch balance', error);
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: 'เกิดข้อผิดพลาดในการดึง balance',
        variant: 'destructive'
      });
      setBalances(prev => ({ ...prev, [keyName]: { ...prev[keyName], loading: false } }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-emerald-500/20 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const wepayUsernameKey = apiKeys.find((key) => key.key_name === 'WEPAY_USERNAME');
  const wepayPasswordKey = apiKeys.find((key) => key.key_name === 'WEPAY_PASSWORD');
  const displayApiKeys = apiKeys.filter((key) => key.key_name !== 'WEPAY_PASSWORD');

  const balanceKeys = displayApiKeys.filter(key => 
      key.key_name === 'SOCIAL_API_KEY' ||
      key.key_name === 'peamsubapi' ||
      key.key_name === 'OTP24HR_API_KEY' ||
      key.key_name === 'WEPAY_USERNAME'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">ตั้งค่า API Keys</h2>
          <p className="text-sm text-[color:var(--text)]/60">จัดการ API Keys ที่ใช้ในระบบ</p>
        </div>
        {balanceKeys.length > 0 && (
          <Button
            variant="outline"
            onClick={fetchAllBalances}
            disabled={loadingAllBalances}
            className="gap-2 w-full sm:w-auto"
          >
            {loadingAllBalances ? (
              <>
                <SpinnerCustom className="size-4" />
                กำลังอัพเดท...
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                อัพเดทยอด
              </>
            )}
          </Button>
        )}
      </div>

      {displayApiKeys.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/20 bg-card py-16 text-center text-sm text-[color:var(--text)]/60">
          ไม่มี API Keys
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayApiKeys.map((apiKey) => {
            const isOpen = openDialog === apiKey.key_name;
            const isWepayRow = apiKey.key_name === 'WEPAY_USERNAME';
            const displayName = isWepayRow ? 'WEPAY' : apiKey.key_name;
            const canFetchBalance =
              apiKey.key_name === 'SOCIAL_API_KEY' ||
              apiKey.key_name === 'peamsubapi' ||
              apiKey.key_name === 'OTP24HR_API_KEY' ||
              apiKey.key_name === 'WEPAY_USERNAME';
            const balanceInfo = balances[apiKey.key_name];

            return (
              <Card key={apiKey.id} className="bg-card border border-emerald-500/20 hover:border-emerald-500/50 transition-colors flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10">
                        <Key className="size-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[color:var(--text)] truncate" title={displayName}>
                          {displayName}
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs border-green-500/30 text-green-300 bg-green-500/10">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  {apiKey.description ? (
                    <p className="text-sm text-[color:var(--text)]/80">{apiKey.description}</p>
                  ) : (
                    <p className="text-sm text-[color:var(--text)]/40 italic">ไม่มีคำอธิบาย</p>
                  )}

                  {isWepayRow && (
                    <div className="rounded-lg border border-emerald-900/40 bg-emerald-900/5 p-3 text-xs text-[color:var(--text)]/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Username</span>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                          {wepayUsernameKey ? 'ตั้งค่าแล้ว' : 'ยังไม่ตั้งค่า'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>รหัสผ่าน</span>
                        <Badge variant={wepayPasswordKey ? 'secondary' : 'destructive'} className="text-[10px] uppercase tracking-wide">
                          {wepayPasswordKey ? 'ตั้งค่าแล้ว' : 'ยังไม่ตั้งค่า'}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Balance */}
                  <div className="rounded-lg bg-muted/30 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-[color:var(--text)]/60 mb-1">
                      <Wallet className="size-3.5 text-yellow-300" />
                      <span>Balance</span>
                    </div>
                    {canFetchBalance ? (
                      balanceInfo ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-lg text-[color:var(--text)]">
                            {Number(balanceInfo.balance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {balanceInfo.currency && <span className="text-sm text-[color:var(--text)]/60 ml-1">{balanceInfo.currency}</span>}
                          </div>
                          {balanceInfo.username && (
                            <div className="text-xs text-[color:var(--text)]/60">User: {balanceInfo.username}</div>
                          )}
                          {balanceInfo.rankText && (
                            <div className="text-xs text-[color:var(--text)]/60">{balanceInfo.rankText}</div>
                          )}
                          {balanceInfo.loading && <SpinnerCustom className="size-3 mt-1" />}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[color:var(--text)]/40">-</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchBalance(apiKey.key_name)}
                            className="h-6 text-xs gap-1"
                          >
                            <RefreshCw className="size-3" />
                            ดึงยอด
                          </Button>
                        </div>
                      )
                    ) : (
                      <span className="text-sm text-[color:var(--text)]/40">-</span>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-[color:var(--text)]/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3 shrink-0" />
                      <span className="tabular-nums">
                        {new Date(apiKey.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3 shrink-0" />
                      <span className="tabular-nums">
                        {new Date(apiKey.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Dialog open={isOpen} onOpenChange={(open) => {
                      if (open) {
                        openEditDialog(apiKey.key_name);
                      } else {
                        closeDialog();
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 flex-1" type="button">
                          <Edit className="size-4" />
                          แก้ไข
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <form onSubmit={saveApiKey}>
                          <DialogHeader>
                            <DialogTitle>แก้ไข API Key</DialogTitle>
                            <DialogDescription>
                              แก้ไข API Key สำหรับ {apiKey.key_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-3">
                              <Label htmlFor="api-key-value">API Key Value</Label>
                              <div className="relative">
                                <Input
                                  id="api-key-value"
                                  type={showValue ? 'text' : 'password'}
                                  value={formData.key_value}
                                  onChange={(e) =>
                                    setFormData(prev => ({
                                      ...prev,
                                      key_value: e.target.value
                                    }))
                                  }
                                  placeholder="กรอก API Key"
                                  className="pr-10"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowValue(!showValue)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text)]/60 hover:text-[color:var(--text)] transition-colors"
                                >
                                  {showValue ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                              </div>
                            </div>
                            <div className="grid gap-3">
                              <Label htmlFor="api-key-desc">คำอธิบาย (ไม่บังคับ)</Label>
                              <Input
                                id="api-key-desc"
                                type="text"
                                value={formData.description}
                                onChange={(e) =>
                                  setFormData(prev => ({
                                    ...prev,
                                    description: e.target.value
                                  }))
                                }
                                placeholder="คำอธิบาย API Key"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button type="button" variant="outline" disabled={saving}>
                                ยกเลิก
                              </Button>
                            </DialogClose>
                            <Button type="submit" disabled={saving || !formData.key_value} className="gap-2">
                              {saving ? (
                                <>
                                  <SpinnerCustom className="size-4" />
                                  กำลังบันทึก...
                                </>
                              ) : (
                                <>
                                  <Save className="size-4" />
                                  บันทึก
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {isWepayRow && (
                      <Dialog open={openDialog === 'WEPAY_PASSWORD'} onOpenChange={(open) => {
                        if (open) {
                          openEditDialog('WEPAY_PASSWORD');
                        } else {
                          closeDialog();
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 flex-1" type="button">
                            <Edit className="size-4" />
                            รหัสผ่าน
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <form onSubmit={saveApiKey}>
                            <DialogHeader>
                              <DialogTitle>แก้ไข wePAY Password</DialogTitle>
                              <DialogDescription>
                                ตั้งค่า API Key สำหรับ WEPAY_PASSWORD
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-3">
                                <Label htmlFor="api-key-value-password">Password Value</Label>
                                <div className="relative">
                                  <Input
                                    id="api-key-value-password"
                                    type={showValue ? 'text' : 'password'}
                                    value={formData.key_value}
                                    onChange={(e) =>
                                      setFormData(prev => ({
                                        ...prev,
                                        key_value: e.target.value
                                      }))
                                    }
                                    placeholder="กรอก Password"
                                    className="pr-10"
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowValue(!showValue)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text)]/60 hover:text-[color:var(--text)] transition-colors"
                                  >
                                    {showValue ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                  </button>
                                </div>
                              </div>
                              <div className="grid gap-3">
                                <Label htmlFor="api-key-desc-password">คำอธิบาย (ไม่บังคับ)</Label>
                                <Input
                                  id="api-key-desc-password"
                                  type="text"
                                  value={formData.description}
                                  onChange={(e) =>
                                    setFormData(prev => ({
                                      ...prev,
                                      description: e.target.value
                                    }))
                                  }
                                  placeholder="คำอธิบาย API Key"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={saving}>
                                  ยกเลิก
                                </Button>
                              </DialogClose>
                              <Button type="submit" disabled={saving || !formData.key_value} className="gap-2">
                                {saving ? (
                                  <>
                                    <SpinnerCustom className="size-4" />
                                    กำลังบันทึก...
                                  </>
                                ) : (
                                  <>
                                    <Save className="size-4" />
                                    บันทึก
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

