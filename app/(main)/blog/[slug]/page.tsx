import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase';
import { cache } from 'react';
import BlogPostClient from './blog-post-client';
import { Skeleton } from '@/components/ui/skeleton';

const fetchPost = cache(async (slug: string) => {
  const sb = createServiceClient();
  const { data: post, error } = await sb
    .from('blog_posts')
    .select(
      `
      *,
      category:blog_categories(id,name,slug,description)
    `,
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !post) {
    return null;
  }

  await sb
    .from('blog_posts')
    .update({ view_count: (post.view_count || 0) + 1 })
    .eq('id', post.id);

  const { data: relatedPosts } = await sb
    .from('blog_posts')
    .select('id,title,slug,cover_image_url,published_at')
    .eq('status', 'published')
    .neq('id', post.id)
    .eq('category_id', post.category_id)
    .order('published_at', { ascending: false })
    .limit(3);

  return {
    post: { ...post, view_count: (post.view_count || 0) + 1 },
    relatedPosts: (relatedPosts || []) as any[],
  };
});

function BlogPostSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Skeleton className="h-10 w-3/4 mb-4" />
      <Skeleton className="h-6 w-1/2 mb-8" />
      <Skeleton className="h-64 w-full mb-8" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchPost(slug);

  if (!data) {
    notFound();
  }

  return <BlogPostClient post={data.post} relatedPosts={data.relatedPosts} />;
}

