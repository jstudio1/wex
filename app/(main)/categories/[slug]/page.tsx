import { getBaseUrl } from '@/lib/url';
import GameAccountsBrowser from '@/components/GameAccountsBrowser';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

// Force dynamic rendering - no cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type GameAccount = {
  id: number;
  game_name: string;
  game_category_id: number | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  additional_images: string[];
  price: number;
  stock: number;
  created_at: string;
  category: { id: number; name: string; slug: string } | null;
  original_price?: number | null;
  discount_percent?: number | null;
};

type GameCategory = {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  accountCount?: number;
  minPrice?: number;
  maxPrice?: number;
};

async function fetchCategoryAndAccounts(slug: string): Promise<{ category: GameCategory | null; accounts: GameAccount[]; userPermissionId: number | null; userPermission: { id: number; name: string } | null }> {
  const base = getBaseUrl();
  
  // Get user permission_id and permission from server-side
  let userPermissionId: number | null = null;
  let userPermission: { id: number; name: string } | null = null;
  try {
    const user = await getAuthUser();
    if (user) {
      const sb = createServiceClient();
      const { data: userData } = await sb
        .from('users')
        .select('permission_id, permission:permissions(id, name)')
        .eq('id', user.id)
        .maybeSingle();
      if (userData?.permission_id) {
        userPermissionId = userData.permission_id;
        const permission = userData.permission;
        if (permission) {
          // Handle both array and object cases from Supabase
          const perm = Array.isArray(permission) ? permission[0] : permission;
          if (perm && perm.id && perm.name) {
            userPermission = {
              id: perm.id,
              name: perm.name
            };
          }
        }
      }
    }
  } catch {
    // ignore
  }
  
  // Fetch categories - no cache
  const categoriesRes = await fetch(`${base}/api/game-categories`, { 
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
  });
  const categories = categoriesRes.ok ? (await categoriesRes.json()).data : [];
  const category = categories.find((cat: GameCategory) => cat.slug === slug) || null;
  
  if (!category) {
    return { category: null, accounts: [], userPermissionId, userPermission };
  }
  
  // Fetch accounts for this category with permission_id if available - no cache
  const accountsUrl = userPermissionId 
    ? `${base}/api/game-accounts?category_slug=${slug}&permission_id=${userPermissionId}`
    : `${base}/api/game-accounts?category_slug=${slug}`;
  const accountsRes = await fetch(accountsUrl, { 
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
  });
  const accounts = accountsRes.ok ? (await accountsRes.json()).data : [];
  
  return { category, accounts, userPermissionId, userPermission };
}

export default async function CategoryDetailPage({ params }: { params: { slug: string } }) {
  const { category, accounts, userPermissionId, userPermission } = await fetchCategoryAndAccounts(params.slug);
  
  if (!category) {
    notFound();
  }
  
  return (
    <main className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(220, 38, 38) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>
      
      {/* Decorative Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-red-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/categories" className="text-gray-600 hover:text-gray-900">ซื้อไอดี</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-gray-900 font-medium">{category.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Hero Section */}
        <div className="relative mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 lg:p-8">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 mb-4">
                <span className="text-xs font-semibold text-red-600">ซื้อไอดีเกม</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                {category.name}
              </h1>
              <p className="text-sm lg:text-base text-gray-600">
                {accounts.length > 0 
                  ? `พบไอดีเกม ${accounts.length} รายการ` 
                  : 'ยังไม่มีไอดีเกมในหมวดหมู่นี้'}
              </p>
            </div>
          </div>
        </div>

        <GameAccountsBrowser 
          accounts={accounts} 
          categories={[]}
          initialCategory={params.slug}
          hideCategoryPills={true}
          initialPermissionId={userPermissionId}
          initialPermission={userPermission}
        />
      </div>
    </main>
  );
}
