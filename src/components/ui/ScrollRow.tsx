import { useRef, useState, useEffect, type ReactNode } from 'react';
import type { CoverSize } from '../../hooks/useSettings';

interface Props {
  children: ReactNode;
  coverSize?: CoverSize;
}

const ITEM_WIDTH_CLASSES: Record<CoverSize, string> = {
  xs: 'flex-none w-[calc((100%-2rem)/4.5)] sm:w-[calc((100%-2rem)/5)] md:w-[calc((100%-3rem)/6)] lg:w-[calc((100%-4rem)/7)] xl:w-[calc((100%-5rem)/8)]',
  small: 'flex-none w-[calc((100%-2rem)/3.5)] sm:w-[calc((100%-2rem)/4)] md:w-[calc((100%-3rem)/5)] lg:w-[calc((100%-4rem)/6)] xl:w-[calc((100%-5rem)/7)]',
  medium: 'flex-none w-[calc((100%-2rem)/2.5)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]',
  large: 'flex-none w-[calc((100%-2rem)/1.8)] sm:w-[calc((100%-2rem)/2.2)] md:w-[calc((100%-3rem)/3)] lg:w-[calc((100%-4rem)/4)] xl:w-[calc((100%-5rem)/5)]',
};

export default function ScrollRow({ children, coverSize = 'medium' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateArrows();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = ref.current;
    if (!el) return;
    // Page by whole items so mandatory snap lands on an item boundary.
    const first = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const itemStep = first ? first.offsetWidth + gap : 0;
    const distance = itemStep > 0
      ? Math.max(1, Math.floor((el.clientWidth + gap) / itemStep) - 1) * itemStep
      : el.clientWidth;
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    el.scrollBy({ left: dir === 'left' ? -distance : distance, behavior });
  };

  const arrowClass = 'material-sheet press absolute top-[38%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-text-primary opacity-0 transition-opacity md:flex pointer-events-none [@media(hover:hover)]:group-hover/row:pointer-events-auto [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100';

  return (
    <div className="relative group/row">
      {canScrollLeft && (
        <button type="button" onClick={() => scroll('left')} className={`${arrowClass} left-1`} aria-label="Scroll left">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Bleeds to the screen edge on mobile; vertical padding keeps shadows and hover lift unclipped. */}
      <div
        ref={ref}
        className={`-mx-4 -my-2 flex gap-3 overflow-x-auto scroll-px-4 px-4 py-2 scrollbar-none sm:gap-4 md:mx-0 md:scroll-px-0 md:px-0 ${canScrollRight ? 'md:edge-fade-x' : ''}`}
        style={{ scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain' }}
      >
        {Array.isArray(children)
          ? (children as ReactNode[]).map((child, i) => (
              <div
                key={i}
                className={ITEM_WIDTH_CLASSES[coverSize]}
                style={{ scrollSnapAlign: 'start' }}
              >
                {child}
              </div>
            ))
          : children}
      </div>

      {canScrollRight && (
        <button type="button" onClick={() => scroll('right')} className={`${arrowClass} right-1`} aria-label="Scroll right">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
