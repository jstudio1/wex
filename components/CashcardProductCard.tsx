'use client';

import Link from 'next/link';

interface CashcardProductCardProps {
  id: number;
  name: string;
  displayName: string;
  imageUrl: string | null;
  category: string | null;
  categoryDisplayName: string | null;
}

export function CashcardProductCard({ id, name, displayName, imageUrl, category, categoryDisplayName }: CashcardProductCardProps) {
  // Extract region info from name or use category
  const getRegionText = () => {
    if (name?.includes('TH') || name?.includes('TH REGION')) {
      return 'TH REGION';
    }
    if (name?.includes('Global')) {
      return 'GLOBAL';
    }
    return 'TH REGION';
  };

  const getCardType = () => {
    const upperName = name.toUpperCase();
    if (upperName.includes('GARENA')) return 'GARENA SHELL GIFT CARD';
    if (upperName.includes('RAZER')) return 'RAZER GOLD GIFT CARD';
    if (upperName.includes('RIOT')) return 'RIOT PIN GIFT CARD';
    if (upperName.includes('ROBLOX')) return 'ROBLOX GIFT CARD';
    if (upperName.includes('STEAM')) return 'STEAM PIN GIFT CARD';
    if (upperName.includes('PUBG')) return 'PUBG MOBILE';
    if (upperName.includes('PLAYSTATION') || upperName.includes('PLAY STATION')) return 'PLAYSTATION GIFT CARD';
    return 'GIFT CARD';
  };

  // Get category slug for navigation - use category from database, fallback to categoryDisplayName
  const getCategorySlug = () => {
    if (category) {
      return encodeURIComponent(category);
    }
    if (categoryDisplayName) {
      return encodeURIComponent(categoryDisplayName.toLowerCase().replace(/\s+/g, '-'));
    }
    return 'category';
  };

  return (
    <Link
      href={`/cashcard/${getCategorySlug()}`}
      className="group block"
    >
      <div className="relative bg-transparent rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02]">
        {/* Red Header Section */}
        <div className="bg-red-600 px-2 py-1.5 flex items-center gap-1.5">
          {/* Lambda Logo (Λ) */}
          <div className="flex-shrink-0 text-white font-bold text-xs leading-none">
            Λ
          </div>
          {/* Card Type Text - Single line */}
          <div className="flex-1 min-w-0">
            <span className="text-white text-[9px] font-semibold uppercase leading-tight">
              {getCardType()} {getRegionText()}
            </span>
          </div>
        </div>

        {/* Product Image Section */}
        <div className="bg-black aspect-square flex items-center justify-center p-4">
          {imageUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imageUrl} 
                alt={displayName} 
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-full h-full flex items-center justify-center text-white/40 text-sm';
                    placeholder.textContent = displayName;
                    parent.appendChild(placeholder);
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40 text-sm text-center">
              {displayName}
            </div>
          )}
        </div>

        {/* Product Name Label */}
        <div className="bg-black px-3 py-2 text-center">
          <p className="text-white text-sm font-medium truncate">
            {displayName}
          </p>
        </div>
      </div>
    </Link>
  );
}

