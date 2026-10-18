import { createContext, useContext } from 'react';

export interface ToastOptions {
  message: string;
  /** Optional action, typically "Undo". */
  action?: { label: string; onClick: () => void };
  /** Called when the toast leaves without its action being used (used to commit deferred work). */
  onExpire?: () => void;
  tone?: 'neutral' | 'success' | 'error';
  duration?: number;
}

export interface ToastApi {
  show: (options: ToastOptions) => void;
  dismiss: () => void;
}

export const ToastContext = createContext<ToastApi>({
  show: () => {},
  dismiss: () => {},
});

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
