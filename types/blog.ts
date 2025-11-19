export type BlogCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BlogPost = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  cover_image_url: string | null;
  category_id: number | null;
  category?: BlogCategory | null;
  status: 'draft' | 'published' | 'archived';
  author_id: number | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogPostFormData = {
  title: string;
  slug: string;
  description: string;
  content: string;
  cover_image_url: string | null;
  category_id: number | null;
  status: 'draft' | 'published' | 'archived';
};

export type BlogCategoryFormData = {
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
};

