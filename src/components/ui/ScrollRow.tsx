import { useRef, useState, useEffect, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function ScrollRow({ children }: Props) {
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
    el.scrollBy({ left: dir === 'left' ? -el.clientWidth : el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="relative group/row">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-10 bg-gradient-to-r from-surface to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Scroll left"
        >
          <span className="bg-surface-raised border border-border-subtle rounded-full w-8 h-8 flex items-center justify-center text-text-primary hover:border-accent/40 transition shadow-lg">
            ‹
          </span>
        </button>
      )}

      {/* Scroll container */}
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-1"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
      >
        {Array.isArray(children)
          ? (children as ReactNode[]).map((child, i) => (
              <div
                key={i}
                className="flex-none w-[calc((100%-2rem)/2.5)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]"
                style={{ scrollSnapAlign: 'start' }}
              >
                {child}
              </div>
            ))
          : children}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-10 bg-gradient-to-l from-surface to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <span className="bg-surface-raised border border-border-subtle rounded-full w-8 h-8 flex items-center justify-center text-text-primary hover:border-accent/40 transition shadow-lg">
            ›
          </span>
        </button>
      )}
    </div>
  );
}
