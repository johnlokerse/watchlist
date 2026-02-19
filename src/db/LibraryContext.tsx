import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface LibraryContextValue {
  version: number;
  invalidate: () => void;
}

const LibraryContext = createContext<LibraryContextValue>({ version: 0, invalidate: () => {} });

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const invalidate = useCallback(() => setVersion((v) => v + 1), []);
  return <LibraryContext.Provider value={{ version, invalidate }}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  return useContext(LibraryContext);
}
