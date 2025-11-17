import { Skeleton } from '@/components/ui/skeleton';
import { InputGroup } from '@/components/ui/input-group';

export default function AccountsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <Skeleton className="h-7 w-40" />
      <div>
        <div className="flex justify-center mb-6">
          <InputGroup>
            <Skeleton className="h-10 w-full max-w-md" />
          </InputGroup>
        </div>
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col text-center">
              <Skeleton className="h-40 w-full rounded-xl aspect-square" />
              <Skeleton className="h-4 w-24 mt-3 mx-auto" />
              <Skeleton className="h-4 w-16 mt-2 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

