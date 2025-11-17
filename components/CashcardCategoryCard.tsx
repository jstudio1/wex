'use client';

import Link from 'next/link';
import { CreditCard, ArrowRight } from 'lucide-react';

interface CashcardCategoryCardProps {
  category: string;
  displayName: string | null;
  imageUrl: string | null;
}

export function CashcardCategoryCard({ category, displayName, imageUrl }: CashcardCategoryCardProps) {
  return (
    <Link
      href={`/cashcard/${encodeURIComponent(category)}`}
      className="group relative block h-full"
    >
      <div className="card p-6 h-full flex flex-col items-center text-center space-y-5 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border-white/10">
        {/* Image/Icon Section */}
        <div className="relative">
          {imageUrl ? (
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-accent/20 to-accent/10 border-2 border-accent/30 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:shadow-xl group-hover:shadow-accent/30 transition-all duration-300 group-hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imageUrl} 
                alt={displayName || category} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const iconWrapper = document.createElement('div');
                    iconWrapper.className = 'w-full h-full flex items-center justify-center';
                    iconWrapper.innerHTML = '<svg class="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>';
                    parent.appendChild(iconWrapper);
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center group-hover:from-accent/30 group-hover:to-accent/20 transition-all duration-300 border-2 border-accent/30 shadow-lg shadow-accent/20 group-hover:shadow-xl group-hover:shadow-accent/30 group-hover:scale-105">
              <CreditCard className="size-12 text-accent" />
            </div>
          )}
          {/* Decorative ring */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-2">
          <h3 className="text-xl font-bold text-[color:var(--text)] group-hover:text-accent transition-colors duration-300">
            {displayName || category}
          </h3>
          <div className="flex items-center justify-center gap-2 text-sm text-[color:var(--text)]/60 group-hover:text-[color:var(--text)]/80 transition-colors">
            <span>ดูรายการสินค้า</span>
            <ArrowRight className="size-4 transform group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-accent/0 via-accent/0 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </Link>
  );
}

