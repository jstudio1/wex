'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Save, Search, Globe, Package, Settings, CheckSquare, Square, Edit2, Eye, EyeOff, Trash2, AlertTriangle, Plus, GripVertical } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SocialCategory {
  id: number;
  name: string;
  slug: string;
  is_published: boolean;
  display_order: number;
}

interface SocialService {
  id: number;
  provider_id: number | null;
  provider_service_id: number;
  name: string;
  display_name: string | null;
  type: string;
  category_id: number | null;
  rate_usd: number;
  base_rate_thb: number;
  min_quantity: number;
  max_quantity: number;
  refill: boolean;
  cancel: boolean;
  is_published: boolean;
  markup_percent: number;
  markup_fixed: number;
  exchange_rate?: number;
  metadata: unknown;
  social_categories?: { id: number; name: string; slug: string } | null;
  social_providers?: { id: number; name: string } | null;
}

type DraftService = SocialService & { __dirty?: boolean };
type SocialServiceSnapshot = Pick<SocialService, 'id' | 'display_name' | 'markup_percent' | 'markup_fixed' | 'is_published' | 'category_id'>;

const currencyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export default function SocialServicesContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [services, setServices] = useState<DraftService[]>([]);
  const [categories, setCategories] = useState<SocialCategory[]>([]);
  const [savingServiceIds, setSavingServiceIds] = useState<Set<number>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | 'all'>('all');
  const [filterProviderId, setFilterProviderId] = useState<number | 'all'>('all');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'unpublished'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingService, setEditingService] = useState<DraftService | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SocialCategory | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [draggingCategoryId, setDraggingCategoryId] = useState<number | null>(null);
  const [savingCategoryOrder, setSavingCategoryOrder] = useState(false);
  const itemsPerPage = 100;

  const initialServicesRef = useRef<SocialServiceSnapshot[]>([]);

  const [globalMarkup, setGlobalMarkup] = useState({ percent: '0', fixed: '0' });
  const [loadingGlobalMarkup, setLoadingGlobalMarkup] = useState(true);
  const [savingGlobalMarkup, setSavingGlobalMarkup] = useState(false);
  const [globalMarkupStatus, setGlobalMarkupStatus] = useState<'ok' | 'error' | null>(null);

  useEffect(() => {
    fetchData();
    fetchGlobalMarkup();
  }, []);

  const fetchGlobalMarkup = async () => {
    try {
      const res = await fetch('/api/admin/global-markup', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setGlobalMarkup({
        percent: String(json.percent || 0),
        fixed: String(json.fixed || 0)
      });
    } catch (err) {
      console.error('Global markup fetch error:', err);
    } finally {
      setLoadingGlobalMarkup(false);
    }
  };

  const handleSaveGlobalMarkup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGlobalMarkup(true);
    setGlobalMarkupStatus(null);
    try {
      const res = await fetch('/api/admin/global-markup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percent: Number(globalMarkup.percent) || 0,
          fixed: Number(globalMarkup.fixed) || 0
        })
      });
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ');
      setGlobalMarkupStatus('ok');
      toast.show({ title: 'บันทึกการตั้งค่ากำไร สำเร็จ' });
    } catch (err) {
      setGlobalMarkupStatus('error');
      toast.show({ title: 'บันทึกไม่สำเร็จ', variant: 'destructive' });
    } finally {
      setSavingGlobalMarkup(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/social/services'),
        fetch('/api/admin/social/categories')
      ]);

      if (!servicesRes.ok) throw new Error('ไม่สามารถโหลดรายการบริการได้');
      if (!categoriesRes.ok) throw new Error('ไม่สามารถโหลดหมวดหมู่ได้');

      const servicesJson = await servicesRes.json();
      const categoriesJson = await categoriesRes.json();

      const servicesData = (servicesJson.data || []) as SocialService[];
      const categoriesData = ((categoriesJson.data || []) as SocialCategory[]).map((category, index) => ({
        ...category,
        display_order: category.display_order ?? index + 1
      }));

      initialServicesRef.current = servicesData.map((svc) => ({
        id: svc.id,
        display_name: svc.display_name,
        markup_percent: svc.markup_percent,
        markup_fixed: svc.markup_fixed,
        is_published: svc.is_published,
        category_id: svc.category_id
      }));

      setServices(servicesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลได้', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (category: SocialCategory) => {
    if (!category.name || !category.name.trim()) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'กรุณากรอกชื่อหมวดหมู่', variant: 'destructive' });
      return;
    }

    setSavingCategoryId(category.id);
    try {
      const res = await fetch('/api/admin/social/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: category.id,
          name: category.name.trim(),
          is_published: category.is_published,
          display_order: category.display_order
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

      // อัพเดท categories state
      setCategories((prev) => prev.map((cat) => 
        cat.id === category.id ? { ...category, name: category.name.trim() } : cat
      ));

      toast.show({ title: 'บันทึกหมวดหมู่สำเร็จ' });
      setEditingCategory(null);
    } catch (error) {
      console.error(error);
      toast.show({ title: 'บันทึกไม่สำเร็จ', description: 'โปรดลองใหม่', variant: 'destructive' });
    } finally {
      setSavingCategoryId(null);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: 'กรุณากรอกชื่อหมวดหมู่', variant: 'destructive' });
      return;
    }

    setAddingCategory(true);
    try {
      const res = await fetch('/api/admin/social/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, is_published: true })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.error || 'สร้างไม่สำเร็จ');

      setCategories((prev) => [...prev, json.data as SocialCategory]);
      setNewCategoryName('');
      toast.show({ title: 'สร้างหมวดหมู่สำเร็จ' });
    } catch (error) {
      console.error(error);
      toast.show({
        title: 'สร้างไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'โปรดลองใหม่',
        variant: 'destructive'
      });
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: SocialCategory, serviceCount: number) => {
    const serviceWarning = serviceCount > 0 ? `\n\nบริการ ${serviceCount} รายการจะถูกย้ายไปยัง "ยังไม่จัดหมวด"` : '';
    if (!confirm(`ต้องการลบหมวดหมู่ "${category.name}" หรือไม่?${serviceWarning}`)) {
      return;
    }

    setSavingCategoryId(category.id);
    try {
      const res = await fetch(`/api/admin/social/categories?id=${category.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.error || 'ลบไม่สำเร็จ');

      setCategories((prev) => prev.filter((cat) => cat.id !== category.id));
      setServices((prev) => prev.map((svc) => (
        svc.category_id === category.id
          ? { ...svc, category_id: null, social_categories: null, __dirty: false }
          : svc
      )));
      initialServicesRef.current = initialServicesRef.current.map((svc) => (
        svc.category_id === category.id ? { ...svc, category_id: null } : svc
      ));
      toast.show({ title: 'ลบหมวดหมู่สำเร็จ' });
    } catch (error) {
      console.error(error);
      toast.show({
        title: 'ลบไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'โปรดลองใหม่',
        variant: 'destructive'
      });
    } finally {
      setSavingCategoryId(null);
    }
  };

  const saveCategoryOrder = async (orderedCategories: SocialCategory[]) => {
    setSavingCategoryOrder(true);
    try {
      const res = await fetch('/api/admin/social/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: orderedCategories.map((category, index) => ({
            id: category.id,
            display_order: index + 1
          }))
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.error || 'บันทึกลำดับไม่สำเร็จ');
      toast.show({ title: 'บันทึกลำดับหมวดหมู่สำเร็จ' });
    } catch (error) {
      console.error(error);
      toast.show({
        title: 'บันทึกลำดับไม่สำเร็จ',
        description: 'โปรดรีเฟรชและลองใหม่',
        variant: 'destructive'
      });
      await fetchData();
    } finally {
      setSavingCategoryOrder(false);
    }
  };

  const moveCategory = (fromId: number, toId: number) => {
    if (fromId === toId) return;

    let nextCategories: SocialCategory[] = [];
    setCategories((prev) => {
      const fromIndex = prev.findIndex((cat) => cat.id === fromId);
      const toIndex = prev.findIndex((cat) => cat.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;

      const reordered = [...prev];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      nextCategories = reordered.map((cat, index) => ({ ...cat, display_order: index + 1 }));
      return nextCategories;
    });

    if (nextCategories.length) {
      void saveCategoryOrder(nextCategories);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/social/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ซิงก์ไม่สำเร็จ');
      toast.show({ title: 'ซิงก์สำเร็จ', description: `อัปเดต ${json.counts?.services || 0} รายการ` });
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.show({ title: 'ซิงก์ไม่สำเร็จ', description: 'ตรวจสอบ API key และลองใหม่', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const markServiceDirty = (id: number, updater: (svc: DraftService) => DraftService) => {
    setServices((prev) => prev.map((svc) => {
      if (svc.id !== id) return svc;
      const updated = updater(svc);
      return { ...updated, __dirty: true };
    }));
  };

  const handleSaveService = async (service: DraftService) => {
    const initial = initialServicesRef.current.find((s) => s.id === service.id);
    if (!initial) return;

    const payload: Record<string, unknown> = {};
    if (service.display_name !== initial.display_name) payload.display_name = service.display_name;
    if (service.markup_percent !== initial.markup_percent) payload.markup_percent = Number(service.markup_percent) || 0;
    if (service.markup_fixed !== initial.markup_fixed) payload.markup_fixed = Number(service.markup_fixed) || 0;
    if (service.is_published !== initial.is_published) payload.is_published = service.is_published;
    if (service.category_id !== initial.category_id) payload.category_id = service.category_id;

    if (!Object.keys(payload).length) {
      toast.show({ title: 'ไม่มีการเปลี่ยนแปลง', description: 'ข้อมูลเหมือนเดิม', variant: 'default' });
      return;
    }

    setSavingServiceIds(new Set([service.id]));
    try {
      const res = await fetch(`/api/admin/social/services/${service.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

      initialServicesRef.current = initialServicesRef.current.map((s) =>
        s.id === service.id
            ? {
              id: service.id,
              display_name: service.display_name,
              markup_percent: Number(service.markup_percent) || 0,
              markup_fixed: Number(service.markup_fixed) || 0,
              is_published: service.is_published,
              category_id: service.category_id ?? null
              }
          : s
        );

      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...service, __dirty: false } : s)));
      toast.show({ title: 'บันทึกสำเร็จ' });
      setIsEditDialogOpen(false);
      } catch (error) {
        console.error(error);
      toast.show({ title: 'บันทึกไม่สำเร็จ', variant: 'destructive' });
    } finally {
    setSavingServiceIds(new Set());
    }
  };

  const handleBulkPublish = async (publish: boolean) => {
    if (selectedIds.size === 0) {
      toast.show({ title: 'กรุณาเลือกบริการ', variant: 'default' });
      return;
    }

    if (!confirm(`ต้องการ${publish ? 'เผยแพร่' : 'ซ่อน'} ${selectedIds.size} รายการหรือไม่?`)) {
      return;
    }

    setSavingServiceIds(selectedIds);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/social/services/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_published: publish })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');

        initialServicesRef.current = initialServicesRef.current.map((s) =>
          s.id === id ? { ...s, is_published: publish } : s
        );

        setServices((prev) => prev.map((s) => (s.id === id ? { ...s, is_published: publish, __dirty: false } : s)));
        successCount++;
      } catch (error) {
        console.error(error);
        errorCount++;
      }
    }

    setSavingServiceIds(new Set());
    setSelectedIds(new Set());

    if (errorCount > 0) {
      toast.show({
        title: `${publish ? 'เผยแพร่' : 'ซ่อน'}สำเร็จ ${successCount} รายการ`,
        description: `มี ${errorCount} รายการที่${publish ? 'เผยแพร่' : 'ซ่อน'}ไม่สำเร็จ`,
        variant: errorCount === selectedIds.size ? 'destructive' : 'default'
      });
    } else {
      toast.show({ title: `${publish ? 'เผยแพร่' : 'ซ่อน'}สำเร็จ ${successCount} รายการ` });
    }
  };

  const handlePublishAll = async (publish: boolean) => {
    const action = publish ? 'เผยแพร่' : 'ปิดเผยแพร่';
    const totalServices = services.length;
    
    if (!confirm(`ต้องการ${action}บริการทั้งหมด ${totalServices} รายการหรือไม่?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/social/services/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: publish })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'เกิดข้อผิดพลาด');
      }

      // อัพเดท state
      setServices((prev) => prev.map((s) => ({ ...s, is_published: publish, __dirty: false })));
      initialServicesRef.current = initialServicesRef.current.map((s) => ({ ...s, is_published: publish }));

      toast.show({ 
        title: 'สำเร็จ', 
        description: json.message || `${action}บริการทั้งหมดสำเร็จ` 
      });
    } catch (error) {
      console.error('Publish all error:', error);
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: error instanceof Error ? error.message : 'ไม่สามารถดำเนินการได้', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteAllServices = async () => {
    if (!confirm(`ต้องการลบบริการทั้งหมด ${services.length} รายการหรือไม่?\n\n⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/social/services/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unpublished_only: false })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'เกิดข้อผิดพลาด');
      }

      toast.show({ 
        title: 'สำเร็จ', 
        description: json.message || 'ลบบริการทั้งหมดสำเร็จ' 
      });

      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Delete all services error:', error);
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: error instanceof Error ? error.message : 'ไม่สามารถลบได้', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteUnpublishedServices = async () => {
    const unpublishedCount = services.filter((s) => !s.is_published).length;
    
    if (unpublishedCount === 0) {
      toast.show({ title: 'ไม่พบข้อมูล', description: 'ไม่มีบริการที่ไม่เผยแพร่', variant: 'default' });
      return;
    }

    if (!confirm(`ต้องการลบบริการที่ไม่เผยแพร่ ${unpublishedCount} รายการหรือไม่?\n\n⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
      return;
    }

      try {
      const res = await fetch('/api/admin/social/services/bulk', {
        method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unpublished_only: true })
        });

        const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'เกิดข้อผิดพลาด');
      }

      toast.show({ 
        title: 'สำเร็จ', 
        description: json.message || 'ลบบริการที่ไม่เผยแพร่สำเร็จ' 
      });

      await fetchData(); // Refresh data
      } catch (error) {
      console.error('Delete unpublished services error:', error);
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: error instanceof Error ? error.message : 'ไม่สามารถลบได้', 
        variant: 'destructive' 
      });
      }
  };

  const handleDeleteAllCategories = async () => {
    if (categories.length === 0) {
      toast.show({ title: 'ไม่พบข้อมูล', description: 'ไม่มีหมวดหมู่', variant: 'default' });
      return;
    }

    if (!confirm(`ต้องการลบหมวดหมู่ทั้งหมด ${categories.length} รายการหรือไม่?\n\n⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/social/categories/bulk', {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || 'เกิดข้อผิดพลาด');
      }

      toast.show({
        title: 'สำเร็จ', 
        description: json.message || 'ลบหมวดหมู่ทั้งหมดสำเร็จ' 
      });

      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Delete all categories error:', error);
      toast.show({ 
        title: 'เกิดข้อผิดพลาด', 
        description: error instanceof Error ? error.message : 'ไม่สามารถลบได้', 
        variant: 'destructive' 
      });
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      const matchCategory = filterCategoryId === 'all' || svc.category_id === filterCategoryId;
      const matchProvider = filterProviderId === 'all' || svc.provider_id === filterProviderId;
      const matchPublished = filterPublished === 'all' 
        || (filterPublished === 'published' && svc.is_published)
        || (filterPublished === 'unpublished' && !svc.is_published);
      const text = filterText.trim().toLowerCase();
      const matchText = !text || [
        svc.name, 
        svc.display_name, 
        svc.provider_service_id.toString(),
        svc.type
      ].some((v) => v?.toLowerCase().includes(text));
      return matchCategory && matchProvider && matchPublished && matchText;
    });
  }, [services, filterCategoryId, filterProviderId, filterPublished, filterText]);

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(start, start + itemsPerPage);
  }, [filteredServices, currentPage]);

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filterText, filterCategoryId, filterProviderId, filterPublished]);

  const uniqueProviders = useMemo(() => {
    const providers = new Map<number, { id: number; name: string }>();
    services.forEach((svc) => {
      if (svc.provider_id && svc.social_providers) {
        providers.set(svc.provider_id, { id: svc.provider_id, name: svc.social_providers.name });
      }
    });
    return Array.from(providers.values());
  }, [services]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedServices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedServices.map((s) => s.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const computeFinalPrice = (service: SocialService) => {
    const basePerThousand = Number(service.base_rate_thb || 0);
    const basePrice = basePerThousand / 1000;
    const markupPrice = basePrice * (1 + Number(service.markup_percent || 0) / 100) + Number(service.markup_fixed || 0);
    const globalMarkupPrice = markupPrice * (1 + Number(globalMarkup.percent || 0) / 100) + Number(globalMarkup.fixed || 0);
    return globalMarkupPrice;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <div>
          <h2 className="text-2xl font-bold text-white">จัดการบริการโซเชียล</h2>
          <p className="text-gray-400 mt-1">จัดการบริการปั๊มโซเชียลทั้งหมด</p>
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
            {syncing ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
            {syncing ? 'กำลังซิงก์...' : 'ซิงก์จากผู้ให้บริการ'}
          </Button>
        </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services" className="gap-2">
            <Package className="size-4" />
            บริการ ({filteredServices.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Globe className="size-4" />
            หมวดหมู่ ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="size-4" />
            ตั้งค่า
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          {/* Filters */}
          <div className="card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
                <Label>ค้นหา</Label>
            <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                    placeholder="ค้นหาชื่อ, ID, ประเภท..."
                className="pl-9"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
                <Label>หมวดหมู่</Label>
            <select
              className="input"
              value={filterCategoryId === 'all' ? 'all' : String(filterCategoryId)}
                  onChange={(e) => setFilterCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">ทั้งหมด</option>
              {categories.filter((cat) => cat.is_published).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
            <div className="space-y-2">
                <Label>Provider</Label>
                <select
                  className="input"
                  value={filterProviderId === 'all' ? 'all' : String(filterProviderId)}
                  onChange={(e) => setFilterProviderId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">ทั้งหมด</option>
                  {uniqueProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                  ))}
                </select>
        </div>
            <div className="space-y-2">
                <Label>สถานะ</Label>
                <select
                  className="input"
                  value={filterPublished}
                  onChange={(e) => setFilterPublished(e.target.value as 'all' | 'published' | 'unpublished')}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="published">เปิดขาย</option>
                  <option value="unpublished">ซ่อนอยู่</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 p-3 bg-emerald-600/10 border border-emerald-600/20 rounded-lg">
                  <span className="text-sm text-emerald-400">เลือกแล้ว {selectedIds.size} รายการ</span>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkPublish(true)}
                      disabled={savingServiceIds.size > 0}
                      className="gap-1"
                    >
                      <Eye className="size-3" />
                      เผยแพร่
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkPublish(false)}
                      disabled={savingServiceIds.size > 0}
                      className="gap-1"
                    >
                      <EyeOff className="size-3" />
                      ซ่อน
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              )}

              {/* Global Actions */}
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePublishAll(true)}
                  className="gap-1 text-emerald-400 hover:text-emerald-300"
                >
                  <Eye className="size-3" />
                  เผยแพร่ทั้งหมด
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePublishAll(false)}
                  className="gap-1 text-yellow-400 hover:text-yellow-300"
                >
                  <EyeOff className="size-3" />
                  ปิดเผยแพร่ทั้งหมด
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeleteUnpublishedServices}
                  className="gap-1 text-orange-400 hover:text-orange-300"
                >
                  <Trash2 className="size-3" />
                  ลบบริการที่ไม่เผยแพร่
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeleteAllServices}
                  className="gap-1 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="size-3" />
                  <AlertTriangle className="size-3" />
                  ลบบริการทั้งหมด
                </Button>
              </div>
            </div>
        </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === paginatedServices.length && paginatedServices.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-white">ID</TableHead>
                    <TableHead className="text-white">ชื่อบริการ</TableHead>
                    <TableHead className="text-white">Provider</TableHead>
                    <TableHead className="text-white">หมวดหมู่</TableHead>
                    <TableHead className="text-white">ประเภท</TableHead>
                    <TableHead className="text-white text-right">ราคาต้นทุน/1000</TableHead>
                    <TableHead className="text-white text-right">ราคาขาย/1000</TableHead>
                    <TableHead className="text-white">จำนวน</TableHead>
                    <TableHead className="text-white text-center">สถานะ</TableHead>
                    <TableHead className="text-white text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-gray-400 py-8">
                        ไม่พบข้อมูล
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedServices.map((svc) => {
            const category = categories.find((cat) => cat.id === svc.category_id);
                      const finalPrice = computeFinalPrice(svc);
            return (
                        <TableRow key={svc.id} className={svc.__dirty ? 'bg-emerald-600/5' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(svc.id)}
                              onChange={() => toggleSelect(svc.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-400">
                            #{svc.provider_service_id}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <div className="font-medium text-white truncate">
                                {svc.display_name || svc.name}
                  </div>
                              {svc.display_name && svc.display_name !== svc.name && (
                                <div className="text-xs text-gray-400 truncate">{svc.name}</div>
                              )}
                  </div>
                          </TableCell>
                          <TableCell>
                            {svc.social_providers ? (
                              <Badge variant="outline" className="text-xs">
                                {svc.social_providers.name}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {category ? (
                              <Badge variant="secondary" className="text-xs">
                                {category.name}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-400">{svc.type || '-'}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {currencyFormatter.format(svc.base_rate_thb)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-emerald-400 font-semibold">
                            {currencyFormatter.format(finalPrice)}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-400">
                              {svc.min_quantity} - {svc.max_quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={svc.is_published ? 'default' : 'secondary'}
                              className={svc.is_published ? 'bg-emerald-600' : 'bg-gray-600'}
                            >
                              {svc.is_published ? 'เปิดขาย' : 'ซ่อนอยู่'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingService(svc);
                                setIsEditDialogOpen(true);
                              }}
                              className="gap-1"
                            >
                              <Edit2 className="size-3" />
                              แก้ไข
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
                </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <div className="text-sm text-gray-400">
                  แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredServices.length)} จาก {filteredServices.length} รายการ
                </div>
                <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
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
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">จัดการหมวดหมู่</h3>
                <p className="text-sm text-gray-400 mt-1">แก้ไขชื่อหมวดหมู่และตั้งค่าการเผยแพร่</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-400">
                  {savingCategoryOrder ? 'กำลังบันทึกลำดับ...' : `ทั้งหมด ${categories.length} หมวดหมู่`}
                </div>
                {categories.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeleteAllCategories}
                    className="gap-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="size-3" />
                    <AlertTriangle className="size-3" />
                    ลบหมวดหมู่ทั้งหมด
                  </Button>
                )}
              </div>
            </div>
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="new-social-category">เพิ่มหมวดหมู่</Label>
                <Input
                  id="new-social-category"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAddCategory();
                    }
                  }}
                  placeholder="ชื่อหมวดหมู่"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddCategory}
                disabled={addingCategory}
                className="gap-2"
              >
                {addingCategory ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                เพิ่ม
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-white"></TableHead>
                    <TableHead className="text-white text-center">ลำดับ</TableHead>
                    <TableHead className="text-white">ชื่อ</TableHead>
                    <TableHead className="text-white">Slug</TableHead>
                    <TableHead className="text-white text-center">สถานะ</TableHead>
                    <TableHead className="text-white text-center">จำนวนบริการ</TableHead>
                    <TableHead className="text-white text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                        ยังไม่มีหมวดหมู่
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((cat, index) => {
                      const serviceCount = services.filter((s) => s.category_id === cat.id).length;
                      const isEditing = editingCategory?.id === cat.id;
                      const categoryToShow = isEditing ? editingCategory : cat;
                      
                      return (
                        <TableRow
                          key={cat.id}
                          draggable={!isEditing && !savingCategoryOrder}
                          onDragStart={() => setDraggingCategoryId(cat.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggingCategoryId) moveCategory(draggingCategoryId, cat.id);
                            setDraggingCategoryId(null);
                          }}
                          onDragEnd={() => setDraggingCategoryId(null)}
                          className={draggingCategoryId === cat.id ? 'opacity-50' : undefined}
                        >
                          <TableCell className="text-center">
                            <GripVertical className="mx-auto size-4 cursor-grab text-gray-400" />
                          </TableCell>
                          <TableCell className="text-center text-gray-400">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                value={categoryToShow.name}
                                onChange={(e) => setEditingCategory({ ...categoryToShow, name: e.target.value })}
                                className="max-w-xs"
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium text-white">{cat.name}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-400 font-mono text-sm">/{cat.slug}</TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  checked={categoryToShow.is_published}
                                  onCheckedChange={(checked) => setEditingCategory({ ...categoryToShow, is_published: checked })}
                                />
                                <Label className="text-sm">
                                  {categoryToShow.is_published ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                </Label>
                              </div>
                            ) : (
                              <Badge variant={cat.is_published ? 'default' : 'secondary'}>
                                {cat.is_published ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-gray-400">
                            {serviceCount} รายการ
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCategory(null);
                                  }}
                                  className="gap-1"
                                >
                                  ยกเลิก
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveCategory(categoryToShow)}
                                  disabled={savingCategoryId === cat.id}
                                  className="gap-1"
                                >
                                  {savingCategoryId === cat.id ? (
                                    <>
                                      <Spinner className="size-3" />
                                      บันทึก...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="size-3" />
                                      บันทึก
                                    </>
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingCategory({ ...cat })}
                                  className="gap-1"
                                >
                                  <Edit2 className="size-3" />
                                  แก้ไข
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteCategory(cat, serviceCount)}
                                  disabled={savingCategoryId === cat.id}
                                  className="gap-1 text-red-400 hover:text-red-300"
                                >
                                  {savingCategoryId === cat.id ? <Spinner className="size-3" /> : <Trash2 className="size-3" />}
                                  ลบ
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              หมายเหตุ: หมวดหมู่จะถูกสร้างอัตโนมัติเมื่อซิงค์ข้อมูลจาก provider
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="card p-4 space-y-4">
            <h3 className="text-lg font-semibold">ตั้งค่ากำไรสำหรับทุกบริการ</h3>
        {globalMarkupStatus === 'ok' && (
          <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
            บันทึกการตั้งค่ากำไร สำเร็จ
          </div>
        )}
        {globalMarkupStatus === 'error' && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
            บันทึกไม่สำเร็จ โปรดลองใหม่
          </div>
        )}
        <form onSubmit={handleSaveGlobalMarkup} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="global-markup-percent">กำไร (%)</Label>
              <Input
                id="global-markup-percent"
                type="number"
                step="0.1"
                value={globalMarkup.percent}
                onChange={(e) => setGlobalMarkup({ ...globalMarkup, percent: e.target.value })}
                placeholder="0"
              />
                  <p className="text-xs text-gray-400">กำไรเป็นเปอร์เซ็นต์ที่บวกเข้ากับราคาทุกบริการ</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="global-markup-fixed">กำไร (บาท)</Label>
              <Input
                id="global-markup-fixed"
                type="number"
                step="0.01"
                value={globalMarkup.fixed}
                onChange={(e) => setGlobalMarkup({ ...globalMarkup, fixed: e.target.value })}
                placeholder="0"
              />
                  <p className="text-xs text-gray-400">กำไรคงที่ที่บวกเข้ากับราคาทุกบริการ (บาท)</p>
            </div>
          </div>
              <Button type="submit" disabled={savingGlobalMarkup} className="gap-2">
            {savingGlobalMarkup ? (
              <>
                <Spinner className="size-4" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="size-4" />
                บันทึกการตั้งค่ากำไร 
              </>
            )}
          </Button>
              <p className="text-xs text-gray-400">หมายเหตุ: การตั้งค่านี้จะถูกบวกเข้ากับราคาทุกบริการโซเชียล (หลังจากบวก markup ของแต่ละบริการแล้ว)</p>
        </form>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>แก้ไขบริการ</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลบริการ: {editingService?.name}
            </DialogDescription>
          </DialogHeader>
          {editingService && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                    <Label>ชื่อแสดง (หน้าเว็บ)</Label>
                <Input
                  value={editingService.display_name ?? ''}
                  onChange={(e) => setEditingService({ ...editingService, display_name: e.target.value })}
                />
                  </div>
              <div className="space-y-2">
                    <Label>หมวดหมู่</Label>
                    <select
                      className="input"
                  value={editingService.category_id ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                    setEditingService({ ...editingService, category_id: val ? Number(val) : null });
                      }}
                    >
                      <option value="">ยังไม่จัดหมวด</option>
                      {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Markup %</Label>
                    <Input
                      type="number"
                      step="0.1"
                    value={editingService.markup_percent}
                    onChange={(e) => setEditingService({ ...editingService, markup_percent: Number(e.target.value) })}
                    />
                  </div>
                <div className="space-y-2">
                    <Label>Markup คงที่ (บาท)</Label>
                    <Input
                      type="number"
                    step="0.01"
                    value={editingService.markup_fixed}
                    onChange={(e) => setEditingService({ ...editingService, markup_fixed: Number(e.target.value) })}
                    />
                  </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                  <Label>เผยแพร่</Label>
                  <div className="text-sm text-gray-400">{editingService.is_published ? 'เปิดขาย' : 'ซ่อนอยู่'}</div>
                    </div>
                <Switch
                  checked={editingService.is_published}
                  onCheckedChange={(checked) => setEditingService({ ...editingService, is_published: checked })}
                />
                  </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-gray-400 mb-1">ราคาต้นทุน: {currencyFormatter.format(editingService.base_rate_thb)} / 1000</div>
                <div className="text-sm font-semibold text-emerald-400">
                  ราคาขาย: {currencyFormatter.format(computeFinalPrice(editingService))} / 1000
                </div>
                </div>
              </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ยกเลิก
            </Button>
                  <Button
              onClick={() => editingService && handleSaveService(editingService)}
              disabled={savingServiceIds.has(editingService?.id || 0)}
              className="gap-2"
            >
              {savingServiceIds.has(editingService?.id || 0) ? (
                <>
                  <Spinner className="size-4" />
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
