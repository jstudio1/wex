import { createServiceClient } from '@/lib/supabase';
import { CashcardCategoryCardNew } from '@/components/CashcardCategoryCardNew';

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchCategories() {
  try {
    const sb = createServiceClient();
    
    const { data: categories, error } = await sb
      .from('cashcard_categories')
      .select('category, display_name, image_url, is_published')
      .eq('is_published', true)
      .order('display_name');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    // Sort: categories with images first, then by display_name
    const sorted = (categories || []).sort((a, b) => {
      const aHasImage = !!a.image_url;
      const bHasImage = !!b.image_url;
      
      // If one has image and other doesn't, prioritize the one with image
      if (aHasImage && !bHasImage) return -1;
      if (!aHasImage && bHasImage) return 1;
      
      // If both have same image status, sort by display_name
      const aName = a.display_name || a.category || '';
      const bName = b.display_name || b.category || '';
      return aName.localeCompare(bName, 'th');
    });

    return sorted;
  } catch (error) {
    console.error('Error in fetchCategories:', error);
    return [];
  }
}

export default async function CashcardPage() {
  const categories = await fetchCategories();

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Starry Night Background Effect */}
      <div className="fixed inset-0 bg-black" style={{
        backgroundImage: `
          radial-gradient(2px 2px at 20% 30%, white, transparent),
          radial-gradient(2px 2px at 60% 70%, white, transparent),
          radial-gradient(1px 1px at 50% 50%, white, transparent),
          radial-gradient(1px 1px at 80% 10%, white, transparent),
          radial-gradient(2px 2px at 90% 40%, white, transparent),
          radial-gradient(1px 1px at 33% 60%, white, transparent),
          radial-gradient(2px 2px at 10% 80%, white, transparent),
          radial-gradient(1px 1px at 70% 20%, white, transparent),
          radial-gradient(2px 2px at 40% 90%, white, transparent),
          radial-gradient(1px 1px at 15% 50%, white, transparent)
        `,
        backgroundSize: '200% 200%',
        backgroundPosition: '0% 0%',
        opacity: 0.3
      }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            บัตรเติมเงิน
          </h1>
        </div>

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <div className="card p-12 text-center max-w-md mx-auto bg-black/50 border-white/10">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">ยังไม่มีหมวดหมู่บัตรเติมเงิน</h3>
            <p className="text-white/60">กรุณาไปที่ Backoffice เพื่อเพิ่มหมวดหมู่</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {categories.map((cat, index) => (
              <CashcardCategoryCardNew
                key={cat.category}
                category={cat.category}
                displayName={cat.display_name}
                imageUrl={cat.image_url}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

