"use client";

import * as Dialog from "@radix-ui/react-dialog";
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

const WIDTHS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/**
 * Apoiado no Radix Dialog: ele entrega focus trap, devolução do foco ao fechar,
 * Escape, trava de scroll e a associação do título via aria-labelledby — tudo o
 * que a versão manual não tinha (o foco escapava para a página atrás).
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = "md",
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 animate-in fade-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
            "rounded-xl bg-surface shadow-2xl overflow-hidden focus:outline-none",
            WIDTHS[width],
            className,
          )}
        >
          {title ? (
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Dialog.Title className="text-base font-bold text-text">{title}</Dialog.Title>
              <Dialog.Close
                className="rounded p-1 text-text-subtle hover:bg-bg hover:text-text"
                aria-label="Fechar"
              >
                <X size={16} />
              </Dialog.Close>
            </div>
          ) : (
            // O Radix exige um título acessível mesmo quando não há cabeçalho visível.
            <Dialog.Title className="sr-only">Janela</Dialog.Title>
          )}
          <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
          {footer && (
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
