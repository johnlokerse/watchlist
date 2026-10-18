import { useCallback, useEffect, useRef, useState } from 'react';

/** Briefly shows a completion state ("Saved") after an action succeeds. */
export function useSavedFlash(ms = 1600) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const flash = useCallback(() => {
    setVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), ms);
  }, [ms]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return [visible, flash] as const;
}
