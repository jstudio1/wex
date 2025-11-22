'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Gamepad2, ChevronRight, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GtopupProduct {
  id: number;
  name: string;
  key: string;
  image_url: string | null;
  badge_enabled?: boolean;
  badge_percent?: number | null;
  badge_text?: string | null;
  item: {
    price: string;
    originalPrice: string;
  } | null;
}

interface GtopupCarouselSectionProps {
  products: GtopupProduct[];
}

export default function GtopupCarouselSection({ products }: GtopupCarouselSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-md">
            <Gamepad2 className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">เติมเกม</h2>
            <p className="text-sm text-gray-400">Game Top-up</p>
          </div>
        </div>
        <Link 
          href="/products" 
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors group"
        >
          ดูทั้งหมด
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Products Grid - 2 rows x 6 columns (12 products) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        {products.map((product, index) => (
          <Link 
            key={product.id} 
            href={`/products/${product.key}`} 
            className="group block h-full"
            prefetch={index < 6}
          >
            <div className="flex h-full flex-col rounded-xl sm:rounded-2xl border border-gray-800/60 bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] p-3 sm:p-4 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-blue-600/70 hover:shadow-xl hover:shadow-blue-900/20">
              <div className="relative h-32 sm:h-36 md:h-40 w-full rounded-lg sm:rounded-xl overflow-hidden bg-gray-900/60 flex items-center justify-center mb-3 sm:mb-4 flex-shrink-0">
                {product.image_url ? (
                  <Image 
                    src={product.image_url} 
                    alt={product.name} 
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105" 
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 180px"
                    loading={index < 6 ? 'eager' : 'lazy'}
                    priority={index < 3}
                  />
                ) : (
                  <Gamepad2 className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-gray-600" />
                )}
                {/* Badge - แสดงข้อความป้าย + เปอร์เซ็นต์ส่วนลด */}
                {product.badge_enabled && (product.badge_percent != null || product.badge_text) && (
                  <div className="absolute bottom-2 left-2 z-10">
                    <Badge variant="destructive" className="shadow-md gap-1 h-5 min-w-fit">
                      <Zap className="h-3 w-3" />
                      <span className="font-semibold whitespace-nowrap text-xs">
                        {(() => {
                          const parts: string[] = [];
                          if (product.badge_text && product.badge_text.trim()) {
                            parts.push(product.badge_text.trim());
                          }
                          if (product.badge_percent != null && Number(product.badge_percent) > 0) {
                            parts.push(`ลด ${Math.round(Number(product.badge_percent))}%`);
                          }
                          return parts.length > 0 ? parts.join(' ') : '';
                        })()}
                      </span>
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-h-0">
                <p className="text-xs sm:text-sm font-semibold text-white line-clamp-2 h-[2.5rem] sm:h-[2.8rem] text-center leading-snug sm:leading-tight flex items-center justify-center">
                  {product.name}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

