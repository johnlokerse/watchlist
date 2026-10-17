import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { toLocalISODate } from '../utils/date';

const TodayContext = createContext<string | null>(null);

/** Milliseconds from `now` until 00:00:01 of the next local day. */
function msUntilNextLocalDay(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next.getTime() - now.getTime();
}

/**
 * Holds the local calendar date (YYYY-MM-DD) and updates it once per day at local midnight.
 * A single timer is shared by every consumer; it is re-armed when the page becomes visible
 * again, since timers can fire late (or not at all) while the device sleeps or the tab is hidden.
 */
export function TodayProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(() => toLocalISODate());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setToday(toLocalISODate());
        schedule();
      }, msUntilNextLocalDay(new Date()));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setToday(toLocalISODate());
        schedule();
      }
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return <TodayContext.Provider value={today}>{children}</TodayContext.Provider>;
}

/** Current local date as YYYY-MM-DD. Re-renders consumers when the day changes. */
// eslint-disable-next-line react-refresh/only-export-components -- provider and hook intentionally share this module
export function useToday(): string {
  const today = useContext(TodayContext);
  return today ?? toLocalISODate();
}
