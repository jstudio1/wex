'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashcardProduct {
  id: number;
  name: string;
  key: string;
  image_url: string | null;
  item: {
    price: string;
    originalPrice: string;
  } | null;
}

interface CashcardCarouselSectionProps {
  products: CashcardProduct[];
}

export default function CashcardCarouselSection({ products }: CashcardCarouselSectionProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [lastX, setLastX] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check scroll position and update navigation buttons
  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollPosition();
    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [products]);

  // Continuous smooth scrolling during drag
  useEffect(() => {
    if (isDragging) {
      const container = scrollContainerRef.current;
      if (!container) return;

      const animate = () => {
        if (!isDragging || !container) return;
        const rect = container.getBoundingClientRect();
        const x = currentX - rect.left;
        const walk = (x - startX) * 1.2;
        container.scrollLeft = scrollLeft - walk;
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isDragging, currentX, startX, scrollLeft]);

  // Momentum scrolling with smooth animation
  useEffect(() => {
    if (!isDragging && Math.abs(velocity) > 0.1) {
      const container = scrollContainerRef.current;
      if (!container) return;

      const animate = () => {
        if (!container) return;
        
        container.scrollLeft -= velocity;
        setVelocity(velocity * 0.95); // Friction coefficient
        
        if (Math.abs(velocity) > 0.1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setVelocity(0);
          checkScrollPosition();
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isDragging, velocity]);

  const scrollTo = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Card width is approximately 200px, gap is gap-6 = 24px
    const cardWidth = 200;
    const gap = 24;
    const scrollAmount = (cardWidth + gap) * 5; // Scroll 5 cards at a time

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    
    setTimeout(checkScrollPosition, 500);
  };

  // Drag to scroll functionality with smooth momentum
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Cancel any ongoing momentum scroll
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setIsDragging(true);
    setVelocity(0);
    const rect = container.getBoundingClientRect();
    setStartX(e.pageX - rect.left);
    setCurrentX(e.pageX);
    setLastX(e.pageX);
    setLastTime(Date.now());
    setScrollLeft(container.scrollLeft);
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
    container.style.scrollBehavior = 'auto';
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      const container = scrollContainerRef.current;
      if (container) {
        container.style.cursor = 'grab';
        container.style.userSelect = 'auto';
        container.style.scrollBehavior = 'smooth';
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      const container = scrollContainerRef.current;
      if (container) {
        container.style.cursor = 'grab';
        container.style.userSelect = 'auto';
        container.style.scrollBehavior = 'smooth';
        setTimeout(() => {
          checkScrollPosition();
        }, 100);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const currentTime = Date.now();
    const timeDelta = currentTime - lastTime;
    
    // Calculate velocity for momentum
    if (timeDelta > 0) {
      const currentVelocity = ((e.pageX - lastX) / timeDelta) * 16;
      setVelocity(currentVelocity);
    }
    
    setCurrentX(e.pageX);
    setLastX(e.pageX);
    setLastTime(currentTime);
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setIsDragging(true);
    setVelocity(0);
    const rect = container.getBoundingClientRect();
    setStartX(e.touches[0].pageX - rect.left);
    setCurrentX(e.touches[0].pageX);
    setLastX(e.touches[0].pageX);
    setLastTime(Date.now());
    setScrollLeft(container.scrollLeft);
    container.style.scrollBehavior = 'auto';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const currentTime = Date.now();
    const timeDelta = currentTime - lastTime;
    
    if (timeDelta > 0) {
      const currentVelocity = ((e.touches[0].pageX - lastX) / timeDelta) * 16;
      setVelocity(currentVelocity);
    }
    
    setCurrentX(e.touches[0].pageX);
    setLastX(e.touches[0].pageX);
    setLastTime(currentTime);
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      const container = scrollContainerRef.current;
      if (container) {
        container.style.scrollBehavior = 'smooth';
        setTimeout(() => {
          checkScrollPosition();
        }, 100);
      }
    }
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl p-6 bg-[#0a0a0a] shadow-sm border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 shadow-md">
            <CreditCard className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">บัตรเติมเงิน</h2>
            <p className="text-sm text-gray-400">Cash Card</p>
          </div>
        </div>
        <Link 
          href="/cashcard" 
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors group"
        >
          ดูทั้งหมด
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Navigation Buttons */}
        {products.length > 5 && (
          <>
            <button
              onClick={() => scrollTo('left')}
              disabled={!canScrollLeft}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-purple-500/90 hover:bg-purple-500 text-white shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed",
                !canScrollLeft && "hidden"
              )}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollTo('right')}
              disabled={!canScrollRight}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-purple-500/90 hover:bg-purple-500 text-white shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed",
                !canScrollRight && "hidden"
              )}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className={`flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth px-4 py-2 cursor-grab active:cursor-grabbing select-none ${!isDragging ? 'snap-x snap-mandatory' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {products.map((product, index) => (
            <Link 
              key={product.id} 
              href={`/cashcard/${product.key}`} 
              className="group block flex-shrink-0 w-[200px] snap-start my-2"
              prefetch={index < 6}
            >
              <div className="relative rounded-xl overflow-hidden shadow-lg shadow-black/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-900/20">
                {product.image_url ? (
                  <Image 
                    src={product.image_url} 
                    alt={product.name} 
                    width={200}
                    height={280}
                    className="object-cover w-full h-auto" 
                    sizes="200px"
                    loading={index < 6 ? 'eager' : 'lazy'}
                    priority={index < 3}
                  />
                ) : (
                  <div className="w-[200px] h-[280px] bg-gray-900/60 flex items-center justify-center">
                    <CreditCard className="h-16 w-16 text-gray-600" />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

