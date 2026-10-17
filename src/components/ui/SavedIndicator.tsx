import { AnimatePresence, m } from 'motion/react';
import { spring } from '../../design/motion';

/** Inline completion feedback next to the control that changed. */
export default function SavedIndicator({ show, label = 'Saved' }: { show: boolean; label?: string }) {
  return (
    <span className="inline-flex min-w-[3.5rem]" role="status" aria-live="polite">
      <AnimatePresence>
        {show && (
          <m.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.snappy}
            className="t-caption inline-flex items-center gap-1 font-semibold text-success"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 5 5 9-10" />
            </svg>
            {label}
          </m.span>
        )}
      </AnimatePresence>
    </span>
  );
}
