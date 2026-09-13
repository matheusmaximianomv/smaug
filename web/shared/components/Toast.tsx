"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";
import { useToastState } from "../hooks/useToast";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLORS = {
  success: "border-green bg-green-light text-green",
  error: "border-red bg-red-light text-red",
  info: "border-blue-400 bg-blue-50 text-blue-700",
  warning: "border-yellow-400 bg-yellow-50 text-yellow-700",
};

export function ToastContainer() {
  const { toasts, subscribe } = useToastState();

  useEffect(() => {
    return subscribe();
  }, [subscribe]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg w-80 animate-in slide-in-from-bottom-2",
              COLORS[t.type],
            )}
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            {t.action && (
              <button
                onClick={t.action.onClick}
                className="shrink-0 text-xs font-semibold underline"
              >
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
