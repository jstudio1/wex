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
};

function GameAccountsBrowser({ accounts, categories, initialCategory, isLoading, hideCategoryPills = false }: Props) {
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
  const itemsPerPage = 24;

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
          <div className="hidden h-6 w-px bg-white/10 md:block" />
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-black/40 border border-white/10 rounded-xl overflow-hidden">
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
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <SearchIcon className="size-5 text-purple-400" />
          ค้นหาไอดีเกม
        </h2>
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
      </div>

      {/* Top bar: search + divider + categories (like products page) */}
      <div className="flex flex-wrap items-center gap-4">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={searchOpen}
              className="w-full max-w-md justify-between border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white"
            >
              {selectedAccount
                ? accounts.find((account) => account.id === selectedAccount)?.title || 'ค้นหาไอดีเกม...'
                : 'ค้นหาไอดีเกม...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full max-w-md p-0 bg-black/90 backdrop-blur-sm border-purple-500/20">
            <Command className="bg-transparent">
              <CommandInput 
                placeholder="ค้นหาไอดีเกม..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="text-white"
              />
              <CommandList>
                <CommandEmpty>ไม่พบไอดีเกมที่ค้นหา</CommandEmpty>
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
                      className="text-white hover:bg-purple-500/10"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedAccount === account.id ? "opacity-100 text-purple-400" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{account.title}</span>
                        <span className="text-xs text-white/60">{account.game_name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="hidden h-6 w-px bg-purple-500/30 md:block" />
        {!hideCategoryPills && categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <CategoryPill 
              active={selectedCategoryId === 'all'} 
              onClick={() => {
                setSelectedCategoryId('all');
                router.push('/categories');
              }} 
              icon={<ListIcon className="size-4" />} 
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
                icon={<ListIcon className="size-4" />} 
                label={category.name} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Accounts Grid Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Package className="size-5 text-purple-400" />
          รายการไอดีเกม
        </h2>
        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
      </div>

      {/* Accounts Grid */}
      {filtered.length === 0 ? (
        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gamepad2 className="size-6" />
            </EmptyMedia>
            <EmptyTitle>
          {searchQuery || selectedCategoryId !== 'all' 
            ? 'ไม่พบไอดีเกมที่ค้นหา' 
            : 'ยังไม่มีไอดีเกม'}
            </EmptyTitle>
            <EmptyDescription>
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
              >
                <RefreshCcw className="size-4" />
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
                onQuickBuy={(acc) => {
                  setQuickBuyAccount(acc);
                  setQuickBuyQuantity(1);
                }}
              />
            ))}
          </div>

          {/* Quick Buy Dialog - Outside of card loop */}
          {quickBuyAccount && (
            <Dialog open={!!quickBuyAccount} onOpenChange={(open) => {
              if (!open) {
                setQuickBuyAccount(null);
                setQuickBuyQuantity(1);
              }
            }}>
              <DialogContent className="max-w-md bg-black/90 backdrop-blur-sm border-purple-500/20">
                <DialogHeader>
                  <DialogTitle className="text-xl text-white">ซื้อไอดีเกม</DialogTitle>
                  <DialogDescription className="pt-4">
                    <div className="space-y-4">
                      {/* Product Info */}
                      <div className="space-y-2 pb-3 border-b border-purple-500/20">
                        <div className="font-semibold text-white">{quickBuyAccount.title}</div>
                        <div className="text-sm text-white/60">{quickBuyAccount.game_name}</div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="space-y-3">
                        <Label htmlFor="quick-quantity" className="text-base">จำนวน</Label>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 border border-purple-500/30 rounded-lg overflow-hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setQuickBuyQuantity(Math.max(1, quickBuyQuantity - 1))}
                              disabled={quickBuyQuantity <= 1}
                              className="rounded-none h-10 w-10 hover:bg-purple-500/10 text-white"
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
                              className="w-16 text-center text-base font-semibold border-0 focus-visible:ring-0 rounded-none h-10 bg-transparent text-white"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setQuickBuyQuantity(Math.min(quickBuyAccount.stock, quickBuyQuantity + 1))}
                              disabled={quickBuyQuantity >= quickBuyAccount.stock}
                              className="rounded-none h-10 w-10 hover:bg-purple-500/10 text-white"
                            >
                              <span className="text-lg">+</span>
                            </Button>
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="space-y-2 p-4 rounded-lg border border-purple-500/20 bg-purple-600/10">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">ราคาต่อชิ้น:</span>
                            <span className="text-white">{Number(quickBuyAccount.price).toFixed(2)} พอยต์</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
                            <span className="font-semibold text-white">ราคารวม:</span>
                            <span className="text-xl font-bold text-purple-400">
                              {(Number(quickBuyAccount.price) * quickBuyQuantity).toFixed(2)} พอยต์
                            </span>
                          </div>
                          {quickBuyAccount.stock > 0 && (
                            <div className="text-xs text-white/40 pt-1">
                              สต็อกคงเหลือ: {quickBuyAccount.stock} ชิ้น
                            </div>
                          )}
                        </div>
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
                    className="border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white"
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
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {quickBuyLoading ? (
                      <>
                        <Spinner className="mr-2 size-4" />
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
                className="border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white disabled:opacity-50"
              >
                ก่อนหน้า
              </Button>
              <span className="text-sm text-white/70">
                หน้า {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white disabled:opacity-50"
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
          ? 'border-purple-500/50 bg-purple-600/20 text-white' 
          : 'border-purple-500/30 text-white/70 hover:bg-purple-500/10 hover:border-purple-500/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
});

export default memo(GameAccountsBrowser);

