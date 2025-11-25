'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Package, TrendingUp } from 'lucide-react';
import Image from 'next/image';

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
        className={`group relative w-full h-48 md:h-64 rounded-2xl overflow-hidden border border-emerald-500/20 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/40 hover:scale-[1.02] hover:border-emerald-500/50 ${
          isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
        style={{
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out, box-shadow 0.3s ease-out'
        }}
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={bannerImage}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Subtle Overlay on Hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
        </div>

        {/* Shine Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
      </div>
    </Link>
  );
}
