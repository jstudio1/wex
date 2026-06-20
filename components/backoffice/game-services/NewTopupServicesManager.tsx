'use client';

import { useEffect, useMemo, useState } from 'react';
import { Settings2, SearchIcon, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import PricingDialog from '@/components/backoffice/PricingDialog';
import FlashSaleSettingsDialog from '@/components/backoffice/FlashSaleSettingsDialog';
import { Spinner } from '@/components/ui/spinner';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Progress } from '@/components/ui/progress';

type Product = {
	id: number;
	name: string;
	key: string;
	is_published: boolean;
	image_url: string | null;
	banner_url: string | null;
	icon_url: string | null;
	tutorial_video_url: string | null;
	tutorial_video_thumbnail_url: string | null;
	badge_enabled: boolean;
	badge_percent: number | null;
	badge_text: string | null;
	badge_apply_price: boolean;
	is_flashsale: boolean;
	flashsale_price: number | null;
};

type Category = {
	id: number;
	name: string;
	slug: string;
};

type ProductCategoryMap = Map<number, number[]>;


type ProductFormState = {
  name: string;
  image_url: string;
  banner_url: string;
  icon_url: string;
  tutorial_video_url: string;
  tutorial_video_thumbnail_url: string;
  is_published: boolean;
  badge_enabled: boolean;
  badge_percent: string;
  badge_text: string;
  badge_apply_price: boolean;
  categories: number[];
};

const defaultForm: ProductFormState = {
  name: '',
  image_url: '',
  banner_url: '',
  icon_url: '',
  tutorial_video_url: '',
  tutorial_video_thumbnail_url: '',
  is_published: false,
  badge_enabled: false,
  badge_percent: '',
  badge_text: '',
  badge_apply_price: false,
  categories: [],
};

