import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ToastContext, type ToastOptions } from '../../hooks/useToast';
import { spring } from '../../design/motion';

interface ActiveToast extends ToastOptions {
  id: number;
}

/**
 * One toast at a time, Apple-style: a floating material capsule above the tab bar.
 * A toast with onExpire implements "act now, commit later": the action (Undo) cancels,
 * anything else (timeout, replacement, unmount) commits.
 */
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const toastRef = useRef<ActiveToast | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const idRef = useRef(0);

  const settle = useCallback((commit: boolean) => {
    const current = toastRef.current;
    window.clearTimeout(timerRef.current);
    toastRef.current = null;
    setToast(null);
    if (commit) current?.onExpire?.();
  }, []);

  const show = useCallback((options: ToastOptions) => {
    // A pending toast that gets replaced commits its deferred work.
    if (toastRef.current) settle(true);
    const next = { ...options, id: ++idRef.current };
    toastRef.current = next;
    setToast(next);
    timerRef.current = window.setTimeout(() => settle(true), options.duration ?? 5000);
  }, [settle]);

  const dismiss = useCallback(() => settle(true), [settle]);

  useEffect(() => () => {
    window.clearTimeout(timerRef.current);
    toastRef.current?.onExpire?.();
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4 bottom-[calc(5.75rem+var(--safe-area-bottom))] md:bottom-6"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toast && (
            <m.div
              key={toast.id}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={spring.default}
              className="material-sheet pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-[0.875rem] shadow-sheet"
            >
              {toast.tone === 'success' && (
                <svg className="h-4 w-4 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              )}
              {toast.tone === 'error' && (
                <svg className="h-4 w-4 shrink-0 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
              )}
              <span className="min-w-0 flex-1 font-medium text-text-primary">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className="press hit-44 -my-1 shrink-0 rounded-lg px-2 py-1 font-semibold text-accent"
                  onClick={() => {
                    toast.action!.onClick();
                    settle(false);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
