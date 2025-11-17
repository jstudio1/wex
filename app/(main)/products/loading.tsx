import { Skeleton } from '@/components/ui/skeleton';
import { Gamepad2 } from 'lucide-react';

export default function ProductsLoading() {
  return (
    <>
      {/* Hero Banner Skeleton */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 py-16 shadow-lg">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Skeleton className="h-16 w-16 rounded-full mb-4" />
            <Skeleton className="h-10 w-64 mb-3" />
            <Skeleton className="h-6 w-96" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="bg-black py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          
          {/* Products Grid Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <Skeleton className="h-36 w-36 sm:h-40 sm:w-40 md:h-44 md:w-44 lg:h-48 lg:w-48 rounded-xl mb-3" />
                <Skeleton className="h-5 w-24 mb-2" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

