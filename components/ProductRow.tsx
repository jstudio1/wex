'use client';

import { useRowGroupAnimation } from '@/hooks/useRowGroupAnimation';
import AnimatedProductCard from '@/components/AnimatedProductCard';

type ProductCard = {
  id: number;
  name: string;
  key: string;
  image_url?: string | null;
  items: { id: number; name: string; sku: string; price: string; originalPrice: string; is_recommended?: boolean }[];
  badge?: { text?: string | null; percent?: number | null } | null;
};

type Props = {
  row: ProductCard[];
  rowIndex: number;
  flashStart?: string | null;
  flashEnd?: string | null;
  basePath?: string;
};

export default function ProductRow({ row, rowIndex, flashStart, flashEnd, basePath }: Props) {
  const { ref, isVisible } = useRowGroupAnimation();

  return (
    <div 
      ref={ref}
      className={`contents ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        transitionDelay: isVisible ? `${rowIndex * 100}ms` : '0ms'
      }}
    >
      {row.map((p) => (
        <AnimatedProductCard 
          key={p.id}
          product={p} 
          isHighlight={false} 
          index={0}
          flashStart={flashStart}
          flashEnd={flashEnd}
          noAnimation={true}
          basePath={basePath}
        />
      ))}
    </div>
  );
}

