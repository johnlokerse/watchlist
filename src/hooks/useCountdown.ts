import { useToday } from './useToday';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Whole days from today (local) until dateStr (YYYY-MM-DD). Negative when in the past. */
export function useCountdown(dateStr: string): number {
  const today = useToday();
  const target = new Date(dateStr + 'T00:00:00').getTime();
  const start = new Date(today + 'T00:00:00').getTime();
  // Math.round absorbs the 23h/25h local days produced by DST changes.
  return Math.round((target - start) / MS_PER_DAY);
}
