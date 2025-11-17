'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Save, Plus, Trash2, Edit, Globe, Key, CheckCircle2, XCircle, TrendingUp, Package, ShoppingCart, DollarSign, Wallet } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface SocialProvider {
  id: number;
  name: string;
  api_url: string;
  api_key_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  api_key_exists?: boolean; // ตรวจสอบว่ามี API key หรือไม่
  balance?: number | null; // Balance จาก provider
  balance_currency?: string; // Currency ของ balance (USD, THB, etc.)
  balance_loading?: boolean; // กำลังโหลด balance
}

interface Stats {
  providers: {
    total: number;
    active: number;
    inactive: number;
  };
  services: {
    total: number;
    published: number;
    unpublished: number;
  };
  orders: {
    total: number;
    byStatus: {
      processing: number;
      completed: number;
      cancelled: number;
      partial: number;
      other: number;
    };
  };
  revenue: {
    total: number;
  };
  providerStats: Record<number, { total: number; published: number }>;
}

export default function SocialProvidersContent() {
  const toast = useToast();
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SocialProvider | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    api_url: '',
    api_key_name: '',
    api_key_value: '', // เพิ่มฟิลด์ API key value
    is_active: true
  });

  useEffect(() => {
    fetchProviders();
    fetchStats();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/admin/social/providers');
      const json = await res.json();
      if (json.ok) {
        // ตรวจสอบ API key และดึง balance สำหรับแต่ละ provider
        const providersWithKeys = await Promise.all(
          (json.data || []).map(async (provider: SocialProvider) => {
            try {
              const keyRes = await fetch(`/api/admin/api-keys?key_name=${encodeURIComponent(provider.api_key_name)}`);
              const keyJson = await keyRes.json();
              return {
                ...provider,
                api_key_exists: keyJson.ok && keyJson.data !== null,
                balance: null,
                balance_currency: 'THB',
                balance_loading: false
              };
            } catch {
              return { ...provider, api_key_exists: false, balance: null, balance_currency: 'THB', balance_loading: false };
            }
          })
        );
        setProviders(providersWithKeys);
        // ดึง balance สำหรับทุก provider
        fetchAllBalances(providersWithKeys);
      }
    } catch (error) {
      console.error('Failed to fetch providers', error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถดึงข้อมูล providers ได้', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBalances = async (providersList: SocialProvider[]) => {
    // ดึง balance สำหรับทุก provider ที่มี API key และเปิดใช้งาน
    const activeProviders = providersList.filter((p) => p.is_active && p.api_key_exists);
    
    for (const provider of activeProviders) {
      setProviders((prev) => prev.map((p) => 
        p.id === provider.id ? { ...p, balance_loading: true } : p
      ));

      try {
        const balanceRes = await fetch(`/api/admin/social/providers/balance?provider_id=${provider.id}`);
        const balanceJson = await balanceRes.json();
        
        setProviders((prev) => prev.map((p) => 
          p.id === provider.id 
            ? { 
                ...p, 
                balance: balanceJson.ok ? balanceJson.balance : null,
                balance_currency: balanceJson.ok ? (balanceJson.currency || 'THB') : 'THB',
                balance_loading: false 
              }
            : p
        ));
      } catch (error) {
        console.error(`Failed to fetch balance for provider ${provider.id}:`, error);
        setProviders((prev) => prev.map((p) => 
          p.id === provider.id ? { ...p, balance: null, balance_currency: 'THB', balance_loading: false } : p
        ));
      }
    }
  };

  const handleRefreshBalance = async (providerId: number) => {
    setProviders((prev) => prev.map((p) => 
      p.id === providerId ? { ...p, balance_loading: true } : p
    ));

    try {
      const balanceRes = await fetch(`/api/admin/social/providers/balance?provider_id=${providerId}`);
      const balanceJson = await balanceRes.json();
      
      if (balanceJson.ok) {
        setProviders((prev) => prev.map((p) => 
          p.id === providerId 
            ? { 
                ...p, 
                balance: balanceJson.balance,
                balance_currency: balanceJson.currency || 'THB',
                balance_loading: false 
              }
            : p
        ));
        toast.show({ title: 'สำเร็จ', description: 'อัพเดท balance เรียบร้อย' });
      } else {
        setProviders((prev) => prev.map((p) => 
          p.id === providerId ? { ...p, balance: null, balance_currency: 'THB', balance_loading: false } : p
        ));
        toast.show({ title: 'เกิดข้อผิดพลาด', description: balanceJson.detail || 'ไม่สามารถดึง balance ได้', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Refresh balance error:', error);
      setProviders((prev) => prev.map((p) => 
        p.id === providerId ? { ...p, balance: null, balance_currency: 'THB', balance_loading: false } : p
      ));
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถดึง balance ได้', variant: 'destructive' });
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/social/providers/stats');
      const json = await res.json();
      if (json.ok) {
        setStats(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSync = async (providerId: number) => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/social/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId })
      });
      const json = await res.json();
      if (json.ok) {
        toast.show({ title: 'สำเร็จ', description: `ซิงค์ข้อมูลจาก ${providers.find(p => p.id === providerId)?.name} เรียบร้อย` });
        await fetchStats(); // Refresh stats
      } else {
        toast.show({ title: 'เกิดข้อผิดพลาด', description: json.detail || 'ไม่สามารถซิงค์ได้', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถซิงค์ได้', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    const activeProviders = providers.filter(p => p.is_active && p.api_key_exists);
    if (activeProviders.length === 0) {
      toast.show({ title: 'ไม่พบ Provider', description: 'ไม่มี provider ที่เปิดใช้งานและมี API key', variant: 'destructive' });
      return;
    }

    setSyncingAll(true);

    try {
      // ซิงค์ทุก provider พร้อมกัน
      const syncPromises = activeProviders.map(async (provider) => {
        try {
          const res = await fetch('/api/admin/social/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider_id: provider.id })
          });
          const json = await res.json();
          if (json.ok) {
            return { success: true, provider: provider.name };
          } else {
            return { success: false, provider: provider.name, error: json.detail };
          }
        } catch (error) {
          return { success: false, provider: provider.name, error: 'Network error' };
        }
      });

      const results = await Promise.all(syncPromises);
      
      // นับผลลัพธ์
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      // แสดงผลลัพธ์
      if (successCount === activeProviders.length) {
        toast.show({ title: 'สำเร็จ', description: `ซิงค์ข้อมูลจาก ${successCount} providers เรียบร้อยทั้งหมด` });
      } else if (successCount > 0) {
        toast.show({ 
          title: 'สำเร็จบางส่วน', 
          description: `ซิงค์สำเร็จ ${successCount} providers, ล้มเหลว ${failCount} providers`,
          variant: 'default'
        });
      } else {
        toast.show({ 
          title: 'เกิดข้อผิดพลาด', 
          description: `ไม่สามารถซิงค์ได้จาก ${failCount} providers`,
          variant: 'destructive' 
        });
      }

      await fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Sync all error:', error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถซิงค์ได้', variant: 'destructive' });
    } finally {
      setSyncingAll(false);
    }
  };

  const handleOpenDialog = async (provider?: SocialProvider) => {
    if (provider) {
      setEditingProvider(provider);
      
      // ดึง API key value (ถ้ามี)
      let apiKeyValue = '';
      try {
        const keyRes = await fetch('/api/admin/api-keys', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key_name: provider.api_key_name })
        });
        const keyJson = await keyRes.json();
        if (keyJson.ok && keyJson.data) {
          apiKeyValue = keyJson.data.key_value || '';
        }
      } catch {
        // ไม่พบ API key
      }
      
      setFormData({
        name: provider.name,
        api_url: provider.api_url,
        api_key_name: provider.api_key_name,
        api_key_value: apiKeyValue,
        is_active: provider.is_active
      });
    } else {
      setEditingProvider(null);
      setFormData({
        name: '',
        api_url: '',
        api_key_name: '',
        api_key_value: '',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.api_url || !formData.api_key_name) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'กรุณากรอกข้อมูลให้ครบถ้วน', variant: 'destructive' });
      return;
    }

    try {
      // บันทึก API key (ถ้ามีค่า)
      if (formData.api_key_value && formData.api_key_value.trim()) {
        const keyRes = await fetch('/api/admin/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key_name: formData.api_key_name,
            key_value: formData.api_key_value.trim(),
            description: `API key for ${formData.name} provider`
          })
        });
        
        if (!keyRes.ok) {
          const keyJson = await keyRes.json();
          toast.show({ 
            title: 'เกิดข้อผิดพลาด', 
            description: keyJson.detail || 'ไม่สามารถบันทึก API key ได้', 
            variant: 'destructive' 
          });
          return;
        }
      }

      // บันทึก provider
      const url = editingProvider 
        ? `/api/admin/social/providers/${editingProvider.id}`
        : '/api/admin/social/providers';
      
      const method = editingProvider ? 'PUT' : 'POST';
      
      const { api_key_value, ...providerData } = formData; // ไม่ส่ง api_key_value ไปกับ provider
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerData)
      });

      const json = await res.json();
      if (json.ok) {
        toast.show({ title: 'สำเร็จ', description: editingProvider ? 'อัพเดท provider เรียบร้อย' : 'เพิ่ม provider เรียบร้อย' });
        setIsDialogOpen(false);
        await Promise.all([fetchProviders(), fetchStats()]); // Refresh ทั้ง providers และ stats
      } else {
        toast.show({ title: 'เกิดข้อผิดพลาด', description: json.detail || 'ไม่สามารถบันทึกได้', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกได้', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบ provider นี้?')) return;

    try {
      const res = await fetch(`/api/admin/social/providers/${id}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (json.ok) {
        toast.show({ title: 'สำเร็จ', description: 'ลบ provider เรียบร้อย' });
        await Promise.all([fetchProviders(), fetchStats()]); // Refresh ทั้ง providers และ stats
      } else {
        toast.show({ title: 'เกิดข้อผิดพลาด', description: json.detail || 'ไม่สามารถลบได้', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบได้', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (provider: SocialProvider) => {
    try {
      const res = await fetch(`/api/admin/social/providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...provider, is_active: !provider.is_active })
      });

      const json = await res.json();
      if (json.ok) {
        await fetchProviders();
      } else {
        toast.show({ title: 'เกิดข้อผิดพลาด', description: json.detail || 'ไม่สามารถอัพเดทได้', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถอัพเดทได้', variant: 'destructive' });
    }
  };


  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">จัดการ API Providers</h2>
          <p className="text-gray-400 mt-1">จัดการ API providers สำหรับปั๊มโซเชียล</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSyncAll} 
            disabled={syncingAll || syncing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${syncingAll ? 'animate-spin' : ''}`} />
            ซิงค์ทั้งหมด
          </Button>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="size-4" />
            เพิ่ม Provider
          </Button>
        </div>
      </div>

      {/* สรุป Balance */}
      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Providers ทั้งหมด</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.providers.total}</p>
                <p className="text-xs text-emerald-400 mt-1">
                  เปิดใช้งาน {stats.providers.active} | ปิด {stats.providers.inactive}
                </p>
              </div>
              <div className="p-3 bg-emerald-600/20 rounded-lg">
                <Globe className="size-6 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Services ทั้งหมด</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.services.total}</p>
                <p className="text-xs text-emerald-400 mt-1">
                  เปิดขาย {stats.services.published} | ปิด {stats.services.unpublished}
                </p>
              </div>
              <div className="p-3 bg-blue-600/20 rounded-lg">
                <Package className="size-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Orders ทั้งหมด</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.orders.total}</p>
                <p className="text-xs text-gray-400 mt-1">
                  สำเร็จ {stats.orders.byStatus.completed} | กำลังดำเนินการ {stats.orders.byStatus.processing}
                </p>
              </div>
              <div className="p-3 bg-purple-600/20 rounded-lg">
                <ShoppingCart className="size-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">รายได้รวม</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {new Intl.NumberFormat('th-TH', { 
                    style: 'currency', 
                    currency: 'THB',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(stats.revenue.total)}
                </p>
                <p className="text-xs text-emerald-400 mt-1">
                  จาก {stats.orders.total} orders
                </p>
              </div>
              <div className="p-3 bg-yellow-600/20 rounded-lg">
                <DollarSign className="size-6 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800/50">
                <TableHead className="text-white">ชื่อ</TableHead>
                <TableHead className="text-white">API URL</TableHead>
                <TableHead className="text-white">API Key Name</TableHead>
                <TableHead className="text-white text-center">API Key</TableHead>
                <TableHead className="text-white text-center">Balance</TableHead>
                <TableHead className="text-white text-center">สถานะ</TableHead>
                <TableHead className="text-white text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow className="border-gray-800/30">
                  <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                    ยังไม่มี providers
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                    <TableRow key={provider.id} className="border-gray-800/30">
                      <TableCell className="font-medium text-white">{provider.name}</TableCell>
                      <TableCell className="text-gray-300 text-sm">{provider.api_url}</TableCell>
                      <TableCell className="text-gray-300 text-sm">{provider.api_key_name}</TableCell>
                      <TableCell className="text-center">
                        {provider.api_key_exists ? (
                          <Badge className="bg-emerald-600 gap-1">
                            <CheckCircle2 className="size-3" />
                            ตั้งค่าแล้ว
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400 gap-1">
                            <XCircle className="size-3" />
                            ยังไม่ตั้งค่า
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {provider.balance_loading ? (
                          <Spinner className="size-4 mx-auto" />
                        ) : provider.balance !== null && provider.balance !== undefined ? (
                          <div className="flex items-center justify-center gap-2">
                            <Wallet className="size-4 text-emerald-400" />
                            <span className="font-mono font-semibold text-emerald-400">
                              {new Intl.NumberFormat('th-TH', {
                                style: 'currency',
                                currency: provider.balance_currency || 'THB',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(provider.balance)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRefreshBalance(provider.id)}
                              className="h-6 w-6 p-0"
                              title="รีเฟรช balance"
                            >
                              <RefreshCw className="size-3" />
                            </Button>
                          </div>
                        ) : provider.is_active && provider.api_key_exists ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-gray-400 text-sm">-</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRefreshBalance(provider.id)}
                              className="h-6 w-6 p-0"
                              title="ดึง balance"
                            >
                              <RefreshCw className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={provider.is_active ? "default" : "secondary"}
                          className={provider.is_active ? "bg-emerald-600" : "bg-gray-600"}
                        >
                          {provider.is_active ? (
                            <>
                              <CheckCircle2 className="size-3 mr-1" />
                              เปิดใช้งาน
                            </>
                          ) : (
                            <>
                              <XCircle className="size-3 mr-1" />
                              ปิดใช้งาน
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSync(provider.id)}
                            disabled={syncing || syncingAll}
                            className="gap-1"
                          >
                            <RefreshCw className={`size-3 ${syncing ? 'animate-spin' : ''}`} />
                            ซิงค์
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(provider)}
                            className="gap-1"
                          >
                            <Edit className="size-3" />
                            แก้ไข
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(provider.id)}
                            className="gap-1 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'แก้ไข Provider' : 'เพิ่ม Provider ใหม่'}</DialogTitle>
            <DialogDescription>
              {editingProvider ? 'แก้ไขข้อมูล API provider' : 'เพิ่ม API provider ใหม่สำหรับปั๊มโซเชียล'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ Provider *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น SocialPanel24, SMMFollows"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_url">API URL *</Label>
              <Input
                id="api_url"
                value={formData.api_url}
                onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                placeholder="https://socialpanel24.com/api/v2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_key_name">API Key Name *</Label>
              <Input
                id="api_key_name"
                value={formData.api_key_name}
                onChange={(e) => setFormData({ ...formData, api_key_name: e.target.value })}
                placeholder="SOCIAL_API_KEY"
              />
              <p className="text-xs text-gray-400">ชื่อที่ใช้เก็บ API key ในระบบ</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_key_value">API Key Value</Label>
              <Input
                id="api_key_value"
                type="password"
                value={formData.api_key_value}
                onChange={(e) => setFormData({ ...formData, api_key_value: e.target.value })}
                placeholder="กรอก API key ของ provider"
              />
              <p className="text-xs text-gray-400">
                {editingProvider 
                  ? 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน API key' 
                  : 'กรอก API key ที่ได้รับจาก provider'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">เปิดใช้งาน</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="size-4" />
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

