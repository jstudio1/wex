'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar, Eye, Newspaper } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

function formatDate(dateString: string | null) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function NewsSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        const res = await fetch('/api/blog/latest', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch latest news');
        const json = await res.json();
        setPosts(json.posts || []);
      } catch (error) {
        console.error('Error fetching latest news:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchLatestNews();
  }, []);

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/15 bg-black/55 p-5 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px] rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  const displayPosts = posts.slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/55 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(14,165,233,0.18),transparent_40%),radial-gradient(circle_at_88%_80%,rgba(16,185,129,0.14),transparent_36%)]" />

      <div className="relative mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-300/40 bg-sky-500/20 text-sky-200 sm:h-11 sm:w-11 sm:rounded-2xl">
            <Newspaper className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white sm:text-xl lg:text-2xl">ข่าวสารและบทความล่าสุด</h2>
            <p className="text-[10px] uppercase tracking-[0.12em] text-sky-200/85 sm:text-xs">News & Guides</p>
          </div>
        </div>
        <Link
          href="/blog"
          className="inline-flex shrink-0 items-center gap-1 self-start whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/35 hover:bg-white/20 sm:self-auto sm:text-sm"
        >
          ดูทั้งหมด
          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Link>
      </div>

      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayPosts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group block h-full">
            <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/55 hover:shadow-[0_14px_30px_rgba(16,185,129,0.2)]">
              <div className="relative h-44 w-full shrink-0 overflow-hidden bg-black/40 sm:h-48">
                {post.cover_image_url ? (
                  <Image
                    src={post.cover_image_url}
                    alt={post.title}
                    fill
                    className="object-contain transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/30">
                    <Newspaper className="h-10 w-10" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {post.category && (
                    <span className="inline-flex items-center rounded-full border border-emerald-300/50 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100">
                      {post.category.name}
                    </span>
                  )}
                  {post.published_at && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-white/55">
                      <Calendar className="h-3 w-3" />
                      {formatDate(post.published_at)}
                    </span>
                  )}
                </div>

                <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white">{post.title}</h3>
                {post.description && <p className="mt-1.5 line-clamp-2 text-sm text-white/65">{post.description}</p>}

                <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-white/55">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {post.view_count.toLocaleString()} views
                  </span>
                  <span className="font-semibold text-emerald-200 transition-transform duration-300 group-hover:translate-x-1">อ่านต่อ</span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
