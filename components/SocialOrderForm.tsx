'use client';

import { useMemo, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { InfoIcon, AlertTriangle, FileText, Sparkles, Search, Check, ChevronsUpDown } from 'lucide-react';
// Removed: import { Facebook, Youtube, Instagram } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import SocialOrdersList from '@/components/SocialOrdersList';
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
  provider_service_id: string;
  name: string;
  display_name: string;
  category_id: number | null;
  price_per_1000: number;
  base_rate_thb: number;
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
  initialServiceId?: number;
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
  return null;
}

export default function SocialOrderForm({ services, categories, globalMarkup, initialServiceId }: Props) {
  const toast = useToast();
  const [socialFilter, setSocialFilter] = useState<'all' | 'facebook' | 'tiktok' | 'youtube' | 'instagram'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>(initialServiceId || '');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'instructions' | 'history'>('instructions');
  const [serviceComboboxOpen, setServiceComboboxOpen] = useState(false);
  const [categoryComboboxOpen, setCategoryComboboxOpen] = useState(false);

  useEffect(() => {
    if (initialServiceId) {
      const svc = services.find((s) => s.id === initialServiceId);
      if (svc) {
        setSelectedServiceId(svc.id);
        setSelectedCategoryId(svc.category_id || 'all');
        setQuantity(svc.min_quantity);
        // ตรวจสอบว่า service นี้อยู่ในหมวดหมู่ไหนและตั้ง socialFilter
        if (svc.category_id) {
          const cat = categories.find((c) => c.id === svc.category_id);
          if (cat) {
            const catLower = cat.name.toLowerCase();
            const slugLower = cat.slug.toLowerCase();
            if (catLower.includes('facebook') || slugLower.includes('facebook') || catLower.includes('fb') || slugLower.includes('fb')) {
              setSocialFilter('facebook');
            } else if (catLower.includes('tiktok') || slugLower.includes('tiktok') || catLower.includes('tt')) {
              setSocialFilter('tiktok');
            } else if (catLower.includes('youtube') || slugLower.includes('youtube') || catLower.includes('yt')) {
              setSocialFilter('youtube');
            } else if (catLower.includes('instagram') || slugLower.includes('instagram') || catLower.includes('ig')) {
              setSocialFilter('instagram');
            }
          }
        }
      }
    }
  }, [initialServiceId, services, categories]);

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

  const selectedService = useMemo(() => {
    if (!selectedServiceId) return null;
    return services.find((svc) => svc.id === selectedServiceId) || null;
  }, [services, selectedServiceId]);

  const totalPrice = useMemo(() => {
    if (!selectedService || !quantity) return 0;
    return computeOrderPrice(selectedService, quantity, globalMarkup);
  }, [selectedService, quantity, globalMarkup]);

  const mainCategories = useMemo(() => {
    const catMap = new Map<number, SocialCategory>();
    categories.forEach((cat) => catMap.set(cat.id, cat));
    
    const fbCat = Array.from(catMap.values()).find((c) => c.slug.toLowerCase().includes('facebook') || c.name.toLowerCase().includes('facebook'));
    const tiktokCat = Array.from(catMap.values()).find((c) => c.slug.toLowerCase().includes('tiktok') || c.name.toLowerCase().includes('tiktok'));
    const ytCat = Array.from(catMap.values()).find((c) => c.slug.toLowerCase().includes('youtube') || c.name.toLowerCase().includes('youtube'));
    const igCat = Array.from(catMap.values()).find((c) => c.slug.toLowerCase().includes('instagram') || c.name.toLowerCase().includes('instagram'));

    return {
      facebook: fbCat,
      tiktok: tiktokCat,
      youtube: ytCat,
      instagram: igCat
    };
  }, [categories]);

  const handleSubmit = async () => {
    if (!selectedService) {
      toast.show({ title: 'กรุณาเลือกบริการ', variant: 'destructive' });
      return;
    }
    if (!link.trim()) {
      toast.show({ title: 'กรุณากรอกลิงก์', variant: 'destructive' });
      return;
    }
    if (!quantity || quantity < selectedService.min_quantity || quantity > selectedService.max_quantity) {
      toast.show({
        title: 'จำนวนไม่ตรงตามเงื่อนไข',
        description: `ขั้นต่ำ ${selectedService.min_quantity} สูงสุด ${selectedService.max_quantity}`
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/social/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          link: link.trim(),
          quantity
        })
      });
      const json = await res.json();
      if (!res.ok) {
        toast.show({
          title: 'สั่งซื้อไม่สำเร็จ',
          description: json.detail || json.error || 'กรุณาลองใหม่',
          variant: 'destructive'
        });
        return;
      }
      toast.show({ title: 'สร้างคำสั่งซื้อสำเร็จ', description: `หมายเลขออเดอร์ ${json.order?.id ?? '-'}` });
      
      // อัพเดท wallet balance ทันที
      window.dispatchEvent(new Event('wallet:changed'));
      
      setLink('');
      setQuantity(0);
      setSelectedServiceId('');
    } catch (error) {
      console.error(error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'โปรดลองใหม่', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Panel - Order Form */}
      <div className="lg:w-2/5 lg:flex-shrink-0 space-y-6">
        <div className="card p-6 lg:p-8 space-y-6">
          <h2 className="text-xl font-semibold">เพิ่มใหม่</h2>
          
          {/* Category Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSocialFilter('facebook');
                setSelectedCategoryId('all');
                setSelectedServiceId('');
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
                setSelectedServiceId('');
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
                setSelectedServiceId('');
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
                setSelectedServiceId('');
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
                setSelectedServiceId('');
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

          {/* Category Combobox */}
          <div className="space-y-2">
            <Label htmlFor="category">หมวดหมู่</Label>
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
                          setSelectedServiceId('');
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
                            setSelectedServiceId('');
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

          {/* Service Combobox */}
          <div className="space-y-2">
            <Label htmlFor="service">บริการสั่งซื้อ</Label>
            <Popover open={serviceComboboxOpen} onOpenChange={setServiceComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={serviceComboboxOpen}
                  className="w-full justify-between"
                >
                  {selectedServiceId
                    ? categoryServices.find((svc) => svc.id === selectedServiceId)?.display_name || 'เลือกบริการ'
                    : `เลือกบริการ${categoryServices.length > 0 ? ` (${categoryServices.length} รายการ)` : ''}`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command className="w-full">
                  <CommandInput placeholder="ค้นหาชื่อบริการหรือ ID..." />
                  <CommandList>
                    <CommandEmpty>ไม่พบบริการที่ตรงกับการค้นหา</CommandEmpty>
                    <CommandGroup>
                      {categoryServices.map((svc) => (
                        <CommandItem
                          key={svc.id}
                          value={`${svc.display_name} ${svc.name} ${svc.provider_service_id}`}
                          onSelect={() => {
                            const newValue = svc.id === selectedServiceId ? '' : svc.id;
                            setSelectedServiceId(newValue);
                            if (newValue) {
                              setQuantity(svc.min_quantity);
                            } else {
                              setQuantity(0);
                            }
                            setServiceComboboxOpen(false);
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

          {/* Link Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="link">ลิงค์</Label>
              <InfoIcon className="size-4 text-[color:var(--text)]/40" />
            </div>
            <Input
              id="link"
              type="url"
              placeholder="https://"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="size-3" />
              สำคัญมาก! โปรดใส่ลิงก์ให้ถูกต้องตามรูปแบบ และโพสต์ต้องเป็นสาธารณะ
            </p>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">จำนวน</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity || ''}
              min={selectedService?.min_quantity || 0}
              max={selectedService?.max_quantity || 999999}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (Number.isFinite(val) && val >= 0) {
                  setQuantity(val);
                }
              }}
            />
            {selectedService && (
              <p className="text-xs text-[color:var(--text)]/50">
                ขั้นต่ำ: {selectedService.min_quantity.toLocaleString()} | สูงสุด: {selectedService.max_quantity.toLocaleString()}
              </p>
            )}
          </div>

          {/* Total Cost */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--text)]/70">ค่าใช้จ่ายทั้งหมด:</span>
              <span className="text-xl font-bold text-[color:var(--text)]">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedService || !link.trim() || !quantity}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            size="lg"
          >
            {submitting ? (
              <>
                <Spinner className="size-4 mr-2" />
                กำลังสั่งซื้อ...
              </>
            ) : (
              'สั่งซื้อ'
            )}
          </Button>
        </div>
      </div>

      {/* Right Panel - Instructions */}
      <div className="lg:w-3/5 lg:flex-shrink-0">
        <div className="card p-6 lg:p-8 min-h-[600px]">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10 mb-6">
            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === 'instructions'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-[color:var(--text)]/60 hover:text-[color:var(--text)]'
              }`}
            >
              คำแนะนำ
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-[color:var(--text)]/60 hover:text-[color:var(--text)]'
              }`}
            >
              ประวัติออเดอร์
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'instructions' && (
            <div className="space-y-6">
              {/* ข้อมูลสำคัญ */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <InfoIcon className="size-5 text-blue-400" />
                  ข้อมูลสำคัญ
                </h3>
                <ul className="space-y-2 text-sm text-[color:var(--text)]/70">
                  <li>• ราคาแสดงเป็นราคาต่อ 1,000 ยูนิต (เช่น 1,000 ไลค์ = 120 บาท)</li>
                  <li>• บริการบางรายการอาจใช้เวลาบ้าง กรุณาอดทนรอ</li>
                  <li>• สอบถามเพิ่มเติมได้ผ่านช่องทางติดต่อของเรา</li>
                </ul>
              </section>

              {/* วิธีการกรอกข้อมูล */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="size-5 text-green-400" />
                  วิธีการกรอกข้อมูล
                </h3>
                <div className="space-y-3 text-sm text-[color:var(--text)]/70">
                  <p>• กรอกจำนวนตามขั้นต่ำที่กำหนด (จำนวนเต็มเท่านั้น)</p>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="font-semibold mb-2 text-[color:var(--text)]">ตัวอย่าง:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• ขั้นต่ำ 100 → ใส่ได้ 100, 200, 500, 1000</li>
                      <li>• ขั้นต่ำ 500 → ใส่ได้ 500, 600, 1000, 1500</li>
                      <li>• ขั้นต่ำ 1000 → ใส่ได้ 1000, 1500, 2000</li>
                    </ul>
                  </div>
                  <p className="text-red-400 flex items-start gap-2">
                    <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
                    <span>ห้ามใส่จำนวนเศษส่วน หากกรอกผิดจะไม่คืนเงิน</span>
                  </p>
                </div>
              </section>

              {/* ข้อควรระวัง */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-400">
                  <AlertTriangle className="size-5" />
                  ข้อควรระวัง
                </h3>
                <div className="space-y-3 text-sm text-red-400">
                  <p>
                    • อย่าสั่งซื้อซ้ำสำหรับลิ้งค์เดียวกันก่อนที่ออเดอร์ก่อนหน้าจะเสร็จสมบูรณ์
                  </p>
                  <p>
                    • ตรวจสอบลิ้งค์ให้ถูกต้อง ก่อนกดยืนยัน (ใส่ลิ้งค์ผิดไม่สามารถคืนเงินได้)
                  </p>
                  <p>
                    • กรุณาใส่ลิ้งค์ให้ตรงกับประเภทบริการที่เลือก
                  </p>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <SocialOrdersList />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

