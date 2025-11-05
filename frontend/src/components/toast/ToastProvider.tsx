import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  push: (toast: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

function generateToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `toast-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "border-slate-700/80 bg-slate-950/90 text-slate-100",
  success: "border-emerald-400/70 bg-emerald-950/90 text-emerald-100",
  error: "border-rose-400/70 bg-rose-950/90 text-rose-100",
  info: "border-sky-400/70 bg-sky-950/90 text-sky-100",
};

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearTimer],
  );

  const dismissAll = useCallback(() => {
    timers.current.forEach((timer) => {
      clearTimeout(timer);
    });
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      timers.current.clear();
    };
  }, []);

  const push = useCallback(
    (toast: ToastOptions) => {
      const id = generateToastId();
      const record: ToastRecord = {
        id,
        title: toast.title,
        description: toast.description,
        variant: toast.variant ?? "default",
        duration: toast.duration,
      };

      setToasts((current) => [...current, record]);

      const duration = toast.duration ?? DEFAULT_DURATION;
      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({ push, dismiss, dismissAll }),
    [push, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end"
      >
        {toasts.map((toast) => {
          const variant = toast.variant ?? "default";
          const role = variant === "error" ? "alert" : "status";
          return (
            <div
              key={toast.id}
              role={role}
              className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg backdrop-blur"
            >
              <div className={`relative flex items-start gap-3 px-4 py-3 ${VARIANT_STYLES[variant]}`}>
                <div className="flex-1 space-y-1">
                  {toast.title ? <p className="text-sm font-semibold leading-tight">{toast.title}</p> : null}
                  {toast.description ? (
                    <p className="text-xs leading-snug opacity-90">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-xs font-medium text-current opacity-70 transition hover:border-white/30 hover:opacity-100"
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
