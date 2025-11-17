import { Skeleton } from '@/components/ui/skeleton';

export default function HomeLoading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      {/* Flash Sale header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 md:h-10 w-32" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Hero Slider skeleton */}
      <section className="rounded-lg overflow-hidden border border-white/10">
        <div className="relative aspect-[16/6] bg-white/5">
          <Skeleton className="absolute inset-0 rounded-lg" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute left-6 bottom-6 space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </section>

      {/* Flash Sale products skeleton */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 md:h-8 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl" />
              <Skeleton className="h-4 w-24 mt-3 mx-auto" />
            </div>
          ))}
        </div>
      </section>

      {/* Popular games skeleton */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="mx-auto h-40 w-40 sm:h-44 sm:w-44 rounded-xl" />
              <Skeleton className="h-4 w-24 mt-3 mx-auto" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

