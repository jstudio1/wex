import type { BlogPost, BlogCategory } from '@/types/blog';

export const BLOG_POST_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type BlogPostStatus = typeof BLOG_POST_STATUS[keyof typeof BLOG_POST_STATUS];

export function getBlogPostStatusLabel(status: BlogPostStatus): string {
  switch (status) {
    case 'draft':
      return 'แบบร่าง';
    case 'published':
      return 'เผยแพร่';
    case 'archived':
      return 'เก็บถาวร';
    default:
      return status;
  }
}

export function getBlogPostStatusBadgeClasses(status: BlogPostStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    case 'published':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'archived':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const BLOG_BUCKET = 'blog-images';

export function buildBlogImagePath(postId: number, filename: string): string {
  return `posts/${postId}/${filename}`;
}

