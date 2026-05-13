import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-64 mb-6" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border p-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