export default function NewTopupServicesManager() {
  const toast = useToast();
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [products, setProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [productCategories, setProductCategories] = useState<ProductCategoryMap>(new Map());

	const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
	const [query, setQuery] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductFormState>(defaultForm);
  const [editSaving, setEditSaving] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pricingProductId, setPricingProductId] = useState<number | null>(null);
  const [flashSaleDialogOpen, setFlashSaleDialogOpen] = useState(false);
  const [selectedFlashSaleProduct, setSelectedFlashSaleProduct] = useState<Product | null>(null);
  
  // State สำหรับ dialog เลือกเกม
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [games, setGames] = useState<Array<{ company_id: string; company_name: string; exists: boolean }>>([]);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
  const [loadingGames, setLoadingGames] = useState(false);
  const [gameSearch, setGameSearch] = useState('');
  
  // State สำหรับ sync progress
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncController, setSyncController] = useState<AbortController | null>(null);
  
  // State สำหรับ sync options
  const [resetProductName, setResetProductName] = useState(false);
  const [resetItemName, setResetItemName] = useState(false);
  const [resetPrice, setResetPrice] = useState(false);
  const [resetInputs, setResetInputs] = useState(false);
  const [deleteRemoved, setDeleteRemoved] = useState(true);

	useEffect(() => {
		fetchAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filter]);

	const fetchAll = async () => {
		setLoading(true);
		setError(null);
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);

			// ส่ง product_type=gtopup เพื่อดึงเฉพาะเกม
			const [p, c, pc] = await Promise.all([
				fetch(`/api/admin/products?filter=${filter}&product_type=gtopup`, { signal: controller.signal }),
				fetch('/api/admin/categories', { signal: controller.signal }),
				fetch('/api/admin/products/categories', { signal: controller.signal }),
			]);

			clearTimeout(timeoutId);

			if (!p.ok) throw new Error((await p.json().catch(() => ({}))).error || 'โหลดบริการไม่สำเร็จ');
			if (!c.ok) throw new Error((await c.json().catch(() => ({}))).error || 'โหลดหมวดหมู่ไม่สำเร็จ');

			const pj = await p.json();
			const cj = await c.json();
			const pcj = pc.ok ? await pc.json() : { data: [] };

			setProducts(pj.data || []);
			setCategories(cj.data || []);

			const map: ProductCategoryMap = new Map();
			for (const row of pcj.data || []) {
				const pid = row.product_id as number;
				const cid = row.category_id as number;
				const arr = map.get(pid) || [];
				arr.push(cid);
				map.set(pid, arr);
			}
			setProductCategories(map);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
			setProducts([]);
			setCategories([]);
			setProductCategories(new Map());
		} finally {
			setLoading(false);
		}
	};

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
    const list = products.filter((p) =>
      filter === 'all'
        ? true
        : filter === 'published'
          ? p.is_published
          : !p.is_published
    );
    if (!q) return list;
    return list.filter((p) => p.name?.toLowerCase().includes(q) || p.key?.toLowerCase().includes(q));
  }, [products, query, filter]);

  const fetchGames = async () => {
    setLoadingGames(true);
		try {
      // ดึงข้อมูลใหม่จาก wePAY API ทุกครั้ง (ไม่ใช้ cache)
      const res = await fetch(`/api/admin/products/list?product_type=gtopup`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('ไม่สามารถดึงรายชื่อเกมได้');
      }
      const json = await res.json();
      setGames(json.data || []);
      // เลือกทั้งหมดโดย default
      setSelectedGames(new Set((json.data || []).map((g: any) => g.company_id)));
    } catch (err) {
      toast.show({
        title: 'โหลดรายชื่อเกมไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
        variant: 'destructive',
      });
      setGames([]);
    } finally {
      setLoadingGames(false);
    }
  };

  const handleOpenSyncDialog = () => {
    setSyncDialogOpen(true);
    fetchGames();
  };

  const handleToggleGame = (companyId: string) => {
    setSelectedGames((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
    } else {
        newSet.add(companyId);
    }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedGames(new Set(games.map((g) => g.company_id)));
  };

  const handleDeselectAll = () => {
    setSelectedGames(new Set());
  };

  const runSync = async (companyIds: string[]) => {
		setSyncing(true);
		setSyncProgress(0);
		setSyncStatus('กำลังเริ่ม sync...');
		
		const controller = new AbortController();
		setSyncController(controller);
		
		// เพิ่ม timeout เป็น 6 นาที (360,000 ms) เพื่อให้สอดคล้องกับ server-side timeout
		const timeoutId = setTimeout(() => controller.abort(), 360000);
		
		// Simulate progress (เนื่องจาก API ไม่ได้ส่ง progress กลับมา)
		const progressInterval = setInterval(() => {
			setSyncProgress((prev) => {
				if (prev >= 90) return prev; // หยุดที่ 90% รอ response
				return prev + Math.random() * 5;
			});
		}, 500);
		
		try {
			// ส่ง product_type=gtopup และ company_ids ที่เลือก
			const url = new URL('/api/admin/products/sync', window.location.origin);
			url.searchParams.set('product_type', 'gtopup');
			
			setSyncStatus(`กำลัง sync ${companyIds.length} เกม...`);
			
			const res = await fetch(url.toString(), { 
				method: 'POST',
        headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ company_ids: companyIds, resetProductName, resetItemName, resetPrice, resetInputs, deleteRemoved }),
				signal: controller.signal 
      });
			
			clearInterval(progressInterval);
			clearTimeout(timeoutId);
			
      if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.detail || j.error || 'Sync ไม่สำเร็จ');
      }
			
			setSyncProgress(100);
			setSyncStatus('Sync สำเร็จ!');
			
			const data = await res.json();
			toast.show({ 
				title: 'Sync สำเร็จ', 
				description: `Sync ${companyIds.length} เกมเรียบร้อยแล้ว${data.counts ? `: ${data.counts.products} สินค้า, ${data.counts.items} รายการ` : ''}` 
			});
			
			await fetchAll();
			
			// ปิด dialog หลังจาก 1.5 วินาที
			setTimeout(() => {
				setSyncDialogOpen(false);
				setSyncProgress(0);
				setSyncStatus('');
			}, 1500);
			
      return true;
    } catch (err) {
			clearInterval(progressInterval);
			setSyncProgress(0);
			setSyncStatus('');
			
			if ((err as Error).name === 'AbortError') {
      toast.show({
					title: 'Sync ถูกยกเลิก',
					description: 'การ Sync ถูกยกเลิกโดยผู้ใช้',
					variant: 'destructive',
				});
			} else {
				toast.show({
					title: 'Sync ไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
        variant: 'destructive',
      });
			}
      return false;
    } finally {
			setSyncing(false);
			setSyncController(null);
		}
	};

  const handleCancelSync = () => {
		if (syncController) {
			syncController.abort();
			setSyncController(null);
		}
		setSyncing(false);
		setSyncProgress(0);
		setSyncStatus('');
  };

  const handleConfirmSync = async () => {
    if (selectedGames.size === 0) {
      toast.show({
        title: 'กรุณาเลือกเกม',
        description: 'กรุณาเลือกเกมอย่างน้อย 1 เกม',
        variant: 'destructive',
      });
      return;
    }
    // ไม่ปิด dialog เพื่อแสดง progress
    await runSync(Array.from(selectedGames));
  };


	const handlePublishAll = async () => {
		if (!confirm('คุณต้องการเผยแพร่ทุกเกมที่ยังไม่เผยแพร่หรือไม่?')) return;
		try {
			const res = await fetch('/api/admin/products/publish-all', { method: 'POST' });
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || 'เผยแพร่ไม่สำเร็จ');
			}
      toast.show({ title: 'เผยแพร่สำเร็จ', description: 'เผยแพร่ทุกเกมแล้ว' });
      await fetchAll();
    } catch (err) {
      toast.show({ title: 'เผยแพร่ไม่สำเร็จ', description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', variant: 'destructive' });
    }
  };

  const openEditModal = (product: Product) => {
    const cats = productCategories.get(product.id) || [];
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      image_url: product.image_url || '',
      banner_url: product.banner_url || '',
      icon_url: product.icon_url || '',
      tutorial_video_url: product.tutorial_video_url || '',
      tutorial_video_thumbnail_url: product.tutorial_video_thumbnail_url || '',
      is_published: product.is_published,
      badge_enabled: product.badge_enabled,
      badge_percent: product.badge_percent != null ? String(product.badge_percent) : '',
      badge_text: product.badge_text || '',
      badge_apply_price: product.badge_apply_price,
      categories: cats,
    });
    setEditDialogOpen(true);
  };

  const closeEditModal = () => {
    setEditDialogOpen(false);
    setEditingProduct(null);
    setEditForm(defaultForm);
  };

  const updateEditForm = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setEditForm((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-fill thumbnail from YouTube URL
      if (field === 'tutorial_video_url' && typeof value === 'string') {
        const videoId = extractYouTubeVideoId(value);
        if (videoId && !prev.tutorial_video_thumbnail_url) {
          updated.tutorial_video_thumbnail_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      }
      
      return updated;
    });
  };

  // Extract YouTube video ID from various URL formats or just video ID
  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url || typeof url !== 'string') return null;
    
    const trimmed = url.trim();
    
    // ถ้าเป็นแค่ video ID (11 ตัวอักษร)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Remove iframe tags if present
    const cleanUrl = trimmed.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    
    // Patterns to match YouTube video IDs
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  // Normalize YouTube URL to embed format
  const normalizeVideoUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return url;
    
    const trimmed = url.trim();
    if (!trimmed) return url;
    
    // ถ้าเป็น embed URL อยู่แล้ว ให้คืนค่าเดิม
    if (trimmed.includes('youtube.com/embed/')) {
      return trimmed;
    }
    
    // ดึง video ID
    const videoId = extractYouTubeVideoId(trimmed);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // ถ้าไม่สามารถแปลงได้ ให้คืนค่าเดิม
    return url;
  };

  const toggleCategoryInForm = (id: number) => {
    setEditForm((prev) => {
      const exists = prev.categories.includes(id);
      return {
        ...prev,
        categories: exists ? prev.categories.filter((cid) => cid !== id) : [...prev.categories, id],
      };
    });
  };

  const handleEditSubmit = async () => {
    if (!editingProduct) return;
    setEditSaving(true);
    try {
      const payload = {
        id: editingProduct.id,
        name: editForm.name.trim(),
        image_url: editForm.image_url.trim() || null,
        banner_url: editForm.banner_url.trim() || null,
        icon_url: editForm.icon_url.trim() || null,
        tutorial_video_url: editForm.tutorial_video_url.trim() || null,
        tutorial_video_thumbnail_url: editForm.tutorial_video_thumbnail_url.trim() || null,
        is_published: editForm.is_published,
        badge_enabled: editForm.badge_enabled,
        badge_percent: editForm.badge_percent.trim().length
          ? Math.max(0, Math.round(Number(editForm.badge_percent)))
          : null,
        badge_text: editForm.badge_text.trim() || null,
        badge_apply_price: editForm.badge_apply_price,
        categories: editForm.categories,
      };

      const res = await fetch('/api/admin/products/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: [payload] }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({ title: 'บันทึกสำเร็จ', description: 'อัปเดตบริการเรียบร้อย' });
      closeEditModal();
			await fetchAll();
		} catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: err instanceof Error ? err.message : 'ไม่สามารถบันทึกได้', variant: 'destructive' });
    } finally {
      setEditSaving(false);
		}
	};

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h2 className="text-2xl font-bold text-white">จัดการบริการเติมเกม</h2>
					<p className="text-sm text-gray-400">จัดการรายการสินค้าต่างๆ</p>
				</div>
				<div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePublishAll} disabled={loading}>
						เผยแพร่ทุกเกม
          </Button>
          <Button variant="outline" onClick={handleOpenSyncDialog} disabled={syncing}>
						{syncing ? 'กำลังซิงก์...' : 'Sync จากผู้ให้บริการ'}
          </Button>
				</div>
			</div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] max-w-md">
          <InputGroup>
            <InputGroupInput
					placeholder="ค้นหาชื่อหรือคีย์บริการ..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon size={16} />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={filter === 'all' ? 'default' : 'outline'}
						onClick={() => setFilter('all')}
					>
						ทั้งหมด
          </Button>
          <Button
            type="button"
            variant={filter === 'published' ? 'default' : 'outline'}
						onClick={() => setFilter('published')}
					>
						ที่เผยแพร่
          </Button>
          <Button
            type="button"
            variant={filter === 'unpublished' ? 'default' : 'outline'}
						onClick={() => setFilter('unpublished')}
					>
						ที่ไม่เผยแพร่
          </Button>
				</div>
			</div>

			{error && (
				<div className="p-3 rounded border border-red-800 bg-red-900/30 text-sm text-red-400">
					{error}
				</div>
			)}

				{loading ? (
        renderSkeleton()
				) : filtered.length === 0 ? (
        <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Settings2 className="size-6" />
            </EmptyMedia>
            <EmptyTitle>ไม่พบบริการ</EmptyTitle>
            <EmptyDescription>ลองค้นหาด้วยคำอื่น หรือซิงก์ข้อมูลอีกครั้ง</EmptyDescription>
          </EmptyHeader>
        </Empty>
				) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
						{filtered.map((p) => {
            const catsForProduct = productCategories.get(p.id) || [];
            const labels = catsForProduct
              .map((cid) => categories.find((c) => c.id === cid)?.name)
              .filter(Boolean) as string[];
							return (
              <div
                key={p.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#111] to-[#050505] p-4 shadow-lg shadow-emerald-500/5"
              >
                <div className="flex items-start gap-3">
										{p.image_url ? (
											// eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded-xl object-cover border border-white/10" />
										) : (
                    <div className="h-14 w-14 rounded-xl border border-dashed border-white/10 bg-black/40 flex items-center justify-center text-xs text-white/50">
                      no img
                    </div>
										)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white line-clamp-2">{p.name}</h3>
                      {p.is_flashsale && (
                        <Badge variant="secondary" className="ml-auto bg-blue-500/20 text-blue-300 border-blue-500/30">
                          flash sale
                        </Badge>
                      )}
                      {p.badge_enabled && (
                        <Badge variant="secondary" className={p.is_flashsale ? '' : 'ml-auto'}>
                          {p.badge_text || `${p.badge_percent ?? 0}% OFF`}
                        </Badge>
                      )}
										</div>
                    <p className="text-xs text-gray-400 mt-1 truncate">key: {p.key}</p>
										</div>
									</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      p.is_published ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-800 text-gray-300 border border-gray-700'
                    }`}
                  >
											{p.is_published ? 'เผยแพร่' : 'ยังไม่เผยแพร่'}
										</span>
                  {labels.slice(0, 3).map((label) => (
                    <Badge key={label} variant="outline" className="border-white/15 text-gray-200">
                      {label}
                    </Badge>
                  ))}
                  {labels.length > 3 && (
                    <Badge variant="outline" className="border-white/15 text-gray-400">
                      +{labels.length - 3}
                    </Badge>
                  )}
									</div>
                <div className="mt-4 flex flex-col gap-2 text-xs text-gray-400">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Banner</span>
                    <span className="truncate max-w-[60%] text-right">{p.banner_url ? 'ตั้งค่าแล้ว' : '-'}</span>
											</div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Icon ราคา</span>
                    <span className="truncate max-w-[60%] text-right">{p.icon_url ? 'ตั้งค่าแล้ว' : '-'}</span>
											</div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">วิดีโอ</span>
                    <span className="truncate max-w-[60%] text-right">{p.tutorial_video_url ? 'ตั้งค่าแล้ว' : '-'}</span>
											</div>
										</div>
                <div className="mt-auto flex flex-col gap-2 pt-4">
                  <Button
                    variant="secondary"
                    className="w-full justify-center gap-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    onClick={() => openEditModal(p)}
                  >
                    <Settings2 className="size-4" />
                    แก้ไขบริการ
                  </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center border-white/20 text-white hover:bg-white/5"
                  onClick={() => {
                    setPricingProductId(p.id);
                    setPricingDialogOpen(true);
                  }}
                >
                  ตั้งค่าราคา
                </Button>
                <Button
                  variant="outline"
                  className={`w-full justify-center gap-2 ${
                    p.is_flashsale
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      : 'border-white/20 text-white hover:bg-white/5'
                  }`}
                  onClick={() => {
                    setSelectedFlashSaleProduct(p);
                    setFlashSaleDialogOpen(true);
                  }}
                >
                  <Zap className="size-4" />
                  Flash Sale
                </Button>
									</div>
								</div>
							);
						})}
					</div>
				)}

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (open) setEditDialogOpen(true);
          else closeEditModal();
        }}
      >
        <DialogContent className="max-w-3xl bg-[#050505] border border-white/15">
          <DialogHeader>
            <DialogTitle>แก้ไขบริการเติมเกม</DialogTitle>
            <p className="text-sm text-gray-400">ปรับรายละเอียดการแสดงผลและหมวดหมู่</p>
          </DialogHeader>
          {editingProduct ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-gray-400">ชื่อบริการ</label>
                  <Input value={editForm.name} onChange={(e) => updateEditForm('name', e.target.value)} className="mt-1" />
                </div>
                <div className="rounded-xl border border-white/10 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">สถานะการเผยแพร่</p>
                    <p className="text-xs text-gray-400 mt-1">กำหนดว่าจะให้ลูกค้าเห็นหรือไม่</p>
                  </div>
                  <Switch checked={editForm.is_published} onCheckedChange={(checked) => updateEditForm('is_published', checked)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-gray-400">รูปไอคอน</label>
                  <Input value={editForm.image_url} onChange={(e) => updateEditForm('image_url', e.target.value)} className="mt-1" placeholder="URL รูปไอคอน" />
                </div>
                <div>
                  <label className="text-xs uppercase text-gray-400">Icon ราคา</label>
                  <Input value={editForm.icon_url} onChange={(e) => updateEditForm('icon_url', e.target.value)} className="mt-1" placeholder="URL icon ราคา" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase text-gray-400">รูป Banner</label>
                  <Input value={editForm.banner_url} onChange={(e) => updateEditForm('banner_url', e.target.value)} className="mt-1" placeholder="URL Banner" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase text-gray-400">วิดีโอวิธีการเติม</label>
                  <Input 
                    value={editForm.tutorial_video_url} 
                    onChange={(e) => {
                      const value = e.target.value;
                      
                      // แปลงเป็น embed URL อัตโนมัติ
                      const normalizedUrl = normalizeVideoUrl(value);
                      
                      updateEditForm('tutorial_video_url', normalizedUrl);
                      
                      // Auto-fill thumbnail if empty
                      if (value && !editForm.tutorial_video_thumbnail_url) {
                        const videoId = extractYouTubeVideoId(value);
                        if (videoId) {
                          updateEditForm('tutorial_video_thumbnail_url', `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
                        }
                      }
                    }} 
                    className="mt-1" 
                    placeholder="YouTube Video ID หรือ URL (เช่น Q2jVu41bT7k หรือ https://www.youtube.com/watch?v=Q2jVu41bT7k)" 
                  />
                  <p className="text-xs text-gray-500 mt-1">ใส่แค่ Video ID หรือ URL ระบบจะแปลงเป็น embed URL และดึง thumbnail อัตโนมัติ</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase text-gray-400">รูป Thumbnail วิดีโอ</label>
                  <Input 
                    value={editForm.tutorial_video_thumbnail_url} 
                    onChange={(e) => updateEditForm('tutorial_video_thumbnail_url', e.target.value)} 
                    className="mt-1" 
                    placeholder="URL รูป Thumbnail (จะดึงอัตโนมัติจาก YouTube หรือใช้ banner/image)" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase text-gray-400">หมวดหมู่</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const active = editForm.categories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategoryInForm(cat.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          active ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200' : 'border-white/15 text-gray-300 hover:border-emerald-500/50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                  {categories.length === 0 && <p className="text-xs text-gray-500">ยังไม่มีหมวดหมู่</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Badge โปรโมชั่น</p>
                    <p className="text-xs text-gray-400">แสดงป้ายพิเศษบนหน้ารายการสินค้า</p>
                  </div>
                  <Switch checked={editForm.badge_enabled} onCheckedChange={(checked) => updateEditForm('badge_enabled', checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">ลดราคาจริง</p>
                    <p className="text-xs text-gray-400">ถ้าเปิดจะปรับราคาขายตามเปอร์เซ็นต์</p>
                  </div>
                  <Switch
                    checked={editForm.badge_apply_price}
                    onCheckedChange={(checked) => updateEditForm('badge_apply_price', checked)}
                    disabled={!editForm.badge_enabled}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase text-gray-400">เปอร์เซ็นต์ลด</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={editForm.badge_percent}
                      onChange={(e) => updateEditForm('badge_percent', e.target.value)}
                      className="mt-1"
                      disabled={!editForm.badge_enabled}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-gray-400">ข้อความป้าย</label>
                    <Input
                      value={editForm.badge_text}
                      onChange={(e) => updateEditForm('badge_text', e.target.value)}
                      className="mt-1"
                      placeholder="เช่น Flash Sale"
                      disabled={!editForm.badge_enabled}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  ถ้าไม่ใส่ข้อความ ระบบจะแสดงตามเปอร์เซ็นต์ เช่น {editForm.badge_percent || '10'}% OFF
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">ไม่พบบริการ</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal} disabled={editSaving}>
              ยกเลิก
            </Button>
            <Button onClick={handleEditSubmit} disabled={editSaving || !editingProduct}>
              {editSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PricingDialog
        open={pricingDialogOpen}
        productId={pricingProductId}
        onOpenChange={(open) => {
          setPricingDialogOpen(open);
          if (!open) {
            setPricingProductId(null);
            fetchAll();
          }
        }}
      />

      <FlashSaleSettingsDialog
        open={flashSaleDialogOpen}
        onOpenChange={setFlashSaleDialogOpen}
        product={selectedFlashSaleProduct ? {
          id: selectedFlashSaleProduct.id,
          name: selectedFlashSaleProduct.name,
          is_flashsale: selectedFlashSaleProduct.is_flashsale,
          flashsale_price: selectedFlashSaleProduct.flashsale_price,
        } : null}
        onSuccess={fetchAll}
      />

      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-4xl bg-[#050505] border border-white/10 text-white max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>เลือกเกมที่จะ Sync</DialogTitle>
            <DialogDescription className="text-gray-400">
              เลือกเกมที่ต้องการ sync จาก wePAY (สามารถเลือกได้หลายเกม)
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <InputGroup className="flex-1">
                <InputGroupInput
                    placeholder="ค้นหาเกม..."
                  value={gameSearch}
                  onChange={(e) => setGameSearch(e.target.value)}
                />
                <InputGroupAddon>
                  <SearchIcon size={16} />
                </InputGroupAddon>
              </InputGroup>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                เลือกทั้งหมด
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                ยกเลิกทั้งหมด
              </Button>
            </div>
            
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 bg-[#0a0a0a]">
              <div>
                <p className="text-sm font-medium text-emerald-400">ตัวเลือกการซิงก์ข้อมูล (Sync Options)</p>
                <p className="text-xs text-gray-400 mt-1">เลือกสิ่งที่คุณต้องการให้ระบบนำข้อมูลเดิมจากต้นทางมาเขียนทับใหม่</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={resetProductName}
                    onChange={(e) => setResetProductName(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-[#0f0f0f] text-emerald-500 focus:ring-emerald-500/30"
                  />
                  <div>
                    <div className="text-sm text-gray-200">ชื่อเกม / ชื่อแอป</div>
                    <div className="text-xs text-gray-500 mt-0.5">ถูกนำไปแสดงเป็นชื่อหลักของบริการ</div>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={resetItemName}
                    onChange={(e) => setResetItemName(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-[#0f0f0f] text-emerald-500 focus:ring-emerald-500/30"
                  />
                  <div>
                    <div className="text-sm text-gray-200">ชื่อแพ็กเกจสินค้า</div>
                    <div className="text-xs text-gray-500 mt-0.5">เช่น "100 Diamond" หรือ "Premium 30 Days"</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={resetInputs}
                    onChange={(e) => setResetInputs(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-[#0f0f0f] text-emerald-500 focus:ring-emerald-500/30"
                  />
                  <div>
                    <div className="text-sm text-gray-200">กล่องกรอกข้อมูล ID & เซิร์ฟเวอร์</div>
                    <div className="text-xs text-gray-500 mt-0.5">รวมถึงรายชื่อช่องเซิร์ฟเวอร์ย่อยของเกม</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={resetPrice}
                    onChange={(e) => setResetPrice(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-[#0f0f0f] text-emerald-500 focus:ring-emerald-500/30"
                  />
                  <div>
                    <div className="text-sm text-red-400">ราคาสินค้า / รีเซ็ตกำไร</div>
                    <div className="text-xs text-gray-500 mt-0.5">ล้างกำไรที่รับมาเป็น 0 และตั้งราคาบวกใหม่ให้หมด</div>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={deleteRemoved}
                    onChange={(e) => setDeleteRemoved(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-[#0f0f0f] text-red-500 focus:ring-red-500/30"
                  />
                  <div>
                    <div className="text-sm text-red-400">ลบสินค้า / แพ็กเกจที่ถูกผู้ให้บริการเอาออกแล้ว</div>
                    <div className="text-xs text-gray-500 mt-0.5">แนะนำให้เปิดไว้เพื่อล้างแพ็กเกจเก่าที่ซื้อไม่ได้แล้วออกจากระบบ</div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl">
              {loadingGames ? (
                <div className="py-10 text-center text-gray-400">กำลังโหลดรายชื่อเกม...</div>
              ) : games.length === 0 ? (
                <div className="py-10 text-center text-gray-400">ไม่พบข้อมูลเกม</div>
              ) : (
                <div className="p-4 space-y-2">
                  {games
                    .filter((g) => 
                      !gameSearch || 
                      g.company_name.toLowerCase().includes(gameSearch.toLowerCase()) ||
                      g.company_id.toLowerCase().includes(gameSearch.toLowerCase())
                    )
                    .map((game) => (
                      <label
                        key={game.company_id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGames.has(game.company_id)}
                          onChange={() => handleToggleGame(game.company_id)}
                          className="w-4 h-4 rounded border-gray-600 bg-[#0f0f0f] text-emerald-500 focus:ring-emerald-500/30"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{game.company_name}</span>
                            {game.exists && (
                              <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-xs">
                                มีในระบบแล้ว
                            </Badge>
                          )}
                          </div>
                          <div className="text-xs text-gray-400">ID: {game.company_id}</div>
                        </div>
                      </label>
                    ))}
                  {games.filter((g) => 
                    !gameSearch || 
                    g.company_name.toLowerCase().includes(gameSearch.toLowerCase()) ||
                    g.company_id.toLowerCase().includes(gameSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="py-10 text-center text-gray-400">ไม่พบเกมตามคำค้นหา</div>
                    )}
            </div>
          )}
            </div>
            
            <div className="text-sm text-gray-400">
              เลือกแล้ว: {selectedGames.size} / {games.length} เกม
            </div>
          </div>
          
          {syncing ? (
            <div className="flex w-full flex-col gap-4">
              <Item variant="outline">
                <ItemMedia>
                  <Spinner />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>กำลัง Sync...</ItemTitle>
                  <ItemDescription>{syncStatus || `กำลัง sync ${selectedGames.size} เกม...`}</ItemDescription>
                </ItemContent>
                <ItemActions className="hidden sm:flex">
                  <Button variant="outline" size="sm" onClick={handleCancelSync}>
                    ยกเลิก
                  </Button>
                </ItemActions>
                <ItemFooter>
                  <Progress value={syncProgress} />
                </ItemFooter>
              </Item>
            </div>
          ) : (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSyncDialogOpen(false)}
                disabled={syncing}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleConfirmSync}
                disabled={syncing || selectedGames.size === 0}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
              >
                Sync {selectedGames.size} เกม
              </Button>
          </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

		</div>
	);
}


