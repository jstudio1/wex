import { Skeleton } from '@/components/ui/skeleton';

export default function TopupLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:py-10 space-y-6">
      {/* Header skeleton */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Skeleton className="size-12 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-5 w-64 mx-auto" />
      </div>

      {/* Payment Method Selection skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 md:p-6 rounded-xl border-2 border-white/10 bg-white/5">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="size-12 rounded-lg" />
              <div className="text-center space-y-1">
                <Skeleton className="h-5 w-24 mx-auto" />
                <Skeleton className="h-3 w-32 mx-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Section skeleton */}
      <div className="card p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </div>
    </main>
  );
}

