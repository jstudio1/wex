'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';

type GameCategoryCardProps = {
  id: number;
  name: string;
  slug: string;
  accountCount: number;
  minPrice?: number;
  maxPrice?: number;
  imageUrl?: string | null;
};

export default function GameCategoryCard({ 
  id, 
  name, 
  slug, 
  accountCount, 
  minPrice, 
  maxPrice,
  imageUrl 
}: GameCategoryCardProps) {
  const bannerImage = imageUrl || 'https://img2.pic.in.th/pic/1000019813.png';
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  const priceRange = minPrice !== undefined && maxPrice !== undefined 
    ? `${minPrice} - ${maxPrice}` 
    : minPrice !== undefined 
      ? `${minPrice}` 
      : '';

  return (
    <Link href={`/categories/${slug}`}>
      <div
        ref={cardRef}
        className={`group relative flex flex-col bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden transition-all duration-300 hover:border-accent/50 hover:scale-[1.02] ${
          isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
        style={{
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out'
        }}
      >
        {/* Banner Image */}
        <div className="relative w-full h-52 md:h-44 overflow-hidden bg-black/20 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerImage}
            alt={name}
            className="w-full h-full object-contain md:object-cover transition-all duration-300 group-hover:scale-110 group-hover:grayscale"
            style={{ maxHeight: '100%' }}
          />
          
          {/* Button - Show on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative z-10">
              <Button
                variant="outline"
                className="bg-accent/90 hover:bg-accent border-accent/50 hover:border-accent text-[color:var(--text)] font-medium px-6 py-2.5 rounded-lg shadow-lg shadow-accent/20 transition-all duration-200 hover:scale-105"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `/categories/${slug}`;
                }}
              >
                ดูรายละเอียด
              </Button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-3 bg-black/20">
          <h3 className="text-accent font-semibold text-sm md:text-base mb-1.5">{name}</h3>
          <div className="flex items-center justify-between">
            <p className="text-[color:var(--text)]/70 text-xs">
              {accountCount} สินค้า
            </p>
            {priceRange && (
              <p className="text-accent font-medium text-xs">
                {priceRange}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
