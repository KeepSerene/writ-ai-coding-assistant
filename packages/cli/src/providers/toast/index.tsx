import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ToastOptions } from "./types";
import { DEFAULT_TOAST_DURATION } from "../../lib/constants";
import Toast from "./toast";

export interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: Readonly<ToastProviderProps>) {
  const [toastOptions, setToastOptions] = useState<ToastOptions | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      clearCurrentTimeout();

      const duration = options.duration ?? DEFAULT_TOAST_DURATION;

      setToastOptions({
        variant: options.variant ?? "info",
        ...options,
        duration,
      });

      timeoutRef.current = setTimeout(() => {
        setToastOptions(null);
      }, duration).unref();
    },
    [clearCurrentTimeout],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <Toast options={toastOptions} />
    </ToastContext.Provider>
  );
}
