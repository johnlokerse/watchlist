/** Mirrors Card's structure (poster + caption) so content swaps in without layout shift. */
export default function SkeletonCard() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[2/3] rounded-xl" />
      <div className="space-y-1.5 px-0.5 pt-2">
        <div className="skeleton h-3.5 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}
