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
    <>
    <main data-category-theme className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative text-white">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(16,185,129,0.35) 1px, transparent 0)`,
            backgroundSize: '38px 38px'
          }}
        />
      </div>
      
      {/* Decorative Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-20 w-[28rem] h-[28rem] bg-emerald-500/15 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 -left-32 w-[22rem] h-[22rem] bg-teal-400/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-emerald-300/10 rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/categories" className="text-emerald-200 hover:text-emerald-100 transition-colors">ซื้อไอดี</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-emerald-300/70" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-white font-semibold">{category.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Hero Section */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent blur-3xl opacity-70" />
          <div className="relative bg-slate-900/70 border border-emerald-500/20 rounded-3xl shadow-[0_25px_100px_rgba(16,185,129,0.25)] p-6 lg:p-8 overflow-hidden backdrop-blur">
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-emerald-500/20 via-transparent to-transparent" />
            </div>
            <div className="relative text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-200">ซื้อไอดีเกม</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 leading-snug">
                {category.name}
              </h1>
              <p className="text-sm lg:text-base text-emerald-100/80">
                {accounts.length > 0 
                  ? `พบไอดีเกม ${accounts.length} รายการ พร้อมให้คุณจับจอง` 
                  : 'ยังไม่มีไอดีเกมในหมวดหมู่นี้ เรากำลังเตรียมของดีให้คุณอยู่'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/10 blur-3xl opacity-50" />
          <div className="relative bg-slate-900/60 border border-emerald-500/20 rounded-3xl shadow-[0_25px_80px_rgba(15,118,110,0.25)] p-2 sm:p-4">
            <GameAccountsBrowser 
              accounts={accounts} 
              categories={[]}
              initialCategory={params.slug}
              hideCategoryPills={true}
              initialPermissionId={userPermissionId}
              initialPermission={userPermission}
            />
          </div>
        </div>
      </div>
    </main>
    <style>{`
      [data-category-theme] .text-gray-900,
      [data-category-theme] .text-gray-800 {
        color: #f8fafc !important;
      }
      [data-category-theme] .text-gray-700,
      [data-category-theme] .text-gray-600 {
        color: rgba(226, 232, 240, 0.9) !important;
      }
      [data-category-theme] .text-gray-500 {
        color: rgba(203, 213, 225, 0.85) !important;
      }
      [data-category-theme] .text-gray-400,
      [data-category-theme] .text-gray-300 {
        color: rgba(148, 163, 184, 0.85) !important;
      }
      [data-category-theme] .text-gray-200,
      [data-category-theme] .text-gray-100 {
        color: rgba(226, 232, 240, 0.75) !important;
      }
    `}</style>
    </>
  );
}
