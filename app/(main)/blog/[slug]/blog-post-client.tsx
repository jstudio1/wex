'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { th } from 'date-fns/locale/th';
import { Calendar, FolderOpen, Eye, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlogPost } from '@/types/blog';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import PlaceholderImage from '@/components/blog/PlaceholderImage';

type BlogPostClientProps = {
  post: BlogPost;
  relatedPosts: BlogPost[];
};

export default function BlogPostClient({ post, relatedPosts }: BlogPostClientProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/blog">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับไปหน้ารายการ
        </Button>
      </Link>

      <article>
        {post.category && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 mb-4">
            <FolderOpen className="h-4 w-4" />
            {post.category.name}
          </div>
        )}

        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 text-sm text-white/50 mb-6">
          {post.published_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(post.published_at), 'd MMMM yyyy', { locale: th })}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {post.view_count || 0} ครั้ง
          </div>
        </div>

        <div className="relative h-96 w-full mb-8 rounded-lg overflow-hidden bg-gray-800/50">
          {post.cover_image_url ? (
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
              unoptimized={post.cover_image_url.includes('via.placeholder.com')}
            />
          ) : (
            <PlaceholderImage text="ไม่มีรูป" className="w-full h-full" />
          )}
        </div>

        {post.description && (
          <p className="text-lg text-white/80 mb-8 leading-relaxed">{post.description}</p>
        )}

        <div className="prose prose-invert max-w-none mb-12">
          <ReactMarkdown
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            components={{
              h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 mt-8" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mb-3 mt-6" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mb-2 mt-4" {...props} />,
              h4: ({ node, ...props }) => <h4 className="text-lg font-semibold mb-2 mt-4" {...props} />,
              p: ({ node, ...props }) => <p className="mb-4 text-white/90 leading-relaxed" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
              li: ({ node, ...props }) => <li className="text-white/90" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
              em: ({ node, ...props }) => <em className="italic" {...props} />,
              code: ({ node, ...props }) => (
                <code className="bg-black/50 px-1.5 py-0.5 rounded text-emerald-400 text-sm" {...props} />
              ),
              pre: ({ node, ...props }) => (
                <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
              ),
              img: ({ node, ...props }) => (
                <img className="rounded-lg my-4 max-w-full h-auto" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer" {...props} />
              ),
              div: ({ node, ...props }) => <div className="mb-4" {...props} />,
              span: ({ node, ...props }) => <span {...props} />,
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-emerald-500/50 pl-4 italic text-white/70 my-4" {...props} />
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <div className="mt-12 pt-8 border-t border-white/10">
          <h2 className="text-2xl font-bold mb-6">บทความที่เกี่ยวข้อง</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedPosts.map((related) => (
              <Link
                key={related.id}
                href={`/blog/${related.slug}`}
                className="group rounded-lg border border-white/10 bg-black/30 overflow-hidden hover:border-emerald-500/50 transition-all"
              >
                <div className="relative h-32 w-full overflow-hidden bg-gray-800/50">
                  {related.cover_image_url ? (
                    <Image
                      src={related.cover_image_url}
                      alt={related.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized={related.cover_image_url.includes('via.placeholder.com')}
                    />
                  ) : (
                    <PlaceholderImage text="ไม่มีรูป" className="w-full h-full" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {related.title}
                  </h3>
                  {related.published_at && (
                    <p className="text-xs text-white/50 mt-2">
                      {format(new Date(related.published_at), 'd MMM yyyy', { locale: th })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

