import { useState, useEffect, useCallback, type SetStateAction } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: SetStateAction<T>) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch { /* ignore quota errors */ }
  }, [key, state]);

  const setValue = useCallback((value: SetStateAction<T>) => setState(value), []);

  return [state, setValue];
}
