"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastQueue: Toast[] = [];

function notify() {
  toastListeners.forEach((l) => l([...toastQueue]));
}

export const toast = {
  show(toast: Omit<Toast, "id">): void {
    const id = Math.random().toString(36).slice(2);
    const t = { ...toast, id };
    toastQueue = [...toastQueue, t];
    notify();
    setTimeout(() => {
      toastQueue = toastQueue.filter((x) => x.id !== id);
      notify();
    }, toast.duration ?? 5000);
  },
  success(message: string, opts?: Partial<Omit<Toast, "id" | "type" | "message">>) {
    this.show({ type: "success", message, ...opts });
  },
  error(message: string, opts?: Partial<Omit<Toast, "id" | "type" | "message">>) {
    this.show({ type: "error", message, ...opts });
  },
  info(message: string, opts?: Partial<Omit<Toast, "id" | "type" | "message">>) {
    this.show({ type: "info", message, ...opts });
  },
  warning(message: string, opts?: Partial<Omit<Toast, "id" | "type" | "message">>) {
    this.show({ type: "warning", message, ...opts });
  },
};

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([...toastQueue]);

  const subscribe = useCallback(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
    };
  }, []);

  return { toasts, subscribe };
}
