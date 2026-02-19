import { useState, useEffect } from 'react';
import { daysUntil } from '../utils/date';

export function useCountdown(dateStr: string) {
  const [days, setDays] = useState(() => daysUntil(dateStr));

  useEffect(() => {
    setDays(daysUntil(dateStr));
    // Update at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      setDays(daysUntil(dateStr));
      // Then update every 24h
      const interval = setInterval(() => setDays(daysUntil(dateStr)), 86400000);
      return () => clearInterval(interval);
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, [dateStr]);

  return days;
}
