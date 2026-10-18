import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { animate, m, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { fade, project, rubberband, spring } from '../../design/motion';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface Props {
  /** Called after the exit animation finished; unmount the sheet then. */
  onClose: () => void;
  labelledBy: string;
  /** Element the sheet grows out of on wide screens (spatial origin). */
  originRef?: RefObject<HTMLElement | null>;
  /** Tailwind max-width class for the desktop dialog. */
  desktopWidth?: string;
  /** Mobile: full-height sheet instead of content-sized. */
  tall?: boolean;
  children: (dismiss: () => void) => ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal surface. Under 768px it is a bottom sheet that tracks the finger 1:1, rubber-bands
 * past the top, projects a flick to decide close vs. return, and hands release velocity to
 * the spring. On wider screens it is a dialog that scales out of its trigger.
 */
export default function Sheet({ onClose, labelledBy, originRef, desktopWidth = 'max-w-lg', tall = false, children }: Props) {
  const isMobile = useMediaQuery('(max-width: 767.98px)');
  const reduceMotion = useReducedMotion() ?? false;
  const panelRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(600);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [origin, setOrigin] = useState('50% 50%');

  const y = useMotionValue(0);
  const progress = useMotionValue(0);
  const scrimFromY = useTransform(y, (value) => Math.max(0, Math.min(1, 1 - value / heightRef.current)));
  const scale = useTransform(progress, [0, 1], [0.96, 1]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const slide = isMobile && !reduceMotion;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    heightRef.current = panel?.offsetHeight ?? 600;
    if (!isMobile && panel && originRef?.current) {
      const p = panel.getBoundingClientRect();
      const o = originRef.current.getBoundingClientRect();
      setOrigin(`${o.left + o.width / 2 - p.left}px ${o.top + o.height / 2 - p.top}px`);
    }
    if (slide) {
      y.set(heightRef.current + 24);
      animate(y, 0, spring.move);
    }
    animate(progress, 1, reduceMotion ? fade : spring.default);
    // Mount-only: entering animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback((velocity = 0) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const done = () => onCloseRef.current();
    if (slide) {
      animate(progress, 0, fade);
      animate(y, heightRef.current + 24, { ...(Math.abs(velocity) > 300 ? spring.sheet : spring.default), velocity }).then(done);
    } else {
      animate(progress, 0, reduceMotion ? fade : spring.snappy).then(done);
    }
  }, [slide, reduceMotion, progress, y]);

  // Focus management, Escape, focus trap, scroll lock.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        dismiss();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.documentElement.style.overflow = prevOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [dismiss]);

  // ── Drag to dismiss (mobile) ──
  const dragRef = useRef<{ startY: number; startPos: number; samples: { t: number; y: number }[] } | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!slide || closingRef.current) return;
    const target = event.target as HTMLElement;
    if (!target.closest('[data-sheet-handle]') || target.closest('button, a, input, textarea, select')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    y.stop(); // grab mid-flight: continue from the presentation value
    dragRef.current = { startY: event.clientY, startPos: y.get(), samples: [{ t: performance.now(), y: y.get() }] };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    let next = drag.startPos + (event.clientY - drag.startY);
    if (next < 0) next = -rubberband(-next, heightRef.current);
    y.set(next);
    const now = performance.now();
    drag.samples.push({ t: now, y: next });
    while (drag.samples.length > 2 && now - drag.samples[0].t > 100) drag.samples.shift();
  };

  const handlePointerEnd = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const first = drag.samples[0];
    const last = drag.samples[drag.samples.length - 1];
    const velocity = last.t > first.t ? ((last.y - first.y) / (last.t - first.t)) * 1000 : 0;
    const projected = y.get() + project(velocity);
    if (projected > heightRef.current * 0.5) {
      dismiss(velocity);
    } else {
      animate(y, 0, { ...(Math.abs(velocity) > 300 ? spring.sheet : spring.default), velocity });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <m.div
        className="absolute inset-0 bg-black/45"
        style={{ opacity: slide ? scrimFromY : progress }}
        onClick={() => dismiss()}
        aria-hidden="true"
      />
      {isMobile ? (
        <m.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={`material-sheet shadow-sheet absolute inset-x-0 bottom-0 flex flex-col rounded-t-[22px] pb-[var(--safe-area-bottom)] ${tall ? 'h-[92dvh]' : 'max-h-[92dvh]'}`}
          style={{ y, opacity: slide ? 1 : progress }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div data-sheet-handle className="shrink-0 cursor-grab touch-none pb-1 pt-2 active:cursor-grabbing">
            <div className="mx-auto h-[5px] w-9 rounded-full bg-fill-strong" />
          </div>
          {children(dismiss)}
          {/* Fills the gap when the sheet overshoots upward */}
          <div className="material-sheet absolute inset-x-0 top-full h-24" aria-hidden="true" />
        </m.div>
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className={`material-sheet shadow-sheet pointer-events-auto flex max-h-[85vh] w-full flex-col overflow-hidden rounded-[20px] ${desktopWidth}`}
            style={{ opacity: progress, scale: reduceMotion ? 1 : scale, transformOrigin: origin }}
          >
            {children(dismiss)}
          </m.div>
        </div>
      )}
    </div>,
    document.body,
  );
}
