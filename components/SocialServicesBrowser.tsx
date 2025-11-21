'use client';

import { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronLeft, ChevronRight, Check, X, ChevronRight as ChevronRightIcon, ChevronsUpDown, Users, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AnimatedSocialServiceRow from '@/components/AnimatedSocialServiceRow';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
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

type SocialService = {
  id: number;
  provider_service_id: number;
  name: string;
  display_name: string;
  category_id: number | null;
  price_per_1000: number;
  base_rate_thb: number;
  rate_usd: number;
  min_quantity: number;
  max_quantity: number;
  refill: boolean;
  cancel: boolean;
  markup_percent: number;
  markup_fixed: number;
};

type SocialCategory = { id: number; name: string; slug: string };

type Props = {
  services: SocialService[];
  categories: SocialCategory[];
  globalMarkup: { percent: number; fixed: number };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
}

function computeOrderPrice(service: SocialService, quantity: number, globalMarkup: { percent: number; fixed: number }) {
  const basePrice = (Number(service.base_rate_thb || 0) / 1000) * quantity;
  const withService = basePrice * (1 + (Number(service.markup_percent || 0) / 100)) + Number(service.markup_fixed || 0);
  const withGlobal = withService * (1 + (Number(globalMarkup.percent || 0) / 100)) + Number(globalMarkup.fixed || 0);
  return Math.max(0, withGlobal);
}

function getCategoryIcon(slug: string) {
  const s = slug.toLowerCase();
  if (s.includes('facebook') || s.includes('fb')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img 
        src="https://img2.pic.in.th/pic/facebook76c1bf98409d9c0b.webp" 
        alt="Facebook" 
        className="size-4 object-contain"
      />
    );
  }
  if (s.includes('youtube') || s.includes('yt')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img 
        src="https://img2.pic.in.th/pic/youtube.webp" 
        alt="YouTube" 
        className="size-4 object-contain"
      />
    );
  }
  if (s.includes('instagram') || s.includes('ig')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img 
        src="https://img5.pic.in.th/file/secure-sv1/instagram.webp" 
        alt="Instagram" 
        className="size-4 object-contain"
      />
    );
  }
  if (s.includes('tiktok') || s.includes('tt')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img 
        src="https://img5.pic.in.th/file/secure-sv1/tiktokd8024daf13b9c1e8.webp" 
        alt="TikTok" 
        className="size-4 object-contain"
      />
    );
  }
  return null;
}

