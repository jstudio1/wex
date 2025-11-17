'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AppWindow, ChevronRight } from 'lucide-react';

type Category = {
  id: number;
  category: string;
  display_name: string;
  card_image_url: string | null;
};

export function PremiumAppCategoryCard({ 
  category, 
  index 
}: { 
  category: Category; 
  index: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`group bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 border border-gray-800 ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div className="relative w-full aspect-[3/2] overflow-hidden">
        {category.card_image_url ? (
          <Image 
            src={category.card_image_url} 
            alt={category.display_name} 
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105" 
            sizes="(max-width: 768px) 100vw, 50vw"
            loading={index < 3 ? 'eager' : 'lazy'}
            priority={index < 3}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-purple-800 flex items-center justify-center">
            <AppWindow className="h-20 w-20 md:h-24 md:w-24 text-purple-400" />
          </div>
        )}
      </div>
      <div className="p-4 flex items-center justify-between gap-3">
        <h3 className="text-base md:text-lg font-bold text-red-600 uppercase tracking-wide">
          {category.display_name}
        </h3>
        <Link 
          href={`/premium-app?category=${encodeURIComponent(category.category)}`}
          className="flex-shrink-0 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-200 shadow-md"
          prefetch={index < 6}
        >
          <ChevronRight className="h-4 w-4" />
          เลือกดูสินค้า
        </Link>
      </div>
    </div>
  );
}

