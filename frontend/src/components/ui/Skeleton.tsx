interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={["animate-pulse bg-(--color-bg-muted) rounded", className].join(" ")}
    />
  )
}

export function PostRowSkeleton() {
  return (
    <div className="px-6 py-4 border-b border-(--color-border-subtle) flex items-center gap-4 animate-pulse">
      <div className="w-4 h-4 rounded bg-(--color-bg-muted) shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-(--color-bg-muted) rounded w-3/4" />
        <div className="h-3 bg-(--color-bg-muted) rounded w-1/3" />
      </div>
      <div className="h-5 w-20 bg-(--color-bg-muted) rounded-full shrink-0" />
      <div className="h-7 w-24 bg-(--color-bg-muted) rounded-[10px] shrink-0" />
    </div>
  )
}

export function PostsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PostRowSkeleton key={i} />
      ))}
    </>
  )
}
