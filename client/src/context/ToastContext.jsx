import { createContext, useContext, useState } from "react";
import { X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function showToast(message, { actionLabel, onAction, duration = 4500 } = {}) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, actionLabel, onAction }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }
  function dismiss(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 w-[calc(100%-1.5rem)] max-w-md"
        role="status"
        aria-live="polite"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-4 bg-ink text-cream rounded-xl px-4 py-3 shadow-card border-2 border-ink font-body"
          >
            <span className="text-sm font-medium break-words min-w-0">{t.message}</span>
            <div className="flex items-center gap-3 flex-shrink-0">
              {t.actionLabel && (
                <button
                  onClick={() => { t.onAction?.(); dismiss(t.id); }}
                  className="text-butter hover:text-butter-dark font-bold text-sm"
                >
                  {t.actionLabel}
                </button>
              )}
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss message" className="text-cream/60 hover:text-cream">
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
