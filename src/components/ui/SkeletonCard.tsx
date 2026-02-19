export default function SkeletonCard() {
  return (
    <div className="bg-surface-raised rounded-xl overflow-hidden border border-border-subtle animate-pulse">
      <div className="aspect-[2/3] bg-surface-overlay" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-surface-overlay rounded w-3/4" />
        <div className="h-3 bg-surface-overlay rounded w-1/2" />
      </div>
    </div>
  );
}
