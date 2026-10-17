"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Título acessível; também é o cabeçalho visível quando `header` não é informado. */
  title?: string;
  /** Cabeçalho visual completo no lugar do título (o `title` segue como nome acessível). */
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** `top` empilha acima de outro modal aberto (confirmação sobre a Ficha). */
  layer?: "base" | "top";
  className?: string;
}

const WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-[680px]",
  "2xl": "max-w-[760px]",
};

const LAYERS = { base: "z-50", top: "z-[60]" };

/**
 * Apoiado no Radix Dialog: ele entrega focus trap, devolução do foco ao fechar,
 * Escape, trava de scroll e a associação do título via aria-labelledby — tudo o
 * que a versão manual não tinha (o foco escapava para a página atrás).
 *
 * O Radix também mantém uma pilha global de camadas: com dois diálogos abertos,
 * Escape e o clique fora atingem só o de cima. É isso que deixa a confirmação
 * fechar sem levar junto a Ficha que está por baixo.
 *
 * Até 768 px o painel vira folha inferior, ancorado na base da tela.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  header,
  children,
  footer,
  width = "md",
  layer = "base",
  className,
}: ModalProps) {
  const close = (
    <Dialog.Close
      className="shrink-0 rounded p-1 text-text-subtle hover:bg-bg hover:text-text"
      aria-label="Fechar"
    >
      <X size={16} />
    </Dialog.Close>
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn("fixed inset-0 bg-black/35 animate-in fade-in", LAYERS[layer])}
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
            "max-md:bottom-2.5 max-md:top-auto max-md:w-[calc(100%-1.25rem)] max-md:translate-y-0",
            "rounded-xl bg-surface shadow-2xl overflow-hidden focus:outline-none",
            LAYERS[layer],
            WIDTHS[width],
            className,
          )}
        >
          {header ? (
            <div className="flex items-start gap-4 border-b border-border px-5 py-4">
              <Dialog.Title className="sr-only">{title ?? "Janela"}</Dialog.Title>
              <div className="min-w-0 flex-1">{header}</div>
              {close}
            </div>
          ) : title ? (
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Dialog.Title className="text-base font-bold text-text">{title}</Dialog.Title>
              {close}
            </div>
          ) : (
            // O Radix exige um título acessível mesmo quando não há cabeçalho visível.
            <Dialog.Title className="sr-only">Janela</Dialog.Title>
          )}
          <div className="max-h-[70vh] overflow-y-auto px-5 py-5 max-md:max-h-[calc(100vh-11rem)]">
            {children}
          </div>
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
