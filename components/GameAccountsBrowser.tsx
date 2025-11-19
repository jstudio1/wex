'use client';

import { useMemo, useState, useEffect, useCallback, memo } from 'react';
import AnimatedAccountCard from '@/components/AnimatedAccountCard';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ButtonGroup } from '@/components/ui/button-group';
import { SearchIcon, ListIcon, ShoppingCart, Package, Info, ChevronsUpDown, Check, Gamepad2, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/ui/spinner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { applyPermissionDiscount, type Permission } from '@/lib/pricing';
import { useWalletBalance } from '@/hooks/useWalletBalance';

type GameAccount = {
  id: number;
  game_name: string;
  game_category_id: number | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  additional_images: string[];
  price: number;
  original_price?: number | null;
  discount_percent?: number | null;
  stock: number;
  created_at?: string;
  category?: { id: number; name: string; slug: string } | null;
};

type GameCategory = {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  accountCount?: number;
  minPrice?: number;
  maxPrice?: number;
};

type Props = {
  accounts: GameAccount[];
  categories: GameCategory[];
  initialCategory?: string;
  isLoading?: boolean;
  hideCategoryPills?: boolean;
  initialPermissionId?: number | null;
  initialPermission?: { id: number; name: string } | null;
};

function GameAccountsBrowser({ accounts, categories, initialCategory, isLoading, hideCategoryPills = false, initialPermissionId = null, initialPermission = null }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategory || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [quickBuyAccount, setQuickBuyAccount] = useState<GameAccount | null>(null);
  const [quickBuyQuantity, setQuickBuyQuantity] = useState(1);
  const [quickBuyLoading, setQuickBuyLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [permission, setPermission] = useState<Permission>(null);
  const [permissionName, setPermissionName] = useState<string | null>(initialPermission?.name || null);
  const [quickBuyCustomPrice, setQuickBuyCustomPrice] = useState<number | null>(null);
  const itemsPerPage = 24;
  const { permission: walletPermission, permissionId: walletPermissionId } = useWalletBalance();

  // Use initialPermissionId from server or fetch from client
  const [userPermissionId, setUserPermissionId] = useState<number | null>(initialPermissionId);
  
  useEffect(() => {
    if (walletPermission) {
      setPermission(walletPermission);
      setPermissionName(walletPermission.name || initialPermission?.name || null);
    } else if (initialPermission) {
      setPermissionName(initialPermission.name);
    } else {
      setPermission(null);
      setPermissionName(null);
    }
  }, [initialPermission, walletPermission]);

  useEffect(() => {
    if (initialPermissionId) {
      setUserPermissionId(initialPermissionId);
      return;
    }
    if (walletPermissionId) {
      setUserPermissionId(walletPermissionId);
    } else if (!walletPermission && !initialPermission) {
      setUserPermissionId(null);
    }
  }, [initialPermission, initialPermissionId, walletPermissionId, walletPermission]);

  // Fetch custom price when quick buy account or permission changes
  useEffect(() => {
    if (userPermissionId && quickBuyAccount) {
      fetch(`/api/game-accounts/${quickBuyAccount.id}?permission_id=${userPermissionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok && data.data && data.data.price !== undefined) {
            setQuickBuyCustomPrice(Number(data.data.price));
          } else {
            setQuickBuyCustomPrice(null);
          }
        })
        .catch(() => {
          setQuickBuyCustomPrice(null);
        });
    } else {
      setQuickBuyCustomPrice(null);
    }
  }, [quickBuyAccount?.id, userPermissionId]);

  const filtered = useMemo(() => {
    let result = accounts;
    
    // Filter by category
    // If initialCategory is provided (slug), filter by matching category slug
    if (initialCategory && initialCategory !== 'all') {
      const category = categories.find(cat => cat.slug === initialCategory);
      if (category) {
        result = result.filter(acc => acc.game_category_id === category.id);
      }
    } else if (selectedCategoryId !== 'all') {
      const catId = parseInt(selectedCategoryId);
      if (!isNaN(catId)) {
        result = result.filter(acc => acc.game_category_id === catId);
      }
    }
    
    // Search
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(acc =>
        `${acc.game_name} ${acc.title} ${acc.description || ''}`.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [accounts, selectedCategoryId, searchQuery, initialCategory, categories]);

  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryId, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Reset selected account when accounts change
  useEffect(() => {
    if (selectedAccount && !accounts.find(acc => acc.id === selectedAccount)) {
      setSelectedAccount(null);
    }
  }, [accounts, selectedAccount]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full max-w-md">
            <ButtonGroup className="w-full">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10" />
            </ButtonGroup>
          </div>
          <div className="hidden h-6 w-px bg-gray-200 md:block" />
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <Skeleton className="w-full aspect-square" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-red-300 to-transparent"></div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <SearchIcon className="h-5 w-5 text-red-600" />
          ค้นหาไอดีเกม
        </h2>
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-red-300 to-transparent"></div>
      </div>

      {/* Top bar: search + divider + categories */}
      <div className="flex flex-wrap items-center gap-4">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={searchOpen}
              className="w-full max-w-md justify-between border-gray-300 hover:bg-gray-50 hover:border-red-400 text-gray-900"
            >
              {selectedAccount
                ? accounts.find((account) => account.id === selectedAccount)?.title || 'ค้นหาไอดีเกม...'
                : 'ค้นหาไอดีเกม...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full max-w-md p-0 bg-white border-gray-200">
            <Command className="bg-transparent">
              <CommandInput 
                placeholder="ค้นหาไอดีเกม..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="text-gray-900"
              />
              <CommandList>
                <CommandEmpty className="text-gray-600">ไม่พบไอดีเกมที่ค้นหา</CommandEmpty>
                <CommandGroup>
                  {filtered.slice(0, 10).map((account) => (
                    <CommandItem
                      key={account.id}
                      value={`${account.title} ${account.game_name}`}
                      onSelect={() => {
                        setSelectedAccount(account.id);
                        setSearchQuery('');
                        setSearchOpen(false);
                        router.push(`/accounts/${account.id}`);
                      }}
                      className="text-gray-900 hover:bg-red-50"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedAccount === account.id ? "opacity-100 text-red-600" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{account.title}</span>
                        <span className="text-xs text-gray-500">{account.game_name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="hidden h-6 w-px bg-gray-300 md:block" />
        {!hideCategoryPills && categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <CategoryPill 
              active={selectedCategoryId === 'all'} 
              onClick={() => {
                setSelectedCategoryId('all');
                router.push('/categories');
              }} 
              icon={<ListIcon className="h-4 w-4" />} 
              label="ทั้งหมด" 
            />
            {categories.map((category) => (
              <CategoryPill 
                key={category.id} 
                active={selectedCategoryId === category.id.toString()} 
                onClick={() => {
                  setSelectedCategoryId(category.id.toString());
                  router.push(`/categories/${category.slug}`);
                }} 
                icon={<ListIcon className="h-4 w-4" />} 
                label={category.name} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Accounts Grid Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-red-300 to-transparent"></div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-red-600" />
          รายการไอดีเกม
        </h2>
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-red-300 to-transparent"></div>
      </div>

      {/* Accounts Grid */}
      {filtered.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gamepad2 className="h-12 w-12 text-gray-400" />
            </EmptyMedia>
            <EmptyTitle className="text-gray-900">
          {searchQuery || selectedCategoryId !== 'all' 
            ? 'ไม่พบไอดีเกมที่ค้นหา' 
            : 'ยังไม่มีไอดีเกม'}
            </EmptyTitle>
            <EmptyDescription className="text-gray-600">
              {searchQuery || selectedCategoryId !== 'all'
                ? 'ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่น'
                : 'ไอดีเกมจะแสดงที่นี่เมื่อมีการเพิ่มไอดีเกมใหม่'}
            </EmptyDescription>
          </EmptyHeader>
          {(searchQuery || selectedCategoryId !== 'all') && (
            <EmptyContent>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryId('all');
                  router.push('/categories');
                }}
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <RefreshCcw className="h-4 w-4" />
                ล้างการค้นหา
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {paginatedAccounts.map((account, index) => (
              <AnimatedAccountCard
                key={account.id}
                account={account}
                index={index}
                initialPermissionId={userPermissionId}
                initialPermission={initialPermission}
                onQuickBuy={(acc) => {
                  setQuickBuyAccount(acc);
                  setQuickBuyQuantity(1);
                }}
              />
            ))}
          </div>

          {/* Quick Buy Dialog */}
          {quickBuyAccount && (
            <Dialog open={!!quickBuyAccount} onOpenChange={(open) => {
              if (!open) {
                setQuickBuyAccount(null);
                setQuickBuyQuantity(1);
              }
            }}>
              <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                  <DialogTitle className="text-xl text-gray-900">ซื้อไอดีเกม</DialogTitle>
                  <DialogDescription className="pt-4">
                    <div className="space-y-4">
                      {/* Product Info */}
                      <div className="space-y-2 pb-3 border-b border-gray-200">
                        <div className="font-semibold text-gray-900">{quickBuyAccount.title}</div>
                        <div className="text-sm text-gray-600">{quickBuyAccount.game_name}</div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="space-y-3">
                        <Label htmlFor="quick-quantity" className="text-base text-gray-900">จำนวน</Label>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 border-2 border-gray-300 rounded-lg overflow-hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setQuickBuyQuantity(Math.max(1, quickBuyQuantity - 1))}
                              disabled={quickBuyQuantity <= 1}
                              className="rounded-none h-10 w-10 hover:bg-gray-100 text-[color:var(--text)] disabled:text-gray-300 disabled:opacity-100"
                            >
                              <span className="text-lg">−</span>
                            </Button>
                            <Input
                              id="quick-quantity"
                              type="text"
                              value={quickBuyQuantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || '';
                                if (val === '' || (val >= 1 && val <= quickBuyAccount.stock)) {
                                  setQuickBuyQuantity(val === '' ? 1 : val);
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!val || val < 1) {
                                  setQuickBuyQuantity(1);
                                } else if (val > quickBuyAccount.stock) {
                                  setQuickBuyQuantity(quickBuyAccount.stock);
                                }
                              }}
                              className="w-16 text-center text-base font-semibold border-0 focus-visible:ring-0 rounded-none h-10 bg-gray-100 text-gray-900"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setQuickBuyQuantity(Math.min(quickBuyAccount.stock, quickBuyQuantity + 1))}
                              disabled={quickBuyQuantity >= quickBuyAccount.stock}
                              className="rounded-none h-10 w-10 hover:bg-gray-100 text-[color:var(--text)] disabled:text-gray-300 disabled:opacity-100"
                            >
                              <span className="text-lg">+</span>
                            </Button>
                          </div>
                        </div>

                        {/* Summary */}
                        {(() => {
                          const basePrice = quickBuyCustomPrice !== null ? quickBuyCustomPrice : Number(quickBuyAccount.price);
                          const productPermissionId = (quickBuyAccount as any).permission_id || null;
                          const userPermissionId = permission ? (permission as any).id : null;
                          const discountedPrice = applyPermissionDiscount(basePrice, permission, productPermissionId, userPermissionId);
                          const hasDiscount = (quickBuyCustomPrice !== null || (permission && (productPermissionId === null || productPermissionId === userPermissionId))) && discountedPrice < Number(quickBuyAccount.price);
                          const totalPrice = discountedPrice * quickBuyQuantity;
                          const totalBasePrice = Number(quickBuyAccount.price) * quickBuyQuantity;
                          
                          return (
                        <div className="space-y-2 p-4 rounded-lg border border-red-200 bg-red-50">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">ราคาต่อชิ้น:</span>
                                {hasDiscount ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-900 font-semibold">{discountedPrice.toFixed(2)} พอยต์</span>
                                    <span className="text-gray-400 line-through text-xs">{basePrice.toFixed(2)}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-900">{basePrice.toFixed(2)} พอยต์</span>
                                )}
                              </div>
                              {hasDiscount && permission && (
                                <div className="text-xs text-green-600 font-medium">
                                  ส่วนลดสิทธิ์: {permissionName || 'สิทธิ์ส่วนลด'}
                          </div>
                              )}
                          <div className="flex justify-between items-center pt-2 border-t border-red-200">
                            <span className="font-semibold text-gray-900">ราคารวม:</span>
                                {hasDiscount ? (
                                  <div className="flex flex-col items-end gap-1">
                            <span className="text-xl font-bold text-red-600">
                                      {totalPrice.toFixed(2)} พอยต์
                                    </span>
                                    <span className="text-sm text-gray-400 line-through">
                                      {totalBasePrice.toFixed(2)} พอยต์
                            </span>
                                  </div>
                                ) : (
                                  <span className="text-xl font-bold text-red-600">
                                    {totalPrice.toFixed(2)} พอยต์
                                  </span>
                                )}
                          </div>
                          {quickBuyAccount.stock > 0 && (
                            <div className="text-xs text-gray-600 pt-1">
                              สต็อกคงเหลือ: {quickBuyAccount.stock} ชิ้น
                            </div>
                          )}
                        </div>
                          );
                        })()}
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuickBuyAccount(null);
                      setQuickBuyQuantity(1);
                    }}
                    disabled={quickBuyLoading}
                    className="border-gray-200 hover:bg-gray-50 text-gray-700"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!quickBuyAccount) return;
                      
                      if (quickBuyQuantity < 1 || quickBuyQuantity > quickBuyAccount.stock) {
                        toast.show({
                          title: 'เกิดข้อผิดพลาด',
                          description: `กรุณากรอกจำนวนระหว่าง 1-${quickBuyAccount.stock}`,
                          variant: 'destructive'
                        });
                        return;
                      }

                      setQuickBuyLoading(true);
                      try {
                        const res = await fetch('/api/game-accounts/buy', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            game_name: quickBuyAccount.game_name,
                            title: quickBuyAccount.title.split(' #')[0],
                            quantity: quickBuyQuantity
                          })
                        });

                        const json = await res.json();
                        if (json.ok) {
                          toast.show({
                            title: 'สำเร็จ',
                            description: `ซื้อไอดีเกม ${quickBuyQuantity} ชิ้นเรียบร้อยแล้ว ตรวจสอบที่หน้าประวัติ`
                          });
                          window.dispatchEvent(new Event('wallet:changed'));
                          setQuickBuyAccount(null);
                          setQuickBuyQuantity(1);
                          // Refresh page to update stock
                          window.location.reload();
                        } else {
                          toast.show({
                            title: 'เกิดข้อผิดพลาด',
                            description: json.detail || json.error || 'ไม่สามารถซื้อได้',
                            variant: 'destructive'
                          });
                        }
                      } catch (err) {
                        console.error('Quick buy error:', err);
                        toast.show({
                          title: 'เกิดข้อผิดพลาด',
                          description: 'ไม่สามารถซื้อได้',
                          variant: 'destructive'
                        });
                      } finally {
                        setQuickBuyLoading(false);
                      }
                    }}
                    disabled={quickBuyLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {quickBuyLoading ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        กำลังซื้อ...
                      </>
                    ) : (
                      'ยืนยันซื้อ'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                ก่อนหน้า
              </Button>
              <span className="text-sm text-gray-600">
                หน้า {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                ถัดไป
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const CategoryPill = memo(function CategoryPill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick} 
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${
        active 
          ? 'border-red-500 bg-red-50 text-red-700 font-medium' 
          : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-red-400'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
});

export default memo(GameAccountsBrowser);
