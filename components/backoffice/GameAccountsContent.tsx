'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SpinnerCustom } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Save, Edit, Trash2, Plus, Gamepad2, Package, Image, ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type GameAccount = {
  id: number;
  game_name: string;
  game_category_id: number | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  banner_image_url: string | null;
  additional_images: string[];
  username: string;
  password: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  stock: number;
  is_published: boolean;
  sold_at: string | null;
  purchased_order_id: number | null;
  created_at: string;
  updated_at: string;
  game_categories: { id: number; name: string; slug: string } | null;
};

type GameCategory = {
  id: number;
  name: string;
  slug: string;
  is_published: boolean;
};

export default function GameAccountsContent() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<GameAccount[]>([]);
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [permissions, setPermissions] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState<'create' | 'edit' | null>(null);
  const [currentAccount, setCurrentAccount] = useState<GameAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    game_name: '',
    game_category_id: '',
    title: '',
    description: '',
    cover_image_url: '',
    banner_image_url: '',
    additional_images: '',
    accounts_text: '', // Text format: user1:pass1\nuser2:pass2
    price: '',
    original_price: '',
    discount_percent: '',
    permission_id: '',
    stock: '1',
    is_published: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedAccountForPrice, setSelectedAccountForPrice] = useState<GameAccount | null>(null);
  const [accountPrices, setAccountPrices] = useState<Array<{ id: number; permission_id: number; price: number; permission?: { id: number; name: string } }>>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [newPriceForm, setNewPriceForm] = useState({ permission_id: '', price: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountsRes, categoriesRes, permissionsRes] = await Promise.all([
        fetch('/api/admin/game-accounts'),
        fetch('/api/admin/game-categories'),
        fetch('/api/admin/permissions')
      ]);

      if (!accountsRes.ok) throw new Error('ไม่สามารถโหลดไอดีเกมได้');
      if (!categoriesRes.ok) throw new Error('ไม่สามารถโหลดหมวดหมู่ได้');

      const accountsJson = await accountsRes.json();
      const categoriesJson = await categoriesRes.json();
      const permissionsJson = permissionsRes.ok ? await permissionsRes.json() : { data: [] };

      setAccounts(accountsJson.data || []);
      setCategories(categoriesJson.data || []);
      setPermissions(permissionsJson.data || []);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setCurrentAccount(null);
    setFormData({
      game_name: '',
      game_category_id: '',
      title: '',
      description: '',
      cover_image_url: '',
      banner_image_url: '',
      additional_images: '',
      accounts_text: '',
      price: '',
      original_price: '',
      discount_percent: '',
      permission_id: '',
      stock: '1',
      is_published: false
    });
    setOpenDialog('create');
  };

  const openEditDialog = (account: GameAccount) => {
    setCurrentAccount(account);
    setFormData({
      game_name: account.game_name,
      game_category_id: account.game_category_id?.toString() || '',
      title: account.title.split(' #')[0], // Remove # suffix
      description: account.description || '',
      cover_image_url: account.cover_image_url || '',
      banner_image_url: account.banner_image_url || '',
      additional_images: (account.additional_images || []).join('\n'),
      accounts_text: `${account.username}:${account.password}`,
      price: account.price.toString(),
      original_price: account.original_price?.toString() || '',
      discount_percent: account.discount_percent?.toString() || '',
      permission_id: (account as any).permission_id?.toString() || '',
      stock: account.stock.toString(),
      is_published: account.is_published
    });
    setOpenDialog('edit');
  };

  const closeDialog = () => {
    setOpenDialog(null);
    setCurrentAccount(null);
  };

  const openPriceDialog = async (account: GameAccount) => {
    setSelectedAccountForPrice(account);
    setPriceDialogOpen(true);
    setNewPriceForm({ permission_id: '', price: '' });
    await fetchAccountPrices(account.id);
  };

  const closePriceDialog = () => {
    setPriceDialogOpen(false);
    setSelectedAccountForPrice(null);
    setAccountPrices([]);
  };

  const fetchAccountPrices = async (accountId: number) => {
    setLoadingPrices(true);
    try {
      const res = await fetch(`/api/admin/game-accounts/${accountId}/prices`);
      if (!res.ok) throw new Error('ไม่สามารถโหลดราคาได้');
      const json = await res.json();
      setAccountPrices(json.data || []);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleAddPrice = async () => {
    if (!selectedAccountForPrice) return;
    
    if (!newPriceForm.permission_id || !newPriceForm.price) {
      toast.show({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        description: 'กรุณาเลือกสิทธิ์และกรอกราคา',
        variant: 'destructive'
      });
      return;
    }

    const priceNum = parseFloat(newPriceForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.show({
        title: 'ราคาไม่ถูกต้อง',
        description: 'ราคาต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive'
      });
      return;
    }

    try {
      const res = await fetch(`/api/admin/game-accounts/${selectedAccountForPrice.id}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission_id: parseInt(newPriceForm.permission_id),
          price: priceNum
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'ไม่สามารถเพิ่มราคาได้');
      }

      toast.show({ title: 'สำเร็จ', description: 'เพิ่มราคาเรียบร้อย' });
      setNewPriceForm({ permission_id: '', price: '' });
      await fetchAccountPrices(selectedAccountForPrice.id);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    }
  };

  const handleUpdatePrice = async (priceId: number, newPrice: number) => {
    if (!selectedAccountForPrice) return;

    try {
      const res = await fetch(`/api/admin/game-accounts/${selectedAccountForPrice.id}/prices/${priceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'ไม่สามารถอัปเดตราคาได้');
      }

      toast.show({ title: 'สำเร็จ', description: 'อัปเดตราคาเรียบร้อย' });
      await fetchAccountPrices(selectedAccountForPrice.id);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    }
  };

  const handleDeletePrice = async (priceId: number) => {
    if (!selectedAccountForPrice) return;

    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบราคานี้?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/game-accounts/${selectedAccountForPrice.id}/prices/${priceId}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'ไม่สามารถลบราคาได้');
      }

      toast.show({ title: 'สำเร็จ', description: 'ลบราคาเรียบร้อย' });
      await fetchAccountPrices(selectedAccountForPrice.id);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse accounts from text format (user:pass per line)
    const accountsText = formData.accounts_text.trim();
    if (!accountsText) {
      toast.show({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        description: 'กรุณากรอก username:password อย่างน้อย 1 ชุด',
        variant: 'destructive'
      });
      return;
    }

    const accounts = accountsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(':');
        if (parts.length !== 2) {
          throw new Error(`รูปแบบไม่ถูกต้อง: "${line}" ต้องเป็นรูปแบบ username:password`);
        }
        return {
          username: parts[0].trim(),
          password: parts[1].trim()
        };
      });

    // Validate accounts
    const validAccounts = accounts.filter(acc => acc.username && acc.password);
    if (validAccounts.length === 0) {
      toast.show({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        description: 'กรุณากรอก username และ password อย่างน้อย 1 ชุด',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.game_name || !formData.title || !formData.price) {
      toast.show({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        description: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const priceNum = parseFloat(formData.price);
      
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error('ราคาต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
      }

      const originalPriceNum = formData.original_price ? parseFloat(formData.original_price) : null;
      const discountPercentNum = formData.discount_percent ? parseInt(formData.discount_percent) : null;

      if (originalPriceNum !== null && (isNaN(originalPriceNum) || originalPriceNum < 0)) {
        throw new Error('ราคาเดิมต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
      }

      if (discountPercentNum !== null && (isNaN(discountPercentNum) || discountPercentNum < 0 || discountPercentNum > 100)) {
        throw new Error('เปอร์เซ็นต์ส่วนลดต้องอยู่ระหว่าง 0-100');
      }

      const additionalImagesArray = formData.additional_images
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      if (currentAccount) {
        // Edit existing accounts - แก้ไขทุก account ที่เหมือนกัน (ถ้ามี accountIds)
        const firstAccount = validAccounts[0];
        const stockNum = parseInt(formData.stock);
        
        if (isNaN(stockNum) || stockNum < 0) {
          throw new Error('สต็อกต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
        }

        // ถ้ามี accountIds หลายตัว ต้องอัปเดตทุกตัวที่เหมือนกัน
        const accountIds = (currentAccount as any).accountIds || [currentAccount.id];
        
        // อัปเดตทุก account ที่เหมือนกัน
        const updatePromises = accountIds.map((accId: number) => 
          fetch(`/api/game-accounts/${accId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              game_name: formData.game_name,
              game_category_id: formData.game_category_id ? parseInt(formData.game_category_id) : null,
              title: formData.title + (accountIds.length > 1 ? ` #${accountIds.indexOf(accId) + 1}` : ''),
              description: formData.description || null,
              cover_image_url: formData.cover_image_url || null,
              banner_image_url: formData.banner_image_url || null,
              additional_images: additionalImagesArray,
              username: firstAccount.username,
              password: firstAccount.password,
              price: priceNum,
              original_price: originalPriceNum,
              discount_percent: discountPercentNum,
              permission_id: formData.permission_id ? parseInt(formData.permission_id) : null,
              stock: accountIds.length > 1 ? 1 : stockNum, // ถ้ามีหลายตัว ให้แต่ละตัวมี stock = 1
              is_published: formData.is_published
            })
          })
        );

        const results = await Promise.all(updatePromises);
        const failed = results.find(r => !r.ok);
        
        if (failed) {
          const json = await failed.json();
          throw new Error(json.detail || json.error || 'บันทึกไม่สำเร็จ');
        }

        toast.show({ 
          title: 'สำเร็จ', 
          description: `บันทึกการแก้ไขเรียบร้อย${accountIds.length > 1 ? ` (อัปเดต ${accountIds.length} ไอดี)` : ''}` 
        });
      } else {
        // Create new account(s) - ใช้ accounts array
        const res = await fetch('/api/game-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_name: formData.game_name,
            game_category_id: formData.game_category_id ? parseInt(formData.game_category_id) : null,
            title: formData.title,
            description: formData.description || null,
            cover_image_url: formData.cover_image_url || null,
            banner_image_url: formData.banner_image_url || null,
            additional_images: additionalImagesArray,
            accounts: validAccounts,
            price: priceNum,
            original_price: originalPriceNum,
            discount_percent: discountPercentNum,
            permission_id: formData.permission_id ? parseInt(formData.permission_id) : null,
            is_published: formData.is_published
          })
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.detail || json.error || 'บันทึกไม่สำเร็จ');
        }

        toast.show({ title: 'สำเร็จ', description: `สร้างไอดีเกม ${json.data?.length || validAccounts.length} รายการเรียบร้อย` });
      }

      closeDialog();
      await fetchData();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบไอดีเกมนี้?')) return;

    try {
      const res = await fetch(`/api/game-accounts/${id}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'ลบไม่สำเร็จ');
      }

      toast.show({ title: 'สำเร็จ', description: 'ลบไอดีเกมเรียบร้อย' });
      await fetchData();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    }
  };

  const handleTogglePublished = async (account: GameAccount & { accountIds?: number[] }) => {
    const accountIds = (account as any).accountIds || [account.id];
    const newPublishedState = !account.is_published;
    
    // Optimistic update - อัปเดต UI ทันที
    setAccounts(prevAccounts => 
      prevAccounts.map(acc => {
        if (accountIds.includes(acc.id)) {
          return { ...acc, is_published: newPublishedState };
        }
        return acc;
      })
    );

    // ส่ง API request ในพื้นหลัง
    try {
      const updatePromises = accountIds.map((accId: number) =>
        fetch(`/api/game-accounts/${accId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_published: newPublishedState
          })
        })
      );

      const results = await Promise.all(updatePromises);
      const failed = results.find(r => !r.ok);

      if (failed) {
        const json = await failed.json();
        throw new Error(json.detail || json.error || 'อัปเดตไม่สำเร็จ');
      }

      // แสดง toast เฉพาะเมื่อสำเร็จ (ไม่แสดง error ถ้าล้มเหลวจะ revert)
    } catch (err) {
      // Revert กลับไปเป็นสถานะเดิม
      setAccounts(prevAccounts => 
        prevAccounts.map(acc => {
          if (accountIds.includes(acc.id)) {
            return { ...acc, is_published: !newPublishedState };
          }
          return acc;
        })
      );

      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive'
      });
    }
  };

  // Group accounts by game_name and title (without # suffix), sum stock
  const groupedAccounts = useMemo(() => {
    const grouped = new Map<string, GameAccount & { totalStock: number; accountIds: number[] }>();
    
    accounts.forEach(acc => {
      const baseTitle = acc.title.split(' #')[0];
      const key = `${acc.game_name}::${baseTitle}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          ...acc,
          title: baseTitle,
          totalStock: 0,
          accountIds: []
        });
      }
      
      const group = grouped.get(key)!;
      group.totalStock += acc.stock || 0;
      group.accountIds.push(acc.id);
    });
    
    return Array.from(grouped.values());
  }, [accounts]);

  const filteredAccounts = groupedAccounts.filter(acc => {
    const matchesSearch = !searchQuery || 
      acc.game_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryId === 'all' || 
      acc.game_category_id?.toString() === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="card p-4 overflow-x-auto">
          <div className="w-full space-y-2">
            <div className="grid grid-cols-7 gap-2 pb-2 border-b border-border">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-2 py-2 border-b border-border/50">
                {Array.from({ length: 7 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">จัดการไอดีเกม</h2>
          <p className="text-sm text-gray-400">เพิ่ม แก้ไข และลบไอดีเกม</p>
        </div>
        <Dialog
          open={openDialog !== null}
          onOpenChange={(open) => {
          if (!open) closeDialog();
          }}
        >
          <Button
            onClick={() => openCreateDialog()}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="size-4" />
            เพิ่มไอดีเกม
          </Button>
          <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto bg-[#0a0a0a] text-white border-gray-800">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-white">
                  {currentAccount ? 'แก้ไขไอดีเกม' : 'เพิ่มไอดีเกมใหม่'}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {currentAccount ? 'แก้ไขข้อมูลไอดีเกม' : 'เพิ่มไอดีเกมใหม่ (สามารถเพิ่มหลายตัวพร้อมกันโดยตั้งค่า Stock)'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="game_name" className="text-sm font-medium text-gray-300">
                      ชื่อเกม *
                    </Label>
                    <Input
                      id="game_name"
                      value={formData.game_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, game_name: e.target.value }))}
                      placeholder="เช่น PUBG, Free Fire"
                      required
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="game_category_id" className="text-sm font-medium text-gray-300">
                      หมวดหมู่
                    </Label>
                    <select
                      id="game_category_id"
                      value={formData.game_category_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, game_category_id: e.target.value }))}
                      className="w-full rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-base text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/50"
                      style={{ fontSize: '16px' }}
                    >
                      <option value="" className="bg-[#1a1a1a] text-white">ไม่มีหมวดหมู่</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-[#1a1a1a] text-white">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="title" className="text-sm font-medium text-gray-300">
                    ชื่อ/หัวข้อไอดี *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="เช่น PUBG Mobile VIP Account"
                    required
                  />
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-300">
                    คำอธิบาย
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="คำอธิบายไอดีเกม"
                    rows={3}
                      className="border-gray-700 bg-[#1a1a1a] text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cover_image_url" className="text-sm font-medium text-gray-300 mb-1">รูปภาพปก (URL)</Label>
                    <Textarea
                      id="cover_image_url"
                      value={formData.cover_image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, cover_image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                      rows={3}
                      className="border-gray-700 bg-[#1a1a1a] text-white placeholder:text-gray-500 resize-none"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="banner_image_url" className="text-sm font-medium text-gray-300 mb-1">
                      รูปภาพ Banner สำหรับหน้าแรก (1920x400 px) (URL)
                    </Label>
                    <Textarea
                      id="banner_image_url"
                      value={formData.banner_image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, banner_image_url: e.target.value }))}
                      placeholder="https://example.com/banner.jpg"
                      rows={3}
                      className="border-gray-700 bg-[#1a1a1a] text-white placeholder:text-gray-500 resize-none"
                    />
                  </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="additional_images" className="text-sm font-medium text-gray-300 mb-1">
                      รูปภาพเพิ่มเติม (URL ต่อบรรทัด)
                    </Label>
                    <Textarea
                      id="additional_images"
                      value={formData.additional_images}
                      onChange={(e) => setFormData(prev => ({ ...prev, additional_images: e.target.value }))}
                      placeholder="https://example.com/img1.jpg&#10;https://example.com/img2.jpg"
                      rows={3}
                    className="border-gray-700 bg-[#1a1a1a] text-white placeholder:text-gray-400"
                    />
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="accounts_text" className="text-sm font-medium text-gray-300">
                      Username / Password *
                    </Label>
                    <Textarea
                      id="accounts_text"
                      value={formData.accounts_text || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, accounts_text: e.target.value }))}
                      placeholder="user1:pass1&#10;user2:pass2&#10;user3:pass3"
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400">
                      กรอกรูปแบบ username:password ต่อบรรทัด (ถ้าจำนวนไอดีมากกว่า 1)
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="price" className="text-sm font-medium text-gray-300">
                      ราคา (พอยต์) *
                    </Label>
                    <input
                      id="price"
                      type="text"
                      inputMode="decimal"
                      value={formData.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        // อนุญาตให้กรอกตัวเลขและจุดทศนิยมเท่านั้น
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setFormData(prev => ({ ...prev, price: val }));
                        }
                      }}
                      placeholder="0.00"
                      required
                      className="w-full rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-base text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="stock" className="text-sm font-medium text-gray-300">
                      สต็อก *
                    </Label>
                    <input
                      id="stock"
                      type="text"
                      inputMode="numeric"
                      value={formData.stock}
                      onChange={(e) => {
                        const val = e.target.value;
                        // อนุญาตให้กรอกตัวเลขเท่านั้น
                        if (val === '' || /^\d+$/.test(val)) {
                          setFormData(prev => ({ ...prev, stock: val }));
                        }
                      }}
                      placeholder="1"
                      required
                      className="w-full rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-base text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 -mt-2">
                  จำนวนไอดีที่จะสร้าง (ควรตรงกับจำนวน username/password)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="original_price" className="text-sm font-medium text-gray-300">
                      ราคาเดิม (พอยต์)
                    </Label>
                    <input
                      id="original_price"
                      type="text"
                      inputMode="decimal"
                      value={formData.original_price}
                      onChange={(e) => {
                        const val = e.target.value;
                        // อนุญาตให้กรอกตัวเลขและจุดทศนิยมเท่านั้น
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setFormData(prev => ({ ...prev, original_price: val }));
                        }
                      }}
                      placeholder="0.00"
                      className="w-full rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-base text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ fontSize: '16px' }}
                    />
                    <p className="text-xs text-gray-400">สำหรับแสดงส่วนลด (ถ้าไม่กรอกจะไม่แสดง badge ส่วนลด)</p>
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="discount_percent" className="text-sm font-medium text-gray-300">
                      เปอร์เซ็นต์ส่วนลด (%)
                    </Label>
                    <input
                      id="discount_percent"
                      type="text"
                      inputMode="numeric"
                      value={formData.discount_percent}
                      onChange={(e) => {
                        const val = e.target.value;
                        // อนุญาตให้กรอกตัวเลขเท่านั้น (0-100)
                        if (val === '' || /^\d+$/.test(val)) {
                          const num = val === '' ? '' : parseInt(val);
                          if (num === '' || (num >= 0 && num <= 100)) {
                            setFormData(prev => ({ ...prev, discount_percent: val }));
                          }
                        }
                      }}
                      placeholder="0"
                      className="w-full rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-base text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ fontSize: '16px' }}
                    />
                    <p className="text-xs text-gray-400">ถ้ากรอกจะคำนวณส่วนลดอัตโนมัติ (0-100)</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="permission_id" className="text-sm font-medium text-gray-300">
                    สิทธิ์ส่วนลด
                  </Label>
                  <select
                    id="permission_id"
                    value={formData.permission_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, permission_id: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-base text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    style={{ fontSize: '16px' }}
                  >
                    <option value="" className="bg-[#1a1a1a] text-white">ไม่มีสิทธิ์ส่วนลด</option>
                    {permissions.map(perm => (
                      <option key={perm.id} value={perm.id} className="bg-[#1a1a1a] text-white">
                        {perm.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400">เลือกสิทธิ์ส่วนลดที่จะใช้กับสินค้านี้ (ถ้าเลือก ผู้ใช้ที่มีสิทธิ์นี้จะได้รับส่วนลด)</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                    className="h-4 w-4 rounded border border-gray-700 bg-[#1a1a1a] text-red-600 focus:ring-2 focus:ring-red-600/50 focus:ring-offset-0"
                  />
                  <Label htmlFor="is_published" className="cursor-pointer text-gray-300">
                    เผยแพร่
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    className="border-gray-700 text-gray-300 hover:bg-[#0a0a0a]"
                  >
                    ยกเลิก
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                >
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

        {/* Price Management Dialog */}
        <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-[#1a1a1a] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                จัดการราคาตามสิทธิ์
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedAccountForPrice && (
                  <div className="mt-2">
                    <div className="font-semibold text-white">{selectedAccountForPrice.title}</div>
                    <div className="text-sm text-gray-600">{selectedAccountForPrice.game_name}</div>
                    <div className="text-sm text-gray-400 mt-1">ราคาปกติ: {Number(selectedAccountForPrice.price).toFixed(2)} พอยต์</div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Add New Price */}
              <div className="border border-gray-800 rounded-lg p-4 bg-[#0a0a0a]">
                <h3 className="font-semibold text-white mb-3">เพิ่มราคาใหม่</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="new_permission_id" className="text-sm font-medium text-gray-300">
                      สิทธิ์
                    </Label>
                    <select
                      id="new_permission_id"
                      value={newPriceForm.permission_id}
                      onChange={(e) => setNewPriceForm(prev => ({ ...prev, permission_id: e.target.value }))}
                      className="w-full rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    >
                      <option value="" className="bg-[#1a1a1a] text-white">เลือกสิทธิ์</option>
                      {permissions
                        .filter(p => !accountPrices.find(ap => ap.permission_id === p.id))
                        .map(perm => (
                          <option key={perm.id} value={perm.id} className="bg-[#1a1a1a] text-white">
                            {perm.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new_price" className="text-sm font-medium text-gray-300">
                      ราคา (พอยต์)
                    </Label>
                    <input
                      id="new_price"
                      type="text"
                      inputMode="decimal"
                      value={newPriceForm.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setNewPriceForm(prev => ({ ...prev, price: val }));
                        }
                      }}
                      placeholder="0.00"
                      className="w-full rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddPrice}
                  disabled={!newPriceForm.permission_id || !newPriceForm.price || loadingPrices}
                  className="mt-3 gap-2 bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <Plus className="size-4" />
                  เพิ่มราคา
                </Button>
              </div>

              {/* Existing Prices */}
              <div>
                <h3 className="font-semibold text-white mb-3">ราคาตามสิทธิ์</h3>
                {loadingPrices ? (
                  <div className="text-center py-8 text-gray-400">กำลังโหลด...</div>
                ) : accountPrices.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border border-gray-800 rounded-lg">
                    ยังไม่มีราคาตามสิทธิ์
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accountPrices.map((priceItem) => (
                      <div
                        key={priceItem.id}
                        className="flex items-center justify-between p-3 border border-gray-800 rounded-lg bg-[#1a1a1a]"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-white">
                            {priceItem.permission?.name || `สิทธิ์ ID: ${priceItem.permission_id}`}
                          </div>
                          <div className="text-sm text-gray-600">
                            ราคา: {Number(priceItem.price).toFixed(2)} พอยต์
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPrice = prompt('กรอกราคาใหม่:', priceItem.price.toString());
                              if (newPrice !== null) {
                                const priceNum = parseFloat(newPrice);
                                if (!isNaN(priceNum) && priceNum >= 0) {
                                  handleUpdatePrice(priceItem.id, priceNum);
                                } else {
                                  toast.show({
                                    title: 'ราคาไม่ถูกต้อง',
                                    description: 'กรุณากรอกตัวเลขที่มากกว่าหรือเท่ากับ 0',
                                    variant: 'destructive'
                                  });
                                }
                              }
                            }}
                            className="border-gray-700 text-gray-300 hover:bg-[#0a0a0a]"
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePrice(priceItem.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closePriceDialog}
                className="border-gray-700 text-gray-300 hover:bg-[#0a0a0a]"
              >
                ปิด
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="ค้นหาไอดีเกม..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm border-gray-700 bg-[#1a1a1a] text-white placeholder:text-gray-500"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="justify-between gap-2 min-w-[180px] border-gray-700 text-gray-300 hover:bg-[#0a0a0a]"
            >
              {selectedCategoryId === 'all' 
                ? 'ทุกหมวดหมู่' 
                : categories.find(c => c.id.toString() === selectedCategoryId)?.name || 'ทุกหมวดหมู่'}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[180px]">
            <DropdownMenuLabel>เลือกหมวดหมู่</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedCategoryId === 'all'}
              onCheckedChange={() => setSelectedCategoryId('all')}
            >
              ทุกหมวดหมู่
            </DropdownMenuCheckboxItem>
            {categories.map(cat => (
              <DropdownMenuCheckboxItem
                key={cat.id}
                checked={selectedCategoryId === cat.id.toString()}
                onCheckedChange={() => setSelectedCategoryId(cat.id.toString())}
              >
                {cat.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 bg-gray-900/50 hover:bg-gray-900/50">
              <TableHead className="w-[80px] text-white">รูปภาพ</TableHead>
              <TableHead className="text-white">ชื่อเกม</TableHead>
              <TableHead className="text-white">ไอดี</TableHead>
              <TableHead className="text-white">หมวดหมู่</TableHead>
              <TableHead className="w-[120px] text-white">ราคา</TableHead>
              <TableHead className="w-[100px] text-white">สต็อก</TableHead>
              <TableHead className="w-[100px] text-white">สถานะ</TableHead>
              <TableHead className="w-[150px] text-right text-white">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  ไม่พบไอดีเกม
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => {
                const totalStock = (account as any).totalStock || account.stock;
                const accountIds = (account as any).accountIds || [account.id];
                const accountCount = accountIds.length;
                
                return (
                  <TableRow key={account.id} className="border-gray-800 hover:bg-gray-900/30">
                    <TableCell>
                      {account.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={account.cover_image_url}
                          alt={account.title}
                          className="h-16 w-16 rounded object-cover border border-gray-800"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded bg-gray-800 border border-gray-800 flex items-center justify-center">
                          <Image className="size-6 text-gray-500" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-white">{account.game_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-white">{account.title}</div>
                      {account.description && (
                        <div className="text-xs text-gray-400 line-clamp-1 mt-1">
                          {account.description}
                        </div>
                      )}
                      {accountCount > 1 && (
                        <div className="text-xs text-gray-400 mt-1">
                          (มี {accountCount} ไอดี)
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {account.game_categories ? (
                        <Badge variant="outline" className="border-emerald-600 text-emerald-400 bg-emerald-900/30">
                          {account.game_categories.name}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-white">{Number(account.price).toFixed(2)}</div>
                      <div className="text-xs text-gray-400">พอยต์</div>
                    </TableCell>
                    <TableCell>
                      {totalStock > 0 ? (
                        <Badge variant="outline" className="border-emerald-600 text-emerald-400 bg-emerald-900/30">
                          {totalStock}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="border-red-800 bg-red-900/30 text-red-400">
                          ขายหมด
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`published-${account.id}`}
                          checked={account.is_published}
                          onCheckedChange={() => handleTogglePublished(account)}
                        />
                        <span className="text-xs text-gray-400">
                          {account.is_published ? 'เผยแพร่' : 'ไม่เผยแพร่'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPriceDialog(account)}
                          className="gap-2 border-emerald-600 text-emerald-400 hover:bg-emerald-900/30"
                        >
                          <Package className="size-4" />
                          ราคา
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(account)}
                          className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                          <Edit className="size-4" />
                          แก้ไข
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (accountIds.length > 1) {
                              if (confirm(`คุณแน่ใจหรือไม่ที่จะลบไอดีเกมทั้งหมด ${accountIds.length} ตัว?`)) {
                                Promise.all(accountIds.map((id: number) => handleDelete(id))).catch(err => {
                                  console.error('Delete error:', err);
                                });
                              }
                            } else {
                              handleDelete(account.id);
                            }
                          }}
                          className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                          ลบ
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

