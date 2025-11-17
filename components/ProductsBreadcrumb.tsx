'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function ProductsBreadcrumb() {
  return (
    <nav className="flex items-center gap-2 py-4 text-sm">
      <Link
        href="/"
        className="font-medium text-gray-600 transition-colors hover:text-[#dc2626]"
      >
        หน้าแรก
      </Link>
      
      <ChevronRight className="h-4 w-4 text-gray-400" />
      
      <span className="font-semibold text-gray-900">
        เติมเกมออนไลน์
      </span>
    </nav>
  );
}