function SocialServicesBrowser({ services, categories, globalMarkup, isLoading }: Props & { isLoading?: boolean }) {
  const router = useRouter();
  const [socialFilter, setSocialFilter] = useState<'all' | 'facebook' | 'tiktok' | 'youtube' | 'instagram'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryComboboxOpen, setCategoryComboboxOpen] = useState(false);
  const [serviceComboboxOpen, setServiceComboboxOpen] = useState(false);
  const itemsPerPage = 30;

  const filteredCategories = useMemo(() => {
    if (socialFilter === 'all') return categories;

    const keywordMap: Record<string, string[]> = {
      facebook: ['facebook', 'fb'],
      tiktok: ['tiktok', 'tt'],
      youtube: ['youtube', 'yt'],
      instagram: ['instagram', 'ig']
    };

    const keywords = keywordMap[socialFilter] || [];
    return categories.filter((cat) => {
      const catLower = cat.name.toLowerCase();
      const slugLower = cat.slug.toLowerCase();
      return keywords.some((kw) => catLower.includes(kw) || slugLower.includes(kw));
    });
  }, [categories, socialFilter]);

  const categoryServices = useMemo(() => {
    let filtered: SocialService[] = [];

    if (selectedCategoryId === 'all') {
      if (socialFilter === 'all') {
        filtered = services;
      } else {
        // กรองตาม socialFilter
        const keywordMap: Record<string, string[]> = {
          facebook: ['facebook', 'fb'],
          tiktok: ['tiktok', 'tt'],
          youtube: ['youtube', 'yt'],
          instagram: ['instagram', 'ig']
        };
        const keywords = keywordMap[socialFilter] || [];
        const filteredCatIds = categories
          .filter((cat) => {
            const catLower = cat.name.toLowerCase();
            const slugLower = cat.slug.toLowerCase();
            return keywords.some((kw) => catLower.includes(kw) || slugLower.includes(kw));
          })
          .map((cat) => cat.id);
        filtered = services.filter((svc) => svc.category_id && filteredCatIds.includes(svc.category_id));
      }
    } else {
      filtered = services.filter((svc) => svc.category_id === selectedCategoryId);
    }

    return filtered;
  }, [services, selectedCategoryId, socialFilter, categories]);

  const filteredServices = useMemo(() => {
    const text = search.trim().toLowerCase();
    return categoryServices.filter((svc) => {
      const matchText = !text || [svc.display_name, svc.name, String(svc.provider_service_id)].some((val) => val.toLowerCase().includes(text));
      return matchText;
    });
  }, [categoryServices, search]);

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(start, start + itemsPerPage);
  }, [filteredServices, currentPage]);

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryId, search, socialFilter]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleOrder = (serviceId: number) => {
    router.push(`/social/order/add?service=${serviceId}`);
  };

  return (
    <div className="space-y-8">
      <section className="card p-5 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">ปั้มโซเชียล</h1>
          <p className="text-sm text-[color:var(--text)]/70">เลือกบริการที่ต้องการและกรอกรายละเอียดเพื่อสั่งซื้อทันที</p>
        </div>

        {/* Social Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSocialFilter('facebook');
              setSelectedCategoryId('all');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              socialFilter === 'facebook'
                ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                : 'border-white/15 text-[color:var(--text)]/70 hover:bg-white/5'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://img2.pic.in.th/pic/facebook76c1bf98409d9c0b.webp" 
              alt="Facebook" 
              className="size-4 object-contain"
            />
            <span>Facebook</span>
          </button>
          <button
            onClick={() => {
              setSocialFilter('tiktok');
              setSelectedCategoryId('all');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              socialFilter === 'tiktok'
                ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                : 'border-white/15 text-[color:var(--text)]/70 hover:bg-white/5'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://img5.pic.in.th/file/secure-sv1/tiktokd8024daf13b9c1e8.webp" 
              alt="TikTok" 
              className="size-4 object-contain"
            />
            <span>TikTok</span>
          </button>
          <button
            onClick={() => {
              setSocialFilter('youtube');
              setSelectedCategoryId('all');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              socialFilter === 'youtube'
                ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                : 'border-white/15 text-[color:var(--text)]/70 hover:bg-white/5'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://img2.pic.in.th/pic/youtube.webp" 
              alt="YouTube" 
              className="size-4 object-contain"
            />
            <span>YouTube</span>
          </button>
          <button
            onClick={() => {
              setSocialFilter('instagram');
              setSelectedCategoryId('all');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              socialFilter === 'instagram'
                ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                : 'border-white/15 text-[color:var(--text)]/70 hover:bg-white/5'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://img5.pic.in.th/file/secure-sv1/instagram.webp" 
              alt="Instagram" 
              className="size-4 object-contain"
            />
            <span>Instagram</span>
          </button>
          <button
            onClick={() => {
              setSocialFilter('all');
              setSelectedCategoryId('all');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              socialFilter === 'all'
                ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                : 'border-white/15 text-[color:var(--text)]/70 hover:bg-white/5'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://img5.pic.in.th/file/secure-sv1/social-media.webp" 
              alt="ทั้งหมด" 
              className="size-4 object-contain"
            />
            <span>ทั้งหมด</span>
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-2">
            <Popover open={serviceComboboxOpen} onOpenChange={setServiceComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={serviceComboboxOpen}
                  className="w-full justify-between"
                >
                  {selectedServiceId
                    ? filteredServices.find((svc) => svc.id === selectedServiceId)?.display_name || 'เลือกบริการ'
                    : `ค้นหาหรือเลือกบริการ${filteredServices.length > 0 ? ` (${filteredServices.length} รายการ)` : ''}`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command className="w-full">
                  <CommandInput 
                    placeholder="ค้นหาชื่อบริการหรือ ID..." 
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    <CommandEmpty>ไม่พบบริการที่ตรงกับการค้นหา</CommandEmpty>
                    <CommandGroup>
                      {filteredServices.map((svc) => (
                        <CommandItem
                          key={svc.id}
                          value={`${svc.display_name} ${svc.name} ${svc.provider_service_id}`}
                          onSelect={() => {
                            const newValue = svc.id === selectedServiceId ? '' : svc.id;
                            setSelectedServiceId(newValue);
                            setServiceComboboxOpen(false);
                            if (newValue) {
                              handleOrder(svc.id);
                            }
                          }}
                        >
                          <div className="flex flex-1 items-center justify-between w-full">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{svc.display_name}</div>
                              <div className="text-xs text-[color:var(--text)]/50">ID: {svc.provider_service_id}</div>
                            </div>
                            <Check
                              className={cn(
                                'ml-2 h-4 w-4 shrink-0',
                                selectedServiceId === svc.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Popover open={categoryComboboxOpen} onOpenChange={setCategoryComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryComboboxOpen}
                  className="w-full justify-between"
                >
                  {selectedCategoryId === 'all'
                    ? `เลือกหมวดหมู่${filteredCategories.length > 0 ? ` (${filteredCategories.length} รายการ)` : ''}`
                    : filteredCategories.find((cat) => cat.id === selectedCategoryId)?.name || 'เลือกหมวดหมู่'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command className="w-full">
                  <CommandInput placeholder="ค้นหาหมวดหมู่..." />
                  <CommandList>
                    <CommandEmpty>ไม่พบหมวดหมู่ที่ตรงกับการค้นหา</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedCategoryId('all');
                          setCategoryComboboxOpen(false);
                        }}
                      >
                        <div className="flex flex-1 items-center justify-between w-full">
                          <div className="font-medium">ทั้งหมด</div>
                          <Check
                            className={cn(
                              'ml-2 h-4 w-4 shrink-0',
                              selectedCategoryId === 'all' ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </div>
                      </CommandItem>
                      {filteredCategories.map((cat) => (
                        <CommandItem
                          key={cat.id}
                          value={`${cat.name} ${cat.slug}`}
                          onSelect={() => {
                            const newValue = cat.id === selectedCategoryId ? 'all' : cat.id;
                            setSelectedCategoryId(newValue === 'all' ? 'all' : newValue);
                            setCategoryComboboxOpen(false);
                          }}
                        >
                          <div className="flex flex-1 items-center justify-between w-full">
                            <div className="font-medium truncate">{cat.name}</div>
                            <Check
                              className={cn(
                                'ml-2 h-4 w-4 shrink-0',
                                selectedCategoryId === cat.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {isLoading ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90 min-w-[200px] max-w-[400px]">ชื่อบริการ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">ราคา (ต่อ 1000)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">จำนวนขั้นต่ำ</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">จำนวนสูงสุด</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">Refill</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">Cancel</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-16 mx-auto" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-16 mx-auto" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-5 mx-auto rounded-full" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-5 mx-auto rounded-full" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-8 w-20 mx-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : filteredServices.length === 0 ? (
          <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users className="size-6" />
              </EmptyMedia>
              <EmptyTitle>ไม่พบบริการที่ตรงกับการค้นหา</EmptyTitle>
              <EmptyDescription>
                ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่น
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={() => { setSearch(''); setSelectedCategoryId('all'); setSocialFilter('all'); }}>
                <RefreshCcw className="size-4" />
                รีเซ็ตการค้นหา
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-[color:var(--text)]/90 min-w-[200px] sm:min-w-[250px] max-w-[400px] sm:max-w-[450px]">ชื่อบริการ</th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">ราคา (ต่อ 1000)</th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">จำนวนขั้นต่ำ</th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">จำนวนสูงสุด</th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">Refill</th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">Cancel</th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-[color:var(--text)]/90 whitespace-nowrap">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {paginatedServices.map((svc, index) => {
                      // ใช้ price_per_1000 ที่คำนวณไว้แล้ว หรือคำนวณใหม่ถ้าไม่มี
                      const pricePerThousand = svc.price_per_1000 || computeOrderPrice(svc, 1000, globalMarkup);
                      return (
                        <AnimatedSocialServiceRow
                          key={svc.id}
                          service={{ ...svc, price_per_1000: pricePerThousand }}
                          index={index}
                          formatCurrency={formatCurrency}
                          onOrder={handleOrder}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-white/10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="size-4" />
                  ก่อนหน้า
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[40px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-2"
                >
                  ถัดไป
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
            {totalPages > 1 && (
              <div className="text-center text-sm text-[color:var(--text)]/60 mt-2">
                หน้า {currentPage} / {totalPages} (แสดง {paginatedServices.length} จาก {filteredServices.length} รายการ)
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default memo(SocialServicesBrowser);
