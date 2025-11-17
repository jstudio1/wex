'use client';

import Link from 'next/link';
import { Gamepad2, Home } from 'lucide-react';

export default function ProductsHeroBanner() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 py-16 shadow-lg">
      {/* Decorative Background Pattern - Light Orbs */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -left-4 -top-4 h-32 w-32 rounded-full bg-emerald-400 blur-3xl" />
        <div className="absolute -right-4 -bottom-4 h-32 w-32 rounded-full bg-emerald-400 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white blur-3xl" />
        <div className="absolute left-20 top-10 h-24 w-24 rounded-full bg-white blur-2xl" />
        <div className="absolute right-32 top-8 h-20 w-20 rounded-full bg-emerald-300 blur-2xl" />
      </div>
      
      {/* Geometric Patterns */}
      <div className="absolute inset-0 opacity-10">
        {/* Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
        
        {/* Circles Pattern */}
        <div className="absolute top-10 left-10 h-32 w-32 rounded-full border-2 border-white" />
        <div className="absolute top-20 left-20 h-20 w-20 rounded-full border border-white" />
        <div className="absolute bottom-10 right-20 h-28 w-28 rounded-full border-2 border-white" />
        <div className="absolute bottom-20 right-32 h-16 w-16 rounded-full border border-white" />
        
        {/* Diagonal Lines */}
        <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-bl from-white/5 to-transparent" />
      </div>
      
      {/* Dots Pattern */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)`,
        backgroundSize: '30px 30px'
      }} />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Icon */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Gamepad2 className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            เติมเกมออนไลน์
          </h1>
          
          {/* Subtitle */}
          <p className="mt-3 text-base text-white/90 sm:text-lg">
            บริการเติมเกมครบวงจร รวดเร็ว ปลอดภัย ราคาถูก
          </p>
          
          {/* Navigation Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:border-white/50"
            >
              <Home className="h-4 w-4" />
              <span>หน้าแรก</span>
            </Link>
            
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-emerald-600 shadow-md transition-all duration-200 hover:bg-white/95 hover:shadow-lg"
            >
              <Gamepad2 className="h-4 w-4" />
              <span>เติมเกมออนไลน์</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

