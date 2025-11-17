'use client';

import Link from 'next/link';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface CashcardCategoryCardNewProps {
  category: string;
  displayName: string | null;
  imageUrl: string | null;
  index?: number;
}

export function CashcardCategoryCardNew({ category, displayName, imageUrl, index = 0 }: CashcardCategoryCardNewProps) {
  const { ref, isVisible } = useScrollAnimation();
  // Extract card type from category or display name
  const getCardType = () => {
    const upperCategory = (category || '').toUpperCase();
    const upperDisplay = (displayName || '').toUpperCase();
    const text = upperCategory + ' ' + upperDisplay;
    
    if (text.includes('GARENA')) return 'GARENA SHELL GIFT CARD';
    if (text.includes('RAZER')) return 'RAZER GOLD GIFT CARD';
    if (text.includes('RIOT')) return 'RIOT PIN GIFT CARD';
    if (text.includes('ROBLOX')) return 'ROBLOX GIFT CARD';
    if (text.includes('STEAM')) return 'STEAM PIN GIFT CARD';
    if (text.includes('PUBG')) return 'PUBG MOBILE';
    if (text.includes('PLAYSTATION') || text.includes('PLAY STATION')) return 'PLAYSTATION GIFT CARD';
    return 'GIFT CARD';
  };

  const getRegionText = () => {
    const upperText = ((category || '') + ' ' + (displayName || '')).toUpperCase();
    if (upperText.includes('TH') || upperText.includes('TH REGION')) {
      return 'TH REGION';
    }
    if (upperText.includes('GLOBAL')) {
      return 'GLOBAL';
    }
    return 'TH REGION';
  };

  const categoryDisplay = displayName || category;

  return (
    <div
      ref={ref}
      className={`group block transition-all duration-300 ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
        transitionDelay: isVisible ? `${index * 20}ms` : '0ms',
      }}
    >
      <Link
        href={`/cashcard/${encodeURIComponent(category)}`}
        className="block"
      >
        <div className="relative bg-transparent rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02]">
          {/* Purple Header Section */}
          <div className="bg-purple-600 px-2 py-1.5 flex items-center">
            {/* Card Type Text - Single line */}
            <div className="flex-1 min-w-0">
              <span className="text-white text-[9px] font-semibold uppercase leading-tight">
                {getCardType()} {getRegionText()}
              </span>
            </div>
          </div>

        {/* Category Image Section */}
        <div className="bg-black aspect-square flex items-center justify-center p-4 overflow-hidden relative">
          {imageUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imageUrl} 
                alt={categoryDisplay} 
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    // Create placeholder when image fails
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-full h-full flex flex-col items-center justify-center relative';
                    placeholder.innerHTML = `
                      <div class="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-purple-600/10"></div>
                      <div class="relative z-10">
                        <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-600/30 to-purple-500/20 border-2 border-purple-500/30 flex items-center justify-center shadow-lg">
                          <svg class="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                          </svg>
                        </div>
                        <p class="text-white/80 text-xs font-medium text-center px-2">${categoryDisplay}</p>
                      </div>
                    `;
                    parent.appendChild(placeholder);
                  }
                }}
              />
            </div>
          ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative">
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-purple-600/10"></div>
              
              {/* Pattern Overlay */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)
                  `
                }}
              ></div>
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                {/* Icon with gradient circle */}
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-600/30 to-purple-500/20 border-2 border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                  </svg>
                </div>
                
                {/* Category Name */}
                <p className="text-white/90 text-xs font-semibold text-center px-2 leading-tight">
                  {categoryDisplay}
                </p>
                
                {/* Decorative dots */}
                <div className="flex gap-1 mt-2">
                  <div className="w-1 h-1 rounded-full bg-purple-500/50"></div>
                  <div className="w-1 h-1 rounded-full bg-purple-500/30"></div>
                  <div className="w-1 h-1 rounded-full bg-purple-500/50"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Name Label */}
        <div className="bg-black px-3 py-2 text-center">
          <p className="text-white text-sm font-medium truncate">
            {categoryDisplay}
          </p>
        </div>
      </div>
      </Link>
    </div>
  );
}

