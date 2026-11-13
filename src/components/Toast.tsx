import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}
interface ToastApi {
  show: (message: string, opts?: { action?: ToastItem["action"]; ms?: number }) => void;
}

const Ctx = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nextId = useRef(1);

  const show = useCallback<ToastApi["show"]>((message, opts) => {
    clearTimeout(timer.current);
    const item = { id: nextId.current++, message, action: opts?.action };
    setToast(item);
    timer.current = setTimeout(
      () => setToast((t) => (t?.id === item.id ? null : t)),
      opts?.ms ?? 4000,
    );
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 9.5rem)" }}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <div className="pointer-events-auto flex items-center gap-4 rounded-full bg-ink px-5 py-3 font-sans text-sm text-paper shadow-lg dark:bg-paper dark:text-ink">
            <span>{toast.message}</span>
            {toast.action && (
              <button
                className="min-h-[32px] font-semibold text-brass-light dark:text-brass"
                onClick={() => {
                  toast.action!.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
