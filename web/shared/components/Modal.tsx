"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg";
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = "md",
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthMap = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "relative w-full rounded-xl bg-surface shadow-2xl overflow-hidden",
          widthMap[width],
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-base font-bold text-text">{title}</h3>
            <button
              onClick={onClose}
              className="rounded p-1 text-text-subtle hover:bg-bg hover:text-text"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
