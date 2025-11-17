import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailLoading() {
  return (
    <div className="relative min-h-screen pb-20 md:pb-6">
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-16 w-16 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-7 space-y-3">
            <section className="card p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 rounded border border-white/10">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </section>
            <section className="card p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-3 rounded border border-white/10">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </section>
            <section className="card p-4 space-y-3">
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-20" />
              </div>
            </section>
            <section className="card p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </section>
            <section className="card p-4 space-y-3">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </section>
            <Skeleton className="h-10 w-full rounded" />
          </div>
          <div className="col-span-12 md:col-span-5">
            <div className="card p-4 space-y-4">
              <Skeleton className="h-48 w-full rounded" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
