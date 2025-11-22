'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, Calendar, Eye } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  published_at: string | null;
  created_at: string;
  view_count: number;
}

export default function NewsSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        const res = await fetch('/api/blog/latest', {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch latest news');
        const json = await res.json();
        setPosts(json.posts || []);
      } catch (error) {
        console.error('Error fetching latest news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestNews();
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-md">
            <Newspaper className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">ข่าวสาร</h2>
            <p className="text-sm text-gray-400">Latest News</p>
          </div>
        </div>
        <Link 
          href="/blog" 
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors group"
        >
          ดูทั้งหมด
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group block h-full"
          >
            <div className="flex h-full flex-col rounded-xl border border-gray-800/60 bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] overflow-hidden shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/70 hover:shadow-xl hover:shadow-emerald-900/20">
              {/* Cover Image */}
              <div className="relative w-full h-48 overflow-hidden bg-gray-900/60">
                {post.cover_image_url ? (
                  <Image
                    src={post.cover_image_url}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <Newspaper className="h-16 w-16" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                {/* Category Badge */}
                {post.category && (
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/90 text-white text-xs font-semibold backdrop-blur-sm">
                      {post.category.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-5">
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                  {post.title}
                </h3>
                
                {post.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">
                    {post.description}
                  </p>
                )}

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-800">
                  <div className="flex items-center gap-4">
                    {post.published_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(post.published_at)}</span>
                      </div>
                    )}
                    {post.view_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{post.view_count.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform inline-block">
                    อ่านต่อ →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

