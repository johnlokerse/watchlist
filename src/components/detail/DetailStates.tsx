import { useNavigate } from 'react-router-dom';

/** Placeholder with the shape of the hero, so the page doesn't jump when data arrives. */
export function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="-mx-4 -mt-[calc(1rem+var(--safe-area-top))] md:mx-0 md:mt-0">
        <div className="skeleton h-[clamp(240px,42vh,400px)] md:h-[340px] md:rounded-[22px]" />
      </div>
      <div className="-mt-28 flex items-end gap-4 md:-mt-36 md:gap-6 md:px-8">
        <div className="skeleton aspect-[2/3] w-[6.5rem] rounded-xl md:w-40" />
        <div className="flex-1 space-y-2 pb-1">
          <div className="skeleton h-7 w-2/3 rounded-md" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
      </div>
      <div className="mt-6 flex gap-2 md:px-8">
        <div className="skeleton h-11 w-40 rounded-xl" />
      </div>
    </div>
  );
}

export function DetailNotFound({ kind }: { kind: 'Movie' | 'Series' }) {
  const navigate = useNavigate();
  return (
    <div className="py-24 text-center" role="alert">
      <p className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-fill text-text-muted">
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5M8.5 11h5" />
        </svg>
      </p>
      <p className="t-headline">{kind} not found.</p>
      <p className="t-callout mt-1 text-text-secondary">It may have been removed from TMDB.</p>
      <button type="button" onClick={() => navigate(-1)} className="press mt-4 min-h-9 rounded-full bg-fill px-5 text-[0.875rem] font-semibold text-accent hover:bg-fill-strong">
        Go back
      </button>
    </div>
  );
}
