import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      <div className="card p-0">
        <div className="flex gap-2 border-b border-gray-800 px-6">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-32" />
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50 border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">บริการ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">Order ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">ลิงค์</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-white whitespace-nowrap">จำนวน</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-white whitespace-nowrap">ราคา</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap">สถานะ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">วันที่สร้าง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-24 mx-auto rounded" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

