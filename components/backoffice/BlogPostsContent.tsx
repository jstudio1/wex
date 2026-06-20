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
import { Plus, Edit, Trash2, Loader2, Eye, Image as ImageIcon, Upload } from 'lucide-react';
import type { BlogPost, BlogPostFormData, BlogCategory } from '@/types/blog';
import { getBlogPostStatusLabel, getBlogPostStatusBadgeClasses, slugify } from '@/lib/blog';
import Image from 'next/image';
import Link from 'next/link';

export default function BlogPostsContent() {
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
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/blog/posts?${params.toString()}`);
      if (!res.ok) throw new Error('โหลดบทความไม่สำเร็จ');
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
        status: post.status,
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
      });
    }
    setDialogOpen(true);
  };

  const handleUploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.show({ title: 'กรุณาเลือกไฟล์รูปภาพ', variant: 'destructive' });
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (editingPost?.id) {
        formData.append('post_id', editingPost.id.toString());
      }

      const res = await fetch('/api/admin/blog/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('อัปโหลดรูปไม่สำเร็จ');

      const data = await res.json();
      setFormData((prev) => ({ ...prev, cover_image_url: data.url }));
      toast.show({ title: 'อัปโหลดสำเร็จ', description: 'อัปโหลดรูปปกเรียบร้อยแล้ว' });
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.show({ title: 'กรุณากรอกชื่อเรื่องและเนื้อหา', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const url = editingPost ? `/api/admin/blog/posts/${editingPost.id}` : '/api/admin/blog/posts';
      const method = editingPost ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          slug: formData.slug || slugify(formData.title),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({ title: 'บันทึกสำเร็จ', description: 'บันทึกบทความเรียบร้อยแล้ว' });
      setDialogOpen(false);
      fetchPosts();
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบทความนี้?')) return;

    try {
      const res = await fetch(`/api/admin/blog/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('ลบไม่สำเร็จ');
      toast.show({ title: 'ลบสำเร็จ', description: 'ลบบทความเรียบร้อยแล้ว' });
      fetchPosts();
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (search.trim()) {
      return post.title.toLowerCase().includes(search.toLowerCase()) || 
             post.description?.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">จัดการบทความ Blog</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          เขียนบทความใหม่
        </Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="ค้นหาบทความ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-64 bg-black/30 border-white/10"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-black/30 border-white/10">
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="draft">แบบร่าง</SelectItem>
            <SelectItem value="published">เผยแพร่</SelectItem>
            <SelectItem value="archived">เก็บถาวร</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="flex gap-4 p-4 rounded-lg border border-white/10 bg-black/30"
          >
            {post.cover_image_url && (
              <div className="relative w-32 h-32 flex-shrink-0 rounded overflow-hidden">
                <Image src={post.cover_image_url} alt={post.title} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1">{post.title}</h3>
                  {post.description && (
                    <p className="text-sm text-white/70 line-clamp-2 mb-2">{post.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getBlogPostStatusBadgeClasses(post.status)}>
                      {getBlogPostStatusLabel(post.status)}
                    </Badge>
                    {post.category && (
                      <Badge variant="outline">{post.category.name}</Badge>
                    )}
                    {post.status === 'published' && (
                      <Link href={`/blog/${post.slug}`} target="_blank">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          ดู
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(post)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(post.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12 text-white/50">ไม่พบบทความ</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'แก้ไขบทความ' : 'เขียนบทความใหม่'}</DialogTitle>
            <DialogDescription>จัดการข้อมูลบทความ Blog (รองรับ Markdown)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">ชื่อเรื่อง *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value, slug: slugify(e.target.value) })
                }
                placeholder="เช่น วิธีเติมเกมด้วยตัวเอง"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="จะสร้างอัตโนมัติจากชื่อเรื่อง"
              />
            </div>
            <div>
              <Label htmlFor="description">คำอธิบายสั้น</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="คำอธิบายสั้นๆ เกี่ยวกับบทความนี้"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="category">หมวดหมู่</Label>
              <Select
                value={formData.category_id ? formData.category_id.toString() : 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value === 'none' ? null : parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่มีหมวดหมู่</SelectItem>
                  {categories
                    .filter((c) => c.is_active)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cover_image">รูปปก</Label>
              <p className="text-xs text-white/50 mt-1 mb-2">
                ขนาดที่แนะนำ: 1600 × 900 px (อัตราส่วน 16:9) ไฟล์ไม่เกิน 5MB
              </p>
              <div className="space-y-2">
                {formData.cover_image_url && (
                  <div className="relative w-full aspect-video rounded overflow-hidden border border-white/10">
                    <Image src={formData.cover_image_url} alt="Cover" fill className="object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    id="cover_image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file);
                    }}
                    disabled={uploadingImage}
                    className="flex-1"
                  />
                  {uploadingImage && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="content">เนื้อหา * (Markdown)</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="เขียนเนื้อหาบทความที่นี่... (รองรับ Markdown)"
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-xs text-white/50 mt-1">
                รองรับ Markdown: **bold**, *italic*, - list, [link](url), ![image](url)
              </p>
            </div>
            <div>
              <Label htmlFor="status">สถานะ</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'draft' | 'published' | 'archived') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">แบบร่าง</SelectItem>
                  <SelectItem value="published">เผยแพร่</SelectItem>
                  <SelectItem value="archived">เก็บถาวร</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {formData.status === 'published' ? 'เผยแพร่' : 'บันทึกแบบร่าง'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

