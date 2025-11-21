import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { createServiceClient } from '@/lib/supabase';
import { cache } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const BlogListClient = dynamicImport(() => import('./blog-list-client'), {
  loading: () => (
    <div className="space-y-4">
      <div className="h-12 w-full bg-gray-900/50 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 w-full bg-gray-900/50 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  ),
  ssr: true,
});

const fetchCategories = cache(async () => {
  const sb = createServiceClient();
  const { data } = await sb
    .from('blog_categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  return data || [];
});

const fetchPosts = cache(async (categorySlug?: string, search?: string) => {
  const sb = createServiceClient();
  let query = sb
    .from('blog_posts')
    .select(
      `
      id,
      title,
      slug,
      description,
      cover_image_url,
      category:blog_categories(id,name,slug),
      published_at,
      created_at
    `,
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);

  if (categorySlug) {
    query = query.eq('blog_categories.slug', categorySlug);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data } = await query;
  return data || [];
});

function BlogListSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-6 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-black/30 overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const categorySlug = params.category;
  const search = params.search;

  const [categories, posts] = await Promise.all([
    fetchCategories(),
    fetchPosts(categorySlug, search),
  ]);

  return (
    <Suspense fallback={<BlogListSkeleton />}>
      <BlogListClient initialCategories={categories} initialPosts={posts as any[]} />
    </Suspense>
  );
}

