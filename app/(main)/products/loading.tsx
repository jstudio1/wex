import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsLoading() {
  return (
    <div className="relative overflow-hidden">
      <section className="border-b border-emerald-500/20 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <Skeleton className="h-7 w-44 rounded-full" />
              <Skeleton className="mt-4 h-6 w-32 rounded-full" />
              <Skeleton className="mt-4 h-12 w-full max-w-xl" />
              <Skeleton className="mt-3 h-12 w-full max-w-lg" />
              <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
              <Skeleton className="mt-2 h-4 w-full max-w-xl" />
              <div className="mt-6 flex gap-3">
                <Skeleton className="h-10 w-36 rounded-xl" />
                <Skeleton className="h-10 w-36 rounded-xl" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="space-y-4">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
