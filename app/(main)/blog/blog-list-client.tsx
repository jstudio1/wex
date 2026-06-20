'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, FolderOpen } from 'lucide-react';
import type { BlogPost, BlogCategory } from '@/types/blog';
import { format } from 'date-fns';
import { th } from 'date-fns/locale/th';
import Image from 'next/image';
import PlaceholderImage from '@/components/blog/PlaceholderImage';

type BlogListClientProps = {
  initialCategories: BlogCategory[];
  initialPosts: BlogPost[];
};

export default function BlogListClient({ initialCategories, initialPosts }: BlogListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') || 'all');
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    router.push(`/blog?${params.toString()}`);
    
    try {
      const res = await fetch(`/api/blog/posts?${params.toString()}`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to search posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (value !== 'all') params.set('category', value);
    router.push(`/blog?${params.toString()}`);
    
    fetch(`/api/blog/posts?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setPosts(data.posts || []))
      .catch((error) => console.error('Failed to filter posts:', error));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">บทความ How To</h1>
        <p className="text-white/70">คู่มือและบทความที่เป็นประโยชน์</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="ค้นหาบทความ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="bg-black/30 border-white/10"
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full sm:w-48 bg-black/30 border-white/10">
            <SelectValue placeholder="หมวดหมู่" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            {initialCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/50">ไม่พบบทความ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group rounded-lg border border-white/10 bg-black/30 overflow-hidden hover:border-emerald-500/50 transition-all"
            >
              <div className="relative h-48 w-full overflow-hidden bg-black/40">
                {post.cover_image_url ? (
                  <Image
                    src={post.cover_image_url}
                    alt={post.title}
                    fill
                    className="object-contain group-hover:scale-105 transition-transform duration-300"
                    unoptimized={post.cover_image_url.includes('via.placeholder.com')}
                  />
                ) : (
                  <PlaceholderImage text="ไม่มีรูป" className="w-full h-full" />
                )}
              </div>
              <div className="p-4">
                {post.category && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 mb-2">
                    <FolderOpen className="h-3 w-3" />
                    {post.category.name}
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                  {post.title}
                </h3>
                {post.description && (
                  <p className="text-sm text-white/70 mb-3 line-clamp-2">{post.description}</p>
                )}
                {post.published_at && (
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(post.published_at), 'd MMM yyyy', { locale: th })}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

