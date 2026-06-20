'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Loader2, Eye, Image as ImageIcon, Upload, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { slugify } from '@/lib/blog';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  cover_image_url: string | null;
  category_id: number | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
}

interface BlogPostFormData {
  title: string;
  slug: string;
  description: string;
  content: string;
  cover_image_url: string | null;
  category_id: number | null;
  status: 'draft' | 'published';
  published_at: string | null;
}

export default function NewsContent() {
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<BlogPostFormData>({
    title: '',
    slug: '',
    description: '',
    content: '',
    cover_image_url: null,
    category_id: null,
    status: 'draft',
    published_at: null,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/news/posts?${params.toString()}`);
      if (!res.ok) throw new Error('โหลดข่าวสารไม่สำเร็จ');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/blog/categories');
      if (!res.ok) throw new Error('โหลดหมวดหมู่ไม่สำเร็จ');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, [statusFilter]);

  useEffect(() => {
    if (search.trim()) {
      const timeoutId = setTimeout(() => {
        fetchPosts();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      fetchPosts();
    }
  }, [search]);

  const handleOpenDialog = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        slug: post.slug,
        description: post.description || '',
        content: post.content,
        cover_image_url: post.cover_image_url,
        category_id: post.category_id,
        status: post.status as 'draft' | 'published',
        published_at: post.published_at,
      });
    } else {
      setEditingPost(null);
      setFormData({
        title: '',
        slug: '',
        description: '',
        content: '',
        cover_image_url: null,
        category_id: null,
        status: 'draft',
        published_at: null,
      });
    }
    setDialogOpen(true);
  };

  const handleUploadImage = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/blog/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('อัปโหลดรูปภาพไม่สำเร็จ');
      const data = await res.json();
      setFormData((prev) => ({ ...prev, cover_image_url: data.url }));
      toast.show({ title: 'สำเร็จ', description: 'อัปโหลดรูปภาพสำเร็จ', variant: 'default' });
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.show({ title: 'กรุณากรอกข้อมูล', description: 'กรุณากรอกชื่อข่าวสาร', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const url = editingPost ? `/api/admin/news/posts/${editingPost.id}` : '/api/admin/news/posts';
      const method = editingPost ? 'PUT' : 'POST';

      const payload: any = {
        title: formData.title.trim(),
        slug: formData.slug.trim() || slugify(formData.title),
        description: formData.description.trim() || null,
        content: formData.content.trim(),
        cover_image_url: formData.cover_image_url,
        category_id: formData.category_id,
        status: formData.status,
      };

      if (formData.status === 'published' && !formData.published_at) {
        payload.published_at = new Date().toISOString();
      } else if (formData.published_at) {
        payload.published_at = formData.published_at;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({
        title: 'สำเร็จ',
        description: editingPost ? 'อัปเดตข่าวสารสำเร็จ' : 'สร้างข่าวสารสำเร็จ',
        variant: 'default',
      });

      setDialogOpen(false);
      fetchPosts();
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข่าวสารนี้?')) return;

    try {
      const res = await fetch(`/api/admin/news/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('ลบข่าวสารไม่สำเร็จ');
      toast.show({ title: 'สำเร็จ', description: 'ลบข่าวสารสำเร็จ', variant: 'default' });
      fetchPosts();
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'published') {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">เผยแพร่</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">แบบร่าง</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ตั้งค่าข่าวสาร</h1>
          <p className="text-sm text-gray-400 mt-1">จัดการข่าวสารและบทความ</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มข่าวสาร
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="ค้นหาข่าวสาร..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0f0f0f] border-gray-700 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-[#0f0f0f] border-gray-700 text-white">
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="published">เผยแพร่</SelectItem>
            <SelectItem value="draft">แบบร่าง</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>ไม่พบข่าวสาร</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-lg border border-gray-800 bg-[#0f0f0f] p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Image */}
                <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                  {post.cover_image_url ? (
                    <Image
                      src={post.cover_image_url}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="192px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">{post.title}</h3>
                      {post.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 mb-2">{post.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(post.status)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-3">
                    {post.category && (
                      <span className="text-emerald-400">{post.category.name}</span>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(post.published_at || post.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{post.view_count || 0} ครั้ง</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(post)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Edit className="mr-1.5 h-3.5 w-3.5" />
                      แก้ไข
                    </Button>
                    {post.status === 'published' && (
                      <Link href={`/blog/${post.slug}`} target="_blank">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          ดู
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      ลบ
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] border-gray-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'แก้ไขข่าวสาร' : 'เพิ่มข่าวสารใหม่'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingPost ? 'แก้ไขข้อมูลข่าวสาร' : 'สร้างข่าวสารใหม่'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">ชื่อข่าวสาร *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                    slug: prev.slug || slugify(e.target.value),
                  }));
                }}
                placeholder="เช่น ข่าวสารล่าสุด"
                className="bg-[#1a1a1a] border-gray-700 text-white mt-1"
              />
            </div>

            {/* Slug */}
            <div>
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="เช่น latest-news"
                className="bg-[#1a1a1a] border-gray-700 text-white mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">คำอธิบาย</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="คำอธิบายสั้นๆ เกี่ยวกับข่าวสาร"
                rows={3}
                className="bg-[#1a1a1a] border-gray-700 text-white mt-1"
              />
            </div>

            {/* Cover Image */}
            <div>
              <Label>รูปภาพปก</Label>
              <p className="text-xs text-gray-500 mt-1">
                ขนาดที่แนะนำ: 1600 × 900 px (อัตราส่วน 16:9) ไฟล์ไม่เกิน 5MB
              </p>
              <div className="mt-2 space-y-2">
                {formData.cover_image_url && (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-700">
                    <Image
                      src={formData.cover_image_url}
                      alt="Cover"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 768px"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file);
                    }}
                    className="bg-[#1a1a1a] border-gray-700 text-white"
                    disabled={uploadingImage}
                  />
                  {uploadingImage && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">หมวดหมู่</Label>
              <Select
                value={formData.category_id?.toString() || 'none'}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category_id: value && value !== 'none' ? parseInt(value) : null }))
                }
              >
                <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white mt-1">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่มีหมวดหมู่</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">สถานะ</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value as 'draft' | 'published' }))
                }
              >
                <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">แบบร่าง</SelectItem>
                  <SelectItem value="published">เผยแพร่</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Published At */}
            {formData.status === 'published' && (
              <div>
                <Label htmlFor="published_at">วันที่เผยแพร่</Label>
                <Input
                  id="published_at"
                  type="datetime-local"
                  value={
                    formData.published_at
                      ? new Date(formData.published_at).toISOString().slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      published_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                  className="bg-[#1a1a1a] border-gray-700 text-white mt-1"
                />
              </div>
            )}

            {/* Content */}
            <div>
              <Label htmlFor="content">เนื้อหา *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="เนื้อหาข่าวสาร..."
                rows={12}
                className="bg-[#1a1a1a] border-gray-700 text-white mt-1 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึก'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

