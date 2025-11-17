import { Skeleton } from '@/components/ui/skeleton';

export default function AccountLoading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-8 w-48" />
      </div>

      {/* ข้อมูลบัญชี skeleton */}
      <section className="shadow-input rounded-xl border border-white/15 bg-black/80 p-6 md:p-8 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
            <Skeleton className="size-5 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
            <Skeleton className="size-5 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
      </section>

      {/* เปลี่ยนรหัสผ่าน skeleton */}
      <section className="shadow-input rounded-xl border border-white/15 bg-black/80 p-6 md:p-8 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </section>
    </main>
  );
}

