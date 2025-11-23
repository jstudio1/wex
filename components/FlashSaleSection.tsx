'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, ShoppingCart, Flame, Clock, Package, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
import ElectricBorder from '@/components/ElectricBorder';
import { cn } from '@/lib/utils';

interface FlashSaleProduct {
  id: number;
  itemId: number;
  name: string;
  key: string;
  image_url: string | null;
  badge_enabled: boolean;
  badge_percent: number | null;
  badge_text: string | null;
  badge_apply_price: boolean;
  item: {
    id: number;
    name: string;
    price: string;
    originalPrice: string;
    icon_url: string | null;
  } | null;
  savings: string;
  totalSold: number;
  todaySold: number;
  maxQuantity: number | null;
  quantitySold: number;
  quantityRemaining: number | null;
  daysRemaining: number | null;
}

export default function FlashSaleSection() {
  const [products, setProducts] = useState<FlashSaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUserInteractingRef = useRef(false);
  
  // ใช้ ref แทน state เพื่อลด re-renders และทำให้ smooth ขึ้น
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const currentXRef = useRef(0);
  const toast = useToast();
  const { openLoginDialog } = useAuthDialog();

  useEffect(() => {
    const fetchFlashSale = async () => {
      try {
        // เพิ่ม timestamp เพื่อป้องกัน cache ใน production
        const timestamp = Date.now();
        const res = await fetch(`/api/products/flashsale?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        if (!res.ok) throw new Error('Failed to fetch flashsale products');
        const json = await res.json();
        setProducts(json.data || []);
      } catch (error) {
        console.error('Error fetching flashsale:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashSale();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchFlashSale, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Auto-scroll functionality - หยุดเมื่อผู้ใช้กำลัง drag
  useEffect(() => {
    if (products.length <= 3) return; // Don't auto-scroll if 3 or fewer items
    
    const container = scrollContainerRef.current;
    if (!container) return;

    // Clear existing interval
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }

    autoScrollIntervalRef.current = setInterval(() => {
      // หยุด auto-scroll ถ้าผู้ใช้กำลัง drag หรือ interact
      if (isDragging || isUserInteractingRef.current) {
        return;
      }
      
      // Card width is w-[400px] = 400px, gap is gap-6 = 24px
      const cardWidth = 400;
      const gap = 24;
      const scrollAmount = (cardWidth + gap) * 3; // Scroll 3 cards at a time
      
      const maxScroll = container.scrollWidth - container.clientWidth;
      const nextScroll = container.scrollLeft + scrollAmount;
      
      if (nextScroll >= maxScroll - 10) {
        // Reset to beginning
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
      
      // Update scroll buttons after scroll animation
      setTimeout(checkScrollPosition, 500);
    }, 4000); // Auto-scroll every 4 seconds

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [products, isDragging]);

  const scrollTo = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Card width is w-[400px] = 400px, gap is gap-6 = 24px
    const cardWidth = 400;
    const gap = 24;
    const scrollAmount = (cardWidth + gap) * 3; // Scroll 3 cards at a time

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    
    setTimeout(checkScrollPosition, 500);
  };

  // Momentum scrolling with smooth animation
  useEffect(() => {
    if (!isDragging && Math.abs(velocity) > 0.1) {
      const container = scrollContainerRef.current;
      if (!container) return;

      isUserInteractingRef.current = true;
      let lastFrameTime = performance.now();

      const animate = (currentTime: number) => {
        if (!container) return;
        
        const deltaTime = (currentTime - lastFrameTime) / 16.67; // Normalize to 60fps
        lastFrameTime = currentTime;
        
        const currentScrollLeft = container.scrollLeft;
        const newScrollLeft = currentScrollLeft - (velocity * deltaTime);
        const maxScroll = container.scrollWidth - container.clientWidth;
        
        // จำกัดการเลื่อนไม่ให้เกินขอบ
        if (newScrollLeft < 0) {
          container.scrollLeft = 0;
          setVelocity(0);
          isUserInteractingRef.current = false;
          checkScrollPosition();
          return;
        }
        
        if (newScrollLeft > maxScroll) {
          container.scrollLeft = maxScroll;
          setVelocity(0);
          isUserInteractingRef.current = false;
          checkScrollPosition();
          return;
        }
        
        // อัพเดท scrollLeft โดยตรง (ไม่ใช้ state เพื่อลด re-renders)
        container.scrollLeft = newScrollLeft;
        scrollLeftRef.current = newScrollLeft;
        const newVelocity = velocity * 0.92; // Friction coefficient
        setVelocity(newVelocity);
        
        if (Math.abs(newVelocity) > 0.1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setVelocity(0);
          isUserInteractingRef.current = false;
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

  // Continuous smooth scrolling during drag - ใช้ ref เพื่อลด re-renders
  useEffect(() => {
    if (isDragging) {
      const container = scrollContainerRef.current;
      if (!container) return;

      isUserInteractingRef.current = true;
      let rafId: number | null = null;

      const animate = () => {
        if (!isDragging || !container) {
          isUserInteractingRef.current = false;
          return;
        }
        
        const rect = container.getBoundingClientRect();
        const x = currentXRef.current - rect.left;
        const walk = (x - startXRef.current) * 1.2;
        const newScrollLeft = scrollLeftRef.current - walk;
        
        // จำกัดการเลื่อนไม่ให้เกินขอบ
        const maxScroll = container.scrollWidth - container.clientWidth;
        const clampedScroll = Math.max(0, Math.min(maxScroll, newScrollLeft));
        
        // อัพเดท scrollLeft โดยตรง (ไม่ใช้ state)
        container.scrollLeft = clampedScroll;
        scrollLeftRef.current = clampedScroll;
        
        rafId = requestAnimationFrame(animate);
        animationFrameRef.current = rafId;
      };

      rafId = requestAnimationFrame(animate);
      animationFrameRef.current = rafId;

      return () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        isUserInteractingRef.current = false;
      };
    }
  }, [isDragging]);

  // Drag to scroll functionality with smooth momentum
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Cancel any ongoing momentum scroll
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    isUserInteractingRef.current = true;
    setIsDragging(true);
    setVelocity(0);
    const rect = container.getBoundingClientRect();
    startXRef.current = e.pageX - rect.left;
    currentXRef.current = e.pageX;
    lastXRef.current = e.pageX;
    lastTimeRef.current = Date.now();
    scrollLeftRef.current = container.scrollLeft;
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
        container.style.scrollBehavior = 'auto'; // ใช้ auto เพื่อไม่ให้ snap ชนกับ momentum
        
        // Update scroll position after drag ends
        setTimeout(() => {
          checkScrollPosition();
          // เปลี่ยนกลับเป็น smooth หลังจาก momentum เสร็จ
          setTimeout(() => {
            if (container) {
              container.style.scrollBehavior = 'smooth';
              isUserInteractingRef.current = false;
            }
          }, 500);
        }, 100);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const currentTime = Date.now();
    const timeDelta = currentTime - lastTimeRef.current;
    
    // Update current position immediately for smooth scrolling (ใช้ ref)
    currentXRef.current = e.pageX;
    
    // Calculate velocity for momentum (ใช้ค่าเฉลี่ยเพื่อลดการกระตุก)
    if (timeDelta > 0 && timeDelta < 100) { // จำกัด timeDelta เพื่อป้องกันค่า velocity ที่ผิดปกติ
      const currentVelocity = ((e.pageX - lastXRef.current) / timeDelta) * 16; // Normalize to 60fps
      // ใช้ค่าเฉลี่ยเพื่อลดการกระตุก
      setVelocity(prev => prev * 0.7 + currentVelocity * 0.3);
    }
    
    lastXRef.current = e.pageX;
    lastTimeRef.current = currentTime;
  };

  // Touch events for mobile with smooth momentum
  const handleTouchStart = (e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Cancel any ongoing momentum scroll
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    isUserInteractingRef.current = true;
    setIsDragging(true);
    setVelocity(0);
    const rect = container.getBoundingClientRect();
    startXRef.current = e.touches[0].pageX - rect.left;
    currentXRef.current = e.touches[0].pageX;
    lastXRef.current = e.touches[0].pageX;
    lastTimeRef.current = Date.now();
    scrollLeftRef.current = container.scrollLeft;
    container.style.scrollBehavior = 'auto';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const currentTime = Date.now();
    const timeDelta = currentTime - lastTimeRef.current;
    
    // Update current position immediately for smooth scrolling (ใช้ ref)
    currentXRef.current = e.touches[0].pageX;
    
    // Calculate velocity for momentum (ใช้ค่าเฉลี่ยเพื่อลดการกระตุก)
    if (timeDelta > 0 && timeDelta < 100) { // จำกัด timeDelta เพื่อป้องกันค่า velocity ที่ผิดปกติ
      const currentVelocity = ((e.touches[0].pageX - lastXRef.current) / timeDelta) * 16;
      // ใช้ค่าเฉลี่ยเพื่อลดการกระตุก
      setVelocity(prev => prev * 0.7 + currentVelocity * 0.3);
    }
    
    lastXRef.current = e.touches[0].pageX;
    lastTimeRef.current = currentTime;
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      const container = scrollContainerRef.current;
      if (container) {
        container.style.scrollBehavior = 'auto'; // ใช้ auto เพื่อไม่ให้ snap ชนกับ momentum
        
        // Update scroll position after drag ends
        setTimeout(() => {
          checkScrollPosition();
          // เปลี่ยนกลับเป็น smooth หลังจาก momentum เสร็จ
          setTimeout(() => {
            if (container) {
              container.style.scrollBehavior = 'smooth';
              isUserInteractingRef.current = false;
            }
          }, 500);
        }, 100);
      }
    }
  };

  const handleBuy = async (productKey: string) => {
    try {
      const res = await fetch(`/api/products/${productKey}`);
      if (res.status === 401) {
        openLoginDialog();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch product');
      window.location.href = `/products/${productKey}`;
    } catch (error) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเข้าถึงสินค้าได้',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl p-5 bg-[#0a0a0a] border border-orange-500/20">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-80 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <ElectricBorder
      color="#f97316"
      speed={0.9}
      chaos={0.3}
      thickness={3}
      style={{ borderRadius: 16 }}
      className="overflow-visible"
    >
      <section className="flash-sale-section relative rounded-xl bg-[#0a0a0a] overflow-visible" style={{ border: 'none' }}>
        {/* Particle Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
        {/* Animated particles around border */}
        {Array.from({ length: 30 }).map((_, i) => {
          const isOnBorder = Math.random() > 0.5;
          const position = Math.random() * 100;
          const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
          const randomX = (Math.random() - 0.5) * 100;
          const randomY = (Math.random() - 0.5) * 100;
          
          let style: React.CSSProperties = {
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          };

          if (isOnBorder) {
            // Place particles on the border
            switch (side) {
              case 0: // top
                style = { ...style, left: `${position}%`, top: '0%' };
                break;
              case 1: // right
                style = { ...style, right: '0%', top: `${position}%` };
                break;
              case 2: // bottom
                style = { ...style, left: `${position}%`, bottom: '0%' };
                break;
              case 3: // left
                style = { ...style, left: '0%', top: `${position}%` };
                break;
            }
          } else {
            // Random position inside
            style = {
              ...style,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            };
          }

          return (
            <div
              key={i}
              className="particle absolute"
              style={style}
            />
          );
        })}
      </div>

        {/* Content */}
        <div className="relative z-10 p-5">
          {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 flex items-center justify-center">
            <Image
              src="https://img2.pic.in.th/pic/pngtree-flash-sale-yellow-red-3d-png-image_5535040-removebg-preview.png"
              alt="Flash Sale"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">แฟลชเซลล์</h2>
            <p className="text-xs text-gray-400">สินค้าพิเศษราคาพิเศษ</p>
          </div>
        </div>
        <Link href="/products">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 text-sm h-8 px-3"
          >
            ดูทั้งหมด
          </Button>
        </Link>
      </div>

      {/* Products Carousel */}
      <div className="relative">
        {/* Navigation Buttons */}
        {products.length > 3 && (
          <>
            <button
              onClick={() => scrollTo('left')}
              disabled={!canScrollLeft}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-orange-500/90 hover:bg-orange-500 text-white shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed",
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
                "absolute right-0 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-orange-500/90 hover:bg-orange-500 text-white shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed",
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
          className={`flex gap-6 overflow-x-auto overflow-y-hidden scrollbar-hide px-4 py-4 cursor-grab active:cursor-grabbing select-none min-h-[280px]`}
          style={{ 
            scrollBehavior: (isDragging || Math.abs(velocity) > 0.1 || isUserInteractingRef.current) ? 'auto' : 'smooth',
            scrollSnapType: 'none', // ปิด snap ทั้งหมดเพื่อให้ smooth ขึ้น
            WebkitOverflowScrolling: 'touch' // เพิ่ม smooth scrolling สำหรับ iOS
          }}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {products.map((product, index) => {
          if (!product.item) return null;

          const daysRemaining = product.daysRemaining || 0;
          const quantityPercent = product.maxQuantity 
            ? Math.max(0, Math.min(100, (product.quantityRemaining || 0) / product.maxQuantity * 100))
            : null;

          return (
              <div 
                key={`${product.id}-${product.itemId}`} 
                className="flash-sale-card group relative flex-shrink-0 w-[400px] my-2"
              >
              {/* Electric Border on Hover - Wraps entire card */}
              <div className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 rounded-lg overflow-visible">
                <ElectricBorder
                  color="#facc15"
                  speed={0.9}
                  chaos={0.3}
                  thickness={2}
                  style={{ borderRadius: 12 }}
                  className="absolute inset-0 w-full h-full overflow-visible"
                >
                  <div className="w-full h-full" />
                </ElectricBorder>
              </div>
              
                {/* Product Card Content - Grid Layout */}
                <div className="relative rounded-lg border border-gray-800 bg-[#0f0f0f] transition-all duration-200 z-0 flex flex-col overflow-visible shadow-lg">
                    {/* Top Row - Image and Details */}
                    <div className="flex flex-row items-stretch">
                      {/* Left Section - Product Image (50%) - Square */}
                      <div className="relative flex-1 w-1/2 aspect-square flex-shrink-0 overflow-hidden bg-gray-900 flex items-center justify-center">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="50vw"
                  />
                ) : (
                          <ShoppingCart className="h-12 w-12 text-gray-600" />
                )}
              </div>

                      {/* Right Section - Product Details (50%) */}
                      <div className="flex-1 w-1/2 flex flex-col p-3 min-h-40">
                        {/* Product Name - Scrollable */}
                        <div className="mb-2 overflow-hidden relative h-5">
                          <div className="absolute inset-0 flex items-center w-full">
                            <p 
                              className="text-sm font-semibold text-white whitespace-nowrap animate-scroll-text"
                              style={{
                                animation: product.item.name.length > 20 
                                  ? 'scroll-text 8s ease-in-out infinite' 
                                  : 'none'
                              }}
                            >
                    {product.item.name}
                  </p>
                          </div>
                        </div>

                        {/* Original Price */}
                        {Number(product.item.originalPrice) > Number(product.item.price) && (
                          <p className="text-xs text-gray-400 line-through mb-1">
                            ฿{Number(product.item.originalPrice).toFixed(0)}
                  </p>
                        )}

                        {/* Savings Badge */}
                        {Number(product.savings) > 0 && (
                          <div className="mb-1">
                            <div className="inline-flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                              <TrendingDown className="h-3 w-3" />
                              <span>SAVE ฿{Number(product.savings).toFixed(2)}</span>
                </div>
                  </div>
                )}

                        {/* Flash Sale Price */}
                        <div className="mb-1">
                          <p className="text-2xl font-bold text-white">
                            ฿{Number(product.item.price).toFixed(2)}
                          </p>
              </div>

                        {/* Sales Progress Section - Always show */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Flame className="h-3 w-3 text-red-500 flex-shrink-0" />
                            <span className="text-white text-xs font-semibold">ใกล้แล้ว</span>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {product.maxQuantity 
                                ? `${product.quantitySold || 0}/${product.maxQuantity} sold`
                                : `${product.totalSold || 0} sold`
                              }
                            </span>
                    </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-300"
                              style={{ width: `${quantityPercent !== null ? quantityPercent : 0}%` }}
                    />
                  </div>
                </div>
                      </div>
                    </div>

                    {/* Middle Section - Time Remaining (Full Width) */}
                    <div className="bg-orange-600/30 p-2 border-t border-gray-800 border-b border-gray-800 flex flex-col items-center justify-center text-center">
                      <p className="text-white text-[10px] mb-0.5">เหลือเวลาอีก</p>
                      <p className="text-lg font-bold text-green-400">
                        {product.daysRemaining !== null && product.daysRemaining > 0 
                          ? `${product.daysRemaining} วัน`
                          : '0 วัน'
                        }
                      </p>
                    </div>

                    {/* Bottom Section - Buy Button */}
                    <div className="flex flex-col">
                      {/* Buy Button Section */}
                      <div className="flex flex-col justify-center p-2">
                  <Button
                onClick={() => handleBuy(product.key)}
                size="sm"
                disabled={product.quantityRemaining !== null && product.quantityRemaining <= 0}
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-xs py-2 h-8 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                          <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                          {product.quantityRemaining !== null && product.quantityRemaining <= 0 ? 'หมดแล้ว' : 'ซื้อเลย!'}
              </Button>
                        {/* Daily Sales Count */}
                        <p className="text-center text-[10px] text-white mt-1">
                          {product.todaySold || 0} คนซื้อไปแล้ววันนี้
                        </p>
                      </div>
                  </div>
                </div>
            </div>
          );
        })}
          </div>
        </div>
        </div>
      </section>
    </ElectricBorder>
  );
}

