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
    additional_images: '',
    accounts_text: '', // Text format: user1:pass1\nuser2:pass2
    price: '',
    original_price: '',
    discount_percent: '',
    stock: '1',
    is_published: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountsRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/game-accounts'),
        fetch('/api/admin/game-categories')
      ]);

      if (!accountsRes.ok) throw new Error('ไม่สามารถโหลดไอดีเกมได้');
      if (!categoriesRes.ok) throw new Error('ไม่สามารถโหลดหมวดหมู่ได้');

      const accountsJson = await accountsRes.json();
      const categoriesJson = await categoriesRes.json();

      setAccounts(accountsJson.data || []);
      setCategories(categoriesJson.data || []);
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
      additional_images: '',
      accounts_text: '',
      price: '',
      original_price: '',
      discount_percent: '',
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
      additional_images: (account.additional_images || []).join('\n'),
      accounts_text: `${account.username}:${account.password}`,
      price: account.price.toString(),
      original_price: account.original_price?.toString() || '',
      discount_percent: account.discount_percent?.toString() || '',
      stock: account.stock.toString(),
      is_published: account.is_published
    });
    setOpenDialog('edit');
  };

  const closeDialog = () => {
    setOpenDialog(null);
    setCurrentAccount(null);
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
              additional_images: additionalImagesArray,
              username: firstAccount.username,
              password: firstAccount.password,
              price: priceNum,
              original_price: originalPriceNum,
              discount_percent: discountPercentNum,
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
            additional_images: additionalImagesArray,
            accounts: validAccounts,
            price: priceNum,
            original_price: originalPriceNum,
            discount_percent: discountPercentNum,
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
            <div className="grid grid-cols-7 gap-2 pb-2 border-b border-gray-700/50">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-2 py-2 border-b border-gray-700/30">
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
          <p className="text-sm text-[color:var(--text)]/60">เพิ่ม แก้ไข และลบไอดีเกม</p>
        </div>
        <Dialog open={openDialog !== null} onOpenChange={(open) => {
          if (!open) closeDialog();
        }}>
          <Button onClick={() => openCreateDialog()} className="gap-2">
            <Plus className="size-4" />
            เพิ่มไอดีเกม
          </Button>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{currentAccount ? 'แก้ไขไอดีเกม' : 'เพิ่มไอดีเกมใหม่'}</DialogTitle>
                <DialogDescription>
                  {currentAccount ? 'แก้ไขข้อมูลไอดีเกม' : 'เพิ่มไอดีเกมใหม่ (สามารถเพิ่มหลายตัวพร้อมกันโดยตั้งค่า Stock)'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="game_name">ชื่อเกม *</Label>
                    <Input
                      id="game_name"
                      value={formData.game_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, game_name: e.target.value }))}
                      placeholder="เช่น PUBG, Free Fire"
                      required
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="game_category_id">หมวดหมู่</Label>
                    <select
                      id="game_category_id"
                      value={formData.game_category_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, game_category_id: e.target.value }))}
                      className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-base text-[color:var(--text)] placeholder:text-[color:var(--text)]/40 focus:outline-none focus:ring-2 focus:ring-accent-50"
                      style={{ fontSize: '16px' }}
                    >
                      <option value="" className="bg-[color:var(--bg)] text-[color:var(--text)]">ไม่มีหมวดหมู่</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-[color:var(--bg)] text-[color:var(--text)]">{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="title">ชื่อ/หัวข้อไอดี *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="เช่น PUBG Mobile VIP Account"
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="description">คำอธิบาย</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="คำอธิบายไอดีเกม"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="cover_image_url">รูปภาพปก (URL)</Label>
                    <Input
                      id="cover_image_url"
                      value={formData.cover_image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, cover_image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="additional_images">รูปภาพเพิ่มเติม (URL ต่อบรรทัด)</Label>
                    <Textarea
                      id="additional_images"
                      value={formData.additional_images}
                      onChange={(e) => setFormData(prev => ({ ...prev, additional_images: e.target.value }))}
                      placeholder="https://example.com/img1.jpg&#10;https://example.com/img2.jpg"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="accounts_text">Username / Password *</Label>
                    <Textarea
                      id="accounts_text"
                      value={formData.accounts_text || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, accounts_text: e.target.value }))}
                      placeholder="user1:pass1&#10;user2:pass2&#10;user3:pass3"
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-[color:var(--text)]/60">
                      กรอกรูปแบบ username:password ต่อบรรทัด (ถ้าจำนวนไอดีมากกว่า 1)
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="price">ราคา (พอยต์) *</Label>
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
                      className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-base text-[color:var(--text)] placeholder:text-[color:var(--text)]/40 focus:outline-none focus:ring-2 focus:ring-accent-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="stock">สต็อก *</Label>
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
                      className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-base text-[color:var(--text)] placeholder:text-[color:var(--text)]/40 focus:outline-none focus:ring-2 focus:ring-accent-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-xs text-[color:var(--text)]/60">จำนวนไอดีที่จะสร้าง (ควรตรงกับจำนวน username/password)</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="original_price">ราคาเดิม (พอยต์)</Label>
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
                      className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-base text-[color:var(--text)] placeholder:text-[color:var(--text)]/40 focus:outline-none focus:ring-2 focus:ring-accent-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ fontSize: '16px' }}
                    />
                    <p className="text-xs text-[color:var(--text)]/60">สำหรับแสดงส่วนลด (ถ้าไม่กรอกจะไม่แสดง badge ส่วนลด)</p>
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="discount_percent">เปอร์เซ็นต์ส่วนลด (%)</Label>
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
                      className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-base text-[color:var(--text)] placeholder:text-[color:var(--text)]/40 focus:outline-none focus:ring-2 focus:ring-accent-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ fontSize: '16px' }}
                    />
                    <p className="text-xs text-[color:var(--text)]/60">ถ้ากรอกจะคำนวณส่วนลดอัตโนมัติ (0-100)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                    className="h-4 w-4 rounded border border-white/20 bg-transparent text-accent focus:ring-2 focus:ring-accent-50 focus:ring-offset-0"
                  />
                  <Label htmlFor="is_published" className="cursor-pointer">
                    เผยแพร่
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={saving}>
                    ยกเลิก
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={saving} className="gap-2">
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
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="ค้นหาไอดีเกม..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="justify-between gap-2 min-w-[180px]">
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
      <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700/50 hover:bg-white/5">
              <TableHead className="w-[80px]">รูปภาพ</TableHead>
              <TableHead>ชื่อเกม</TableHead>
              <TableHead>ไอดี</TableHead>
              <TableHead>หมวดหมู่</TableHead>
              <TableHead className="w-[120px]">ราคา</TableHead>
              <TableHead className="w-[100px]">สต็อก</TableHead>
              <TableHead className="w-[100px]">สถานะ</TableHead>
              <TableHead className="w-[150px] text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-[color:var(--text)]/60">
                  ไม่พบไอดีเกม
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => {
                const totalStock = (account as any).totalStock || account.stock;
                const accountIds = (account as any).accountIds || [account.id];
                const accountCount = accountIds.length;
                
                return (
                  <TableRow key={account.id} className="border-white/10 hover:bg-white/5">
                    <TableCell>
                      {account.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={account.cover_image_url}
                          alt={account.title}
                          className="h-16 w-16 rounded object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded bg-white/10 flex items-center justify-center">
                          <Image className="size-6 text-[color:var(--text)]/40" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-[color:var(--text)]">{account.game_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-[color:var(--text)]">{account.title}</div>
                      {account.description && (
                        <div className="text-xs text-[color:var(--text)]/60 line-clamp-1 mt-1">
                          {account.description}
                        </div>
                      )}
                      {accountCount > 1 && (
                        <div className="text-xs text-[color:var(--text)]/40 mt-1">
                          (มี {accountCount} ไอดี)
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {account.game_categories ? (
                        <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10">
                          {account.game_categories.name}
                        </Badge>
                      ) : (
                        <span className="text-sm text-[color:var(--text)]/40">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-[color:var(--text)]">{Number(account.price).toFixed(2)}</div>
                      <div className="text-xs text-[color:var(--text)]/60">พอยต์</div>
                    </TableCell>
                    <TableCell>
                      {totalStock > 0 ? (
                        <Badge variant="outline" className="border-green-500/30 text-green-300 bg-green-500/10">
                          {totalStock}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">ขายหมด</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`published-${account.id}`}
                          checked={account.is_published}
                          onCheckedChange={() => handleTogglePublished(account)}
                        />
                        <span className="text-xs text-[color:var(--text)]/60">
                          {account.is_published ? 'เผยแพร่' : 'ไม่เผยแพร่'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(account)}
                          className="gap-2"
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
                          className="gap-2 text-red-300 hover:text-red-200"
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

