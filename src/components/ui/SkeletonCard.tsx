export default function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-border-subtle bg-surface-raised">
      <div className="aspect-[2/3] bg-surface-overlay" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-surface-overlay rounded w-3/4" />
        <div className="h-3 bg-surface-overlay rounded w-1/2" />
      </div>
    </div>
  );
}
