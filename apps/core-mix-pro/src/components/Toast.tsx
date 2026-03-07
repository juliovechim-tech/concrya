"use client";

import { createContext, useContext, useState, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  exiting: boolean;
};

type ToastCtx = { toast: (msg: string, type?: ToastType, ms?: number) => void };

// ─────────────────────────────────────────────────────────────────────────────
// STYLE MAP
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, { bar: string; icon: string; symbol: string }> = {
  success: { bar: "bg-emerald-500", icon: "text-emerald-400", symbol: "✓" },
  error:   { bar: "bg-rose-600",    icon: "text-rose-400",    symbol: "✕" },
  info:    { bar: "bg-amber-600",   icon: "text-amber-400",   symbol: "◆" },
  warning: { bar: "bg-sky-500",     icon: "text-sky-400",     symbol: "!" },
};

const DEFAULT_MS: Record<ToastType, number> = {
  success: 3000,
  error: 6000,
  info: 4000,
  warning: 4000,
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(Ctx);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info", ms?: number) => {
      const id = `${Date.now()}-${Math.random()}`;
      setItems((prev) => [...prev, { id, message, type, exiting: false }]);
      setTimeout(() => dismiss(id), ms ?? DEFAULT_MS[type]);
    },
    [dismiss],
  );

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {/* Toast container — fixed top-right */}
      <div className="fixed right-4 top-4 z-[9999] flex flex-col gap-2 pointer-events-none print:hidden">
        {items.map((item) => {
          const s = TYPE_STYLES[item.type];
          return (
            <div
              key={item.id}
              className={[
                "pointer-events-auto relative flex items-start gap-2.5",
                "rounded-sm border border-slate-700 bg-slate-900",
                "px-3 py-2.5 shadow-xl shadow-black/60 max-w-[320px]",
                "transition-all duration-300",
                item.exiting ? "translate-x-8 opacity-0" : "translate-x-0 opacity-100",
              ].join(" ")}
            >
              {/* Left accent bar */}
              <div className={`absolute left-0 top-0 h-full w-0.5 rounded-l-sm ${s.bar}`} />
              {/* Icon */}
              <span className={`font-mono text-[11px] font-bold ${s.icon} mt-px`}>{s.symbol}</span>
              {/* Message */}
              <p className="flex-1 font-mono text-[10px] text-slate-200 leading-relaxed">{item.message}</p>
              {/* Dismiss */}
              <button
                onClick={() => dismiss(item.id)}
                className="font-mono text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
